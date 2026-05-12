import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { CornerMarks } from './CornerMarks'

type Props = {
  lat: number
  lng: number
  trail: [number, number][]
  altitudeKm: number
  speedKms: number
}

export function OrbitTracker({
  lat,
  lng,
  trail,
  altitudeKm,
  speedKms,
}: Props) {
  const center: [number, number] = [12, 0]

  const metrics = [
    { label: '高度', value: `${altitudeKm.toFixed(1)} km`, accent: true },
    { label: '地速', value: `${speedKms.toFixed(2)} km/s` },
    {
      label: '纬度',
      value: `${lat >= 0 ? 'N' : 'S'} ${Math.abs(lat).toFixed(3)}°`,
    },
    {
      label: '经度',
      value: `${lng >= 0 ? 'E' : 'W'} ${Math.abs(lng).toFixed(3)}°`,
    },
  ]

  return (
    <section className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#0d0d10]">
      <CornerMarks />
      <header className="relative z-10 flex items-start justify-between px-5 pb-2 pt-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            轨道实时追踪
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-200">
            世界地图 · 星历与关键遥测
          </p>
        </div>
        <button
          type="button"
          className="rounded-xl border border-zinc-700/80 p-2 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
          aria-label="展开轨道详情"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </button>
      </header>

      <div className="relative min-h-0 flex-1 px-3 pb-3">
        <div className="absolute inset-x-3 bottom-3 top-0 overflow-hidden rounded-2xl border border-zinc-800/60">
          <MapContainer
            center={center}
            zoom={2}
            className="h-full w-full"
            scrollWheelZoom
            attributionControl
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {trail.length > 1 && (
              <Polyline
                positions={trail}
                pathOptions={{
                  color: '#ff4d33',
                  weight: 2,
                  opacity: 0.75,
                }}
              />
            )}
            <CircleMarker
              center={[lat, lng]}
              radius={8}
              pathOptions={{
                color: '#ff4d33',
                fillColor: '#ff4d33',
                fillOpacity: 0.95,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.92}>
                <span className="text-xs font-medium text-zinc-800">
                  卫星本体 · LIVE
                </span>
              </Tooltip>
            </CircleMarker>
          </MapContainer>
        </div>

        <div className="pointer-events-none absolute bottom-6 left-6 right-6 flex flex-wrap gap-2">
          {metrics.map((m) => (
            <div
              key={m.label}
              className={`pointer-events-auto rounded-2xl border px-3 py-2 backdrop-blur-md ${
                m.accent
                  ? 'border-[#ff4d33]/40 bg-black/55'
                  : 'border-zinc-700/60 bg-black/45'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                {m.label}
              </div>
              <div
                className={`font-mono text-sm font-semibold tabular-nums ${
                  m.accent ? 'text-[#ff6b4d]' : 'text-zinc-100'
                }`}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
