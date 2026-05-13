#!/usr/bin/env bash
# orb-core 一键部署 / 启动 / 停止脚本
#   mag-orb  → 7788  (vite preview)
#   weixing  → 7789  (vite preview)
#   orbcore  → 7790  (next start)

set -euo pipefail

# --- 路径 ---------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_DIR="$SCRIPT_DIR/.run"
mkdir -p "$RUN_DIR"

# --- 项目定义 -----------------------------------------------------------
# 名称|目录|端口|启动命令（在项目目录内执行）
# 注: orbcore 用 next dev 而不是 next start，因为 Next 16.2.2 + Turbopack +
#     @tailwindcss/postcss v4 在 `next build` 阶段存在 PostCSS worker IPC
#     死锁，主进程与 worker 互等永不推进。dev 模式不走 build 路径，可绕开。
PROJECTS=(
  "mag-orb|mag-orb|7788|npx --yes serve dist -l tcp://0.0.0.0:7788 --no-clipboard --no-port-switching"
  "weixing|weixing|7789|npx --yes serve dist -l tcp://0.0.0.0:7789 --no-clipboard --no-port-switching"
  "orbcore|.|7790|npx next dev -p 7790 -H 0.0.0.0"
)

# --- 颜色 ---------------------------------------------------------------
if [[ -t 1 ]]; then
  C_RED=$'\033[31m'; C_GRN=$'\033[32m'; C_YLW=$'\033[33m'
  C_BLU=$'\033[34m'; C_DIM=$'\033[2m';  C_RST=$'\033[0m'
else
  C_RED=""; C_GRN=""; C_YLW=""; C_BLU=""; C_DIM=""; C_RST=""
fi

log()  { printf "%s[orb]%s %s\n" "$C_BLU" "$C_RST" "$*"; }
ok()   { printf "%s[ok ]%s %s\n" "$C_GRN" "$C_RST" "$*"; }
warn() { printf "%s[!! ]%s %s\n" "$C_YLW" "$C_RST" "$*"; }
err()  { printf "%s[err]%s %s\n" "$C_RED" "$C_RST" "$*" >&2; }

# --- 工具 ---------------------------------------------------------------
pid_file() { echo "$RUN_DIR/$1.pid"; }
log_file() { echo "$RUN_DIR/$1.log"; }

is_running() {
  local pid_f
  pid_f="$(pid_file "$1")"
  [[ -f "$pid_f" ]] || return 1
  local pid
  pid="$(cat "$pid_f" 2>/dev/null || true)"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

port_pid() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -n1
}

for_each() {
  local cb="$1"
  for entry in "${PROJECTS[@]}"; do
    IFS='|' read -r name dir port cmd <<<"$entry"
    "$cb" "$name" "$dir" "$port" "$cmd"
  done
}

# --- 子命令实现 ---------------------------------------------------------
do_deploy_one() {
  local name="$1" dir="$2" _port="$3" _cmd="$4"
  log "deploy ${name} (${dir})"
  pushd "$ROOT_DIR/$dir" >/dev/null
  if [[ ! -d node_modules ]]; then
    npm install
  else
    log "  node_modules 已存在，跳过 npm install（如需重装请手动删除）"
  fi
  # orbcore 用 dev 模式启动，无需预构建，跳过 build 步骤避免 Turbopack 死锁
  if [[ "$name" == "orbcore" ]]; then
    log "  orbcore 使用 next dev 模式，跳过 build"
  else
    npm run build
  fi
  popd >/dev/null
  ok "deploy ${name} 完成"
}

