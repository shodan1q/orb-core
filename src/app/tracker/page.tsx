'use client';

/* ==========================================================================
 * /tracker — 卫星追踪与轨道可视化 (2D equirectangular 地图)
 *
 *   - 等经纬世界地图 (earth-day.jpg)
 *   - 实时 TLE 传播 (satellite.js), 卫星图标贴在经纬网格对应像素
 *   - 昼夜地形 (canvas 覆盖层, 按亚太阳点逐像素计算 cos 角)
 *   - 选中卫星: 蓝色地面轨迹折线 (处理 180° 经线穿越) + 90min 预测 pin
 *              + 覆盖圈 footprint
 *   - 左侧面板: 搜索 / 分组筛选 / 详情 (经纬高速度 / 轨道分类 / TLE)
 *   - 追踪开关: 自动平移地图跟随所选卫星
 *   - 鼠标拖动平移, 滚轮缩放 (1x-4x)
 * ======================================================================== */

import { useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  MouseEvent as ReactMouseEvent,
  WheelEvent as ReactWheelEvent,
} from 'react';
import { motion } from 'framer-motion';
import * as satellite from 'satellite.js';
import { TLE_CATALOG, GROUP_META, TleEntry } from '@/lib/tle-data';

/* =========================================================================
 *  Utility: sub-solar point (approximate)
 * ========================================================================= */
function subSolarPoint(date: Date) {
  // Day of year
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - start) / 86400000;
  // Declination (degrees)
  const decl = 23.44 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
  // UT hours
  const ut =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  // Sub-solar longitude: at UT=12 sun is over 0°
  let lng = 180 - ut * 15;
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  return { lat: decl, lng };
}

/* =========================================================================
 *  Propagation cache (updates each tick)
 * ========================================================================= */
interface LiveSat {
  entry: TleEntry;
  satrec: satellite.SatRec;
  lat: number;
  lng: number;
  alt: number;
  velocity: number;
  valid: boolean;
}

function makeLive(entry: TleEntry): LiveSat {
  return {
    entry,
    satrec: satellite.twoline2satrec(entry.line1, entry.line2),
    lat: 0,
    lng: 0,
    alt: 0,
    velocity: 0,
    valid: false,
  };
}

function propagate(s: LiveSat, now: Date) {
  try {
    const gmst = satellite.gstime(now);
    const pv = satellite.propagate(s.satrec, now);
    if (
      pv.position &&
      typeof pv.position !== 'boolean' &&
      pv.velocity &&
      typeof pv.velocity !== 'boolean'
    ) {
      const gd = satellite.eciToGeodetic(pv.position, gmst);
      s.lat = satellite.degreesLat(gd.latitude);
      s.lng = satellite.degreesLong(gd.longitude);
      s.alt = gd.height;
      s.velocity = Math.sqrt(
        pv.velocity.x * pv.velocity.x +
          pv.velocity.y * pv.velocity.y +
          pv.velocity.z * pv.velocity.z
      );
      s.valid = true;
    } else {
      s.valid = false;
    }
  } catch {
    s.valid = false;
  }
}

function futurePosition(s: LiveSat, minutesAhead: number) {
  try {
    const t = new Date(Date.now() + minutesAhead * 60000);
    const gmst = satellite.gstime(t);
    const pv = satellite.propagate(s.satrec, t);
    if (pv.position && typeof pv.position !== 'boolean') {
      const gd = satellite.eciToGeodetic(pv.position, gmst);
      return {
        lat: satellite.degreesLat(gd.latitude),
        lng: satellite.degreesLong(gd.longitude),
        alt: gd.height,
      };
    }
  } catch {
    // fall through
  }
  return null;
}

function computeGroundTrack(
  entry: TleEntry,
  minutes = 110,
  samples = 220
): Array<{ lat: number; lng: number }> {
  const satrec = satellite.twoline2satrec(entry.line1, entry.line2);
  const now = new Date();
  const pts: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i <= samples; i++) {
    const t = new Date(now.getTime() + (i * minutes * 60000) / samples);
    try {
      const pv = satellite.propagate(satrec, t);
      if (pv.position && typeof pv.position !== 'boolean') {
        const gmst = satellite.gstime(t);
        const gd = satellite.eciToGeodetic(pv.position, gmst);
        pts.push({
          lat: satellite.degreesLat(gd.latitude),
          lng: satellite.degreesLong(gd.longitude),
        });
      }
    } catch {
      // skip
    }
  }
  return pts;
}

