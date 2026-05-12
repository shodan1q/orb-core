import { AttitudeFlightDeck } from '../components/attitude/AttitudeFlightDeck'
import type { SatelliteHealthSnapshot } from '../hooks/useSimulatedTelemetry'

type Orbit = {
  lat: number
  lng: number
  altitudeKm: number
  speedKms: number
}

type Camera = {
  iso: number
  shutter: number
  aperture: string
  resolution: string
}

export type AttitudePageProps = {
  orbit: Orbit
  trail: [number, number][]
  health: SatelliteHealthSnapshot
  camera: Camera
  tick: number
}

export function AttitudePage(props: AttitudePageProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <AttitudeFlightDeck {...props} />
    </div>
  )
}
