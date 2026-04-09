import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type Props = {
  lat: number
  lng: number
  trail: [number, number][]
}

export function MiniOrbitMap({ lat, lng, trail }: Props) {
  const center: [number, number] = [12, 0]

  return (
    <div className="h-full min-h-0 w-full overflow-hidden rounded-md bg-[#0d0d10] [&_.leaflet-container]:!m-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:min-h-0 [&_.leaflet-container]:w-full [&_.leaflet-container]:rounded-md [&_.leaflet-container]:bg-[#0d0d10]">
      <MapContainer
        center={center}
        zoom={1}
        className="h-full min-h-0 w-full [&_.leaflet-pane]:!outline-none"
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {trail.length > 1 && (
          <Polyline
            positions={trail}
            pathOptions={{ color: '#a1a1aa', weight: 2, opacity: 0.65 }}
          />
        )}
        <CircleMarker
          center={[lat, lng]}
          radius={6}
          pathOptions={{
            color: '#e53935',
            fillColor: '#e53935',
            fillOpacity: 0.9,
            weight: 2,
          }}
        />
      </MapContainer>
    </div>
  )
}
