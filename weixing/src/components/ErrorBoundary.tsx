import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * 顶层错误边界：捕获渲染期错误（包括 STL/Leaflet 等资源加载失败），
 * 显示一个最小化的"加载失败"卡片，避免整页黑屏。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
  }

  reset = () => {
    this.setState({ error: null })
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    const msg = this.state.error.message || String(this.state.error)
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-[#0a0a0c] p-6 text-zinc-200">
        <div className="max-w-md rounded-3xl border border-zinc-800/80 bg-[#0d0d10] p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Console Error
          </p>
          <h2 className="mt-2 text-base font-semibold text-white">控制台加载失败</h2>
          <p className="mt-2 text-[11px] uppercase tracking-wider text-zinc-500">
            某个资源或组件渲染异常
          </p>
          <pre className="mt-3 max-h-40 overflow-auto rounded-2xl border border-zinc-800/60 bg-black/40 p-3 text-[11px] leading-relaxed text-zinc-400">
            {msg}
          </pre>
          <button
            type="button"
            onClick={this.reset}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-700/80 px-4 py-2 text-[12px] text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            ↻ 重试
          </button>
        </div>
      </div>
    )
  }
}