/* =========================================================================
 *  Projection helpers
 * ========================================================================= */
function lngToX(lng: number, width: number) {
  return ((lng + 180) / 360) * width;
}
function latToY(lat: number, height: number) {
  return ((90 - lat) / 180) * height;
}

/* Split a polyline at anti-meridian crossings so it doesn't draw a big
   horizontal line across the map when lng wraps from +180 to -180 */
function splitAntimeridian(points: Array<{ lat: number; lng: number }>) {
  const segments: Array<Array<{ lat: number; lng: number }>> = [];
  let current: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < points.length; i++) {
    if (current.length === 0) {
      current.push(points[i]);
      continue;
    }
    const prev = current[current.length - 1];
    const curr = points[i];
    if (Math.abs(curr.lng - prev.lng) > 180) {
      // Wrap — finish current segment and start new
      segments.push(current);
      current = [curr];
    } else {
      current.push(curr);
    }
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

/* Coverage footprint angular radius in degrees: acos(R / (R + h)) */
function footprintRadiusDeg(altKm: number) {
  const R = 6371;
  return (Math.acos(R / (R + altKm)) * 180) / Math.PI;
}

function classifyOrbit(altKm: number): string {
  if (altKm < 2000) return 'LEO · 近地轨道';
  if (altKm < 35000) return 'MEO · 中地轨道';
  if (altKm < 36500) return 'GEO · 地球同步';
  return 'HEO · 高地轨道';
}

/* =========================================================================
 *  Day-Night Terminator Overlay (canvas)
 * ========================================================================= */
function NightOverlay({
  width,
  height,
  left = 0,
}: {
  width: number;
  height: number;
  left?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const now = new Date();
      const sun = subSolarPoint(now);
      const W = 720;
      const H = 360;
      c.width = W;
      c.height = H;
      const img = ctx.createImageData(W, H);
      const sunLatR = (sun.lat * Math.PI) / 180;
      const sunLngR = (sun.lng * Math.PI) / 180;
      const sinSunLat = Math.sin(sunLatR);
      const cosSunLat = Math.cos(sunLatR);
      for (let j = 0; j < H; j++) {
        const lat = 90 - (j / H) * 180;
        const latR = (lat * Math.PI) / 180;
        const sinLat = Math.sin(latR);
        const cosLat = Math.cos(latR);
        for (let i = 0; i < W; i++) {
          const lng = (i / W) * 360 - 180;
          const lngR = (lng * Math.PI) / 180;
          // cos of angle between point and sub-solar
          const cosAngle =
            sinLat * sinSunLat + cosLat * cosSunLat * Math.cos(lngR - sunLngR);
          // night: cosAngle < 0; use smoothstep at terminator
          const night = Math.max(0, Math.min(1, (0.15 - cosAngle) / 0.3));
          const idx = (j * W + i) * 4;
          img.data[idx] = 0;
          img.data[idx + 1] = 3;
          img.data[idx + 2] = 15;
          img.data[idx + 3] = night * 180;
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    render();
    const id = setInterval(render, 60000); // every minute
    return () => clearInterval(id);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: 0,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        mixBlendMode: 'multiply',
      }}
    />
  );
}

/* =========================================================================
 *  Main page
 * ========================================================================= */
const MAP_ASPECT = 2; // width / height for equirectangular

type Group = TleEntry['group'];
const GROUP_KEYS: Group[] = [
  'station',
  'science',
  'gps',
  'starlink',
  'weather',
  'other',
];

export default function TrackerPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>('iss');
  const [query, setQuery] = useState('');
  const [enabledGroups, setEnabledGroups] = useState<Set<Group>>(
    new Set(GROUP_KEYS)
  );
  const [track, setTrack] = useState(true);
  const [utc, setUtc] = useState('');
  const [tick, setTick] = useState(0);

  // Propagation state (mutable refs rebuilt when selection changes)
  const liveRef = useRef<LiveSat[]>(TLE_CATALOG.map(makeLive));

  useEffect(() => {
    const update = () => {
      const now = new Date();
      liveRef.current.forEach((s) => propagate(s, now));
      setUtc(now.toISOString().replace('T', ' ').slice(0, 19));
      setTick((x) => x + 1);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  /* ---- Viewport dimensions ---- */
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () =>
      setViewport({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Map size: COVER viewport (always fill, crop excess) */
  const mapSize = useMemo(() => {
    if (!viewport.w || !viewport.h) return { w: 0, h: 0 };
    // Pick whichever axis is the tighter constraint to cover fully
    const byWidth = { w: viewport.w, h: viewport.w / MAP_ASPECT };
    if (byWidth.h >= viewport.h) return byWidth;
    return { w: viewport.h * MAP_ASPECT, h: viewport.h };
  }, [viewport]);

  /* ---- Zoom / Pan ---- */
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const clampPan = useCallback(
    (p: { x: number; y: number }, s: number) => {
      // 3x horizontal tiling: allow pan up to ±w*s horizontally
      const maxX = mapSize.w * s;
      // Vertically: strict — scaled map must always cover the viewport
      const maxY = Math.max(0, (mapSize.h * s - viewport.h) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, p.x)),
        y: Math.max(-maxY, Math.min(maxY, p.y)),
      };
    },
    [mapSize, viewport]
  );

  const onMouseDown = (e: ReactMouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };
  const onMouseMove = (e: ReactMouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan(
      clampPan(
        { x: dragRef.current.panX + dx, y: dragRef.current.panY + dy },
        scale
      )
    );
  };
  const onMouseUp = () => {
    dragRef.current = null;
  };
  const onWheel = (e: ReactWheelEvent) => {
    const delta = -Math.sign(e.deltaY) * 0.15;
    const next = Math.max(1, Math.min(4, scale + delta));
    setScale(next);
  };

  /* ---- Tracking: auto-center map on selected sat ---- */
  const selectedLive = liveRef.current.find((s) => s.entry.id === selectedId);
  useEffect(() => {
    if (!track || !selectedLive || !selectedLive.valid || !mapSize.w) return;
    const targetX = lngToX(selectedLive.lng, mapSize.w);
    const targetY = latToY(selectedLive.lat, mapSize.h);
    const cx = mapSize.w / 2;
    const cy = mapSize.h / 2;
    setPan(
      clampPan({ x: (cx - targetX) * scale, y: (cy - targetY) * scale }, scale)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tick,
    track,
    selectedId,
    mapSize.w,
    mapSize.h,
    scale,
    selectedLive?.lat,
    selectedLive?.lng,
  ]);

  /* ---- Derived data ---- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TLE_CATALOG.filter(
      (e) =>
        enabledGroups.has(e.group) &&
        (!q || e.name.toLowerCase().includes(q) || e.id.includes(q))
    );
  }, [query, enabledGroups]);

  const selected = TLE_CATALOG.find((e) => e.id === selectedId) ?? TLE_CATALOG[0];
  const groundTrack = useMemo(
    () => computeGroundTrack(selected),
    [selected]
  );
  const groundTrackSegments = useMemo(
    () => splitAntimeridian(groundTrack),
    [groundTrack]
  );
  const future90 = useMemo(() => {
    if (!selectedLive) return null;
    return futurePosition(selectedLive, 90);
  }, [selectedLive, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGroup = (g: Group) => {
    setEnabledGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#020510] text-white font-mono">
      {/* ── Map viewport ── */}
      <div
        ref={viewportRef}
        className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        {/* Transform container — 3x horizontal tile for longitude wrap */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: mapSize.w * 3,
            height: mapSize.h,
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: track ? 'transform 0.9s cubic-bezier(.2,.7,.2,1)' : 'none',
          }}
        >
          {/* Base equirectangular map — 3 copies tiled */}
          {[0, 1, 2].map((k) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={`img-${k}`}
              src="/textures/earth-day.jpg"
              alt="Earth"
              draggable={false}
              className="absolute top-0 pointer-events-none"
              style={{
                left: k * mapSize.w,
                width: mapSize.w,
                height: mapSize.h,
                filter: 'brightness(0.88) saturate(0.95)',
              }}
            />
          ))}

          {/* Day / night overlay — 3 copies tiled */}
          {[0, 1, 2].map((k) => (
            <NightOverlay
              key={`night-${k}`}
              width={mapSize.w}
              height={mapSize.h}
              left={k * mapSize.w}
            />
          ))}

          {/* SVG overlay: graticule + tracks + markers — content tripled via <g> offsets */}
          <svg
            width={mapSize.w * 3}
            height={mapSize.h}
            viewBox={`0 0 ${mapSize.w * 3} ${mapSize.h}`}
            className="absolute left-0 top-0 pointer-events-none"
            style={{ overflow: 'hidden' }}
          >
            {/* graticule spanning all 3 tiles */}
            <g stroke="rgba(120, 170, 230, 0.18)" strokeWidth={0.5} fill="none">
              {Array.from({ length: 36 }, (_, i) => {
                const x = ((i + 1) / 36) * mapSize.w * 3;
                return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={mapSize.h} />;
              })}
              {Array.from({ length: 11 }, (_, i) => {
                const y = ((i + 1) / 12) * mapSize.h;
                return (
                  <line
                    key={`h${i}`}
                    x1={0}
                    y1={y}
                    x2={mapSize.w * 3}
                    y2={y}
                  />
                );
              })}
              {/* equator */}
              <line
                x1={0}
                y1={mapSize.h / 2}
                x2={mapSize.w * 3}
                y2={mapSize.h / 2}
                stroke="rgba(120,170,230,0.35)"
                strokeWidth={0.8}
              />
            </g>

            {/* 3x content tiling for wrap */}
            {[0, 1, 2].map((tile) => (
            <g key={`tile-${tile}`} transform={`translate(${tile * mapSize.w}, 0)`}>
            {/* Ground track polylines (with antimeridian split) */}
            {groundTrackSegments.map((seg, i) => {
              if (seg.length < 2) return null;
              const d = seg
                .map(
                  (p, j) =>
                    `${j === 0 ? 'M' : 'L'}${lngToX(p.lng, mapSize.w)},${latToY(p.lat, mapSize.h)}`
                )
                .join(' ');
              return (
                <path
                  key={`track-${i}`}
                  d={d}
                  fill="none"
                  stroke={GROUP_META[selected.group].color}
                  strokeWidth={1.5 / scale}
                  strokeOpacity={0.9}
                  strokeDasharray={`${4 / scale},${3 / scale}`}
                />
              );
            })}

            {/* Coverage footprint circle (approx on equirectangular) */}
            {selectedLive?.valid && (() => {
              const cx = lngToX(selectedLive.lng, mapSize.w);
              const cy = latToY(selectedLive.lat, mapSize.h);
              const angDeg = footprintRadiusDeg(selectedLive.alt);
              const rx = (angDeg / 360) * mapSize.w; // deg → px along equator
              const ry = (angDeg / 180) * mapSize.h;
              return (
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={rx}
                  ry={ry}
                  fill={GROUP_META[selected.group].color + '18'}
                  stroke={GROUP_META[selected.group].color}
                  strokeWidth={1.2 / scale}
                  strokeOpacity={0.55}
                  strokeDasharray={`${3 / scale},${3 / scale}`}
                />
              );
            })()}

            {/* Future-90min predicted position pin */}
            {future90 && (
              <g
                transform={`translate(${lngToX(future90.lng, mapSize.w)}, ${latToY(future90.lat, mapSize.h)})`}
              >
                <circle
                  r={4 / scale}
                  fill="none"
                  stroke={GROUP_META[selected.group].color}
                  strokeWidth={1.2 / scale}
                />
                <circle
                  r={1.5 / scale}
                  fill={GROUP_META[selected.group].color}
                />
              </g>
            )}

            {/* All satellites as dots */}
            {liveRef.current.map((s) => {
              if (!s.valid) return null;
              if (!enabledGroups.has(s.entry.group)) return null;
              const isSel = s.entry.id === selectedId;
              const color = GROUP_META[s.entry.group].color;
              return (
                <g
                  key={s.entry.id}
                  transform={`translate(${lngToX(s.lng, mapSize.w)}, ${latToY(s.lat, mapSize.h)})`}
                >
                  <circle
                    r={(isSel ? 5 : 3) / scale}
                    fill={color}
                    stroke="white"
                    strokeOpacity={isSel ? 0.9 : 0.4}
                    strokeWidth={(isSel ? 1.2 : 0.6) / scale}
                  />
                  {isSel && (
                    <>
                      <circle
                        r={10 / scale}
                        fill="none"
                        stroke={color}
                        strokeWidth={0.8 / scale}
                        strokeOpacity={0.7}
                      />
                      <text
                        x={8 / scale}
                        y={-6 / scale}
                        fontSize={10 / scale}
                        fill={color}
                        stroke="rgba(0,0,0,0.8)"
                        strokeWidth={0.3 / scale}
                        paintOrder="stroke"
                        style={{
                          fontFamily: 'monospace',
                          letterSpacing: '0.04em',
                        }}
                      >
                        ▸ {s.entry.name}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
            </g>
            ))}
          </svg>

          {/* Clickable hotspots for satellites (placed after SVG to receive clicks) */}
          <svg
            width={mapSize.w * 3}
            height={mapSize.h}
            viewBox={`0 0 ${mapSize.w * 3} ${mapSize.h}`}
            className="absolute left-0 top-0"
            style={{ pointerEvents: 'none', overflow: 'hidden' }}
          >
            {[0, 1, 2].map((tile) => (
              <g
                key={`hit-tile-${tile}`}
                transform={`translate(${tile * mapSize.w}, 0)`}
              >
                {liveRef.current.map((s) => {
                  if (!s.valid) return null;
                  if (!enabledGroups.has(s.entry.group)) return null;
                  return (
                    <circle
                      key={`hit-${s.entry.id}`}
                      cx={lngToX(s.lng, mapSize.w)}
                      cy={latToY(s.lat, mapSize.h)}
                      r={10 / scale}
                      fill="transparent"
                      style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(s.entry.id);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* ── Top HUD ── */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              onClick={() => router.back()}
              className="group flex items-center gap-2 px-3 py-2 border border-cyan-500/40 bg-black/55 backdrop-blur-sm hover:border-cyan-300 hover:bg-cyan-500/15 transition-colors"
              style={{ boxShadow: '0 0 18px rgba(34,211,238,0.12)' }}
              title="返回 (ESC)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="text-cyan-300 group-hover:text-cyan-100"
              >
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-left leading-tight">
                <div className="text-[10px] text-cyan-300 group-hover:text-cyan-100 tracking-widest">
                  BACK
                </div>
                <div className="text-[8px] text-gray-500">返回 · ESC</div>
              </div>
            </button>
            <div className="leading-tight">
              <div className="text-[12px] text-cyan-300 tracking-[0.25em]">
                ORBIT TRACKER
              </div>
              <div className="text-[9px] text-gray-500 tracking-wider">
                实时 卫星追踪与轨道可视化
              </div>
            </div>
          </div>

          <div className="text-right leading-tight">
            <div className="text-[10px] text-cyan-300 tracking-widest">
              TRACKING · {filtered.length} / {TLE_CATALOG.length} SATS
            </div>
            <div className="text-[9px] text-gray-500">{utc} UTC</div>
          </div>
        </div>
      </div>

      {/* ── Left panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.45 }}
        className="absolute left-5 top-20 w-[280px] max-h-[calc(100vh-180px)] z-20 flex flex-col gap-3 pointer-events-auto"
      >
        {/* Selected satellite card (big) */}
        <div className="border border-cyan-500/35 bg-black/60 backdrop-blur-md">
          <div
            className="px-3 py-2 border-b"
            style={{
              borderColor: `${GROUP_META[selected.group].color}55`,
              background: `${GROUP_META[selected.group].color}12`,
            }}
          >
            <div className="flex items-center gap-2">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[13px] text-cyan-100 tracking-wider cursor-pointer"
                style={{ color: GROUP_META[selected.group].color }}
              >
                {TLE_CATALOG.map((e) => (
                  <option key={e.id} value={e.id} className="bg-black">
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[9px] text-gray-500 mt-0.5 tracking-wider">
              {GROUP_META[selected.group].label} · 实时位置
            </div>
          </div>

          <div className="px-3 py-3 space-y-2 text-[10px]">
            <div>
              <div className="text-[9px] text-cyan-500 tracking-widest mb-0.5">
                当前位置
              </div>
              {selectedLive?.valid ? (
                <div className="text-cyan-100 leading-relaxed">
                  经: {selectedLive.lng.toFixed(2)}°　纬:{' '}
                  {selectedLive.lat.toFixed(2)}°
                  <br />
                  高: {selectedLive.alt.toFixed(1)} km　速:{' '}
                  {selectedLive.velocity.toFixed(3)} km/s
                </div>
              ) : (
                <div className="text-yellow-400/70">PROPAGATION ERROR</div>
              )}
            </div>

            {future90 && (
              <div>
                <div className="text-[9px] text-cyan-500 tracking-widest mb-0.5">
                  预测位置 · 90分钟后
                </div>
                <div className="text-cyan-100/80 leading-relaxed">
                  经: {future90.lng.toFixed(2)}°　纬:{' '}
                  {future90.lat.toFixed(2)}°
                </div>
              </div>
            )}

            {selectedLive?.valid && (
              <div>
                <div className="text-[9px] text-cyan-500 tracking-widest mb-0.5">
                  轨道分类
                </div>
                <div className="text-cyan-100/80">
                  {classifyOrbit(selectedLive.alt)}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-cyan-500/15 mt-2">
              <input
                type="checkbox"
                checked={track}
                onChange={(e) => setTrack(e.target.checked)}
                className="accent-cyan-400"
              />
              <span className="text-[10px] text-cyan-200 tracking-wider">
                跟踪卫星 · 自动居中
              </span>
            </label>

            <div className="text-[9px] text-gray-500 pt-1">
              数据源:{' '}
              <span className="text-cyan-400/80">TLE snapshot (静态)</span>
            </div>
          </div>
        </div>

        {/* Search + groups */}
        <div className="border border-cyan-500/30 bg-black/55 backdrop-blur-md px-3 py-2 space-y-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 NORAD name..."
            className="w-full bg-transparent text-[11px] text-cyan-100 outline-none placeholder:text-gray-600 border-b border-cyan-500/20 pb-1"
          />
          <div className="flex flex-wrap gap-1">
            {GROUP_KEYS.map((g) => {
              const active = enabledGroups.has(g);
              const meta = GROUP_META[g];
              return (
                <button
                  key={g}
                  onClick={() => toggleGroup(g)}
                  className="text-[9px] px-2 py-0.5 border transition-all"
                  style={{
                    color: active ? meta.color : '#555',
                    borderColor: active ? `${meta.color}80` : '#333',
                    background: active ? `${meta.color}15` : 'transparent',
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Catalog list */}
        <div className="flex-1 min-h-0 max-h-[240px] border border-cyan-500/30 bg-black/55 backdrop-blur-md overflow-y-auto">
          <div className="sticky top-0 bg-black/80 px-3 py-1.5 border-b border-cyan-500/20 text-[9px] text-cyan-500 tracking-widest">
            卫星列表 · {filtered.length}
          </div>
          <ul>
            {filtered.map((entry) => {
              const color = GROUP_META[entry.group].color;
              const active = entry.id === selectedId;
              const live = liveRef.current.find(
                (l) => l.entry.id === entry.id
              );
              return (
                <li
                  key={entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  className="px-3 py-1.5 border-b border-cyan-500/10 cursor-pointer"
                  style={{
                    background: active ? `${color}15` : 'transparent',
                    borderLeft: `2px solid ${active ? color : 'transparent'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: color,
                        boxShadow: `0 0 6px ${color}`,
                      }}
                    />
                    <span
                      className="text-[10px] tracking-wider truncate flex-1"
                      style={{ color: active ? '#e0f7ff' : '#8ea0b5' }}
                    >
                      {entry.name}
                    </span>
                    {live?.valid && (
                      <span className="text-[8px] text-gray-500 tabular-nums">
                        {live.alt.toFixed(0)}km
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </motion.div>

      {/* ── Zoom controls ── */}
      <div className="absolute left-5 bottom-5 z-20 flex flex-col border border-cyan-500/30 bg-black/60 backdrop-blur-md">
        <button
          onClick={() => setScale((s) => Math.min(4, s + 0.3))}
          className="w-8 h-8 text-cyan-300 hover:bg-cyan-500/15 border-b border-cyan-500/20 text-lg leading-none"
        >
          +
        </button>
        <button
          onClick={() => setScale((s) => Math.max(1, s - 0.3))}
          className="w-8 h-8 text-cyan-300 hover:bg-cyan-500/15 text-lg leading-none"
        >
          −
        </button>
        <div className="text-[8px] text-gray-500 text-center py-0.5 border-t border-cyan-500/20">
          {scale.toFixed(1)}x
        </div>
      </div>

      {/* ── Bottom hint ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center">
        <div className="text-[9px] text-gray-500 tracking-widest">
          拖动平移 · 滚轮缩放 · 点击卫星选择
        </div>
      </div>

      {/* Corner HUD */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-cyan-400/40" />
        <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-400/40" />
        <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-cyan-400/40" />
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-cyan-400/40" />
      </div>
    </main>
  );
}