do_start_one() {
  local name="$1" dir="$2" port="$3" cmd="$4"
  local pid_f log_f
  pid_f="$(pid_file "$name")"
  log_f="$(log_file "$name")"

  if is_running "$name"; then
    warn "${name} 已在运行 (pid=$(cat "$pid_f"))，跳过"
    return 0
  fi

  local occupant
  occupant="$(port_pid "$port" || true)"
  if [[ -n "$occupant" ]]; then
    err "端口 ${port} 已被 pid=${occupant} 占用，无法启动 ${name}"
    return 1
  fi

  log "start ${name} → :${port}"
  (
    cd "$ROOT_DIR/$dir"
    # nohup + setsid 让子进程脱离当前 shell，关闭终端也不挂掉
    nohup bash -c "exec $cmd" >"$log_f" 2>&1 &
    echo $! >"$pid_f"
  )
  sleep 1
  if is_running "$name"; then
    ok "${name} 启动成功 (pid=$(cat "$pid_f"))  日志: $log_f"
    # 预热：等端口可访问后做一次 curl，让 next dev / vite preview 提前完成首次编译
    # 这样真实用户首次访问时不会看到长时间黑屏
    (
      for _ in $(seq 1 30); do
        if curl -sf --max-time 2 -o /dev/null "http://127.0.0.1:${port}/"; then
          # 关键：第一次 curl 通常会触发编译；再 curl 一次保证编译产物已 ready
          curl -sf --max-time 60 -o /dev/null "http://127.0.0.1:${port}/" || true
          break
        fi
        sleep 1
      done
    ) >/dev/null 2>&1 &
  else
    err "${name} 启动失败，查看日志: $log_f"
    rm -f "$pid_f"
    return 1
  fi
}

do_stop_one() {
  local name="$1" _dir="$2" port="$3" _cmd="$4"
  local pid_f
  pid_f="$(pid_file "$name")"
  local pid=""
  [[ -f "$pid_f" ]] && pid="$(cat "$pid_f" 2>/dev/null || true)"

  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    log "stop ${name} (pid=${pid})"
    # 杀掉整个进程组（npm/next/vite 会派生子进程）
    kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    for _ in 1 2 3 4 5; do
      kill -0 "$pid" 2>/dev/null || break
      sleep 1
    done
    if kill -0 "$pid" 2>/dev/null; then
      warn "${name} 未响应 SIGTERM，发送 SIGKILL"
      kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_f"
    ok "${name} 已停止"
  else
    rm -f "$pid_f"
    log "${name} 未在 PID 记录中运行"
  fi

  # 兜底：仍占用端口的进程一并清理
  local occupant
  occupant="$(port_pid "$port" || true)"
  if [[ -n "$occupant" ]]; then
    warn "端口 ${port} 仍被 pid=${occupant} 占用，强制清理"
    kill -KILL "$occupant" 2>/dev/null || true
  fi
}

do_status_one() {
  local name="$1" _dir="$2" port="$3" _cmd="$4"
  local pid_f pid="" state occupant
  pid_f="$(pid_file "$name")"
  [[ -f "$pid_f" ]] && pid="$(cat "$pid_f" 2>/dev/null || true)"
  occupant="$(port_pid "$port" || true)"

  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    state="${C_GRN}running${C_RST} pid=${pid}"
  elif [[ -n "$occupant" ]]; then
    state="${C_YLW}other  ${C_RST} pid=${occupant} (非脚本启动)"
  else
    state="${C_DIM}stopped${C_RST}"
  fi
  printf "  %-10s :%-5s  %b\n" "$name" "$port" "$state"
}

# --- 入口 ---------------------------------------------------------------
usage() {
  cat <<EOF
用法: $(basename "$0") <command>

  deploy   安装依赖并构建三个项目
  start    启动三个项目（后台运行）
  stop     停止三个项目
  restart  stop + start
  status   查看运行状态
  logs <name>  实时查看某个项目日志 (mag-orb / weixing / orbcore)

端口分配:
  mag-orb  → http://localhost:7788
  weixing  → http://localhost:7789
  orbcore  → http://localhost:7790
EOF
}

cmd="${1:-}"
case "$cmd" in
  deploy)  for_each do_deploy_one ;;
  start)   for_each do_start_one  ;;
  stop)    for_each do_stop_one   ;;
  restart) for_each do_stop_one; for_each do_start_one ;;
  status)
    echo "项目状态:"
    for_each do_status_one
    ;;
  logs)
    target="${2:-}"
    if [[ -z "$target" ]]; then err "用法: $0 logs <mag-orb|weixing|orbcore>"; exit 1; fi
    log_f="$(log_file "$target")"
    [[ -f "$log_f" ]] || { err "日志不存在: $log_f"; exit 1; }
    tail -f "$log_f"
    ;;
  ""|-h|--help|help) usage ;;
  *) err "未知命令: $cmd"; usage; exit 1 ;;
esac
