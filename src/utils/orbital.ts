import * as THREE from 'three';

// Orbital parameters for Orb Core (ISS-like orbit)
const ORBIT_RADIUS = 2.5; // Earth radius units (earth = 2.0)
const ORBIT_INCLINATION = 51.6 * (Math.PI / 180);
const ORBIT_PERIOD = 92 * 60; // 92 minutes in seconds

export function getSatellitePosition(timeSeconds: number): THREE.Vector3 {
  const angularVelocity = (2 * Math.PI) / ORBIT_PERIOD;
  const angle = angularVelocity * timeSeconds;

  // Orbital plane with inclination
  const x = ORBIT_RADIUS * Math.cos(angle);
  const z = ORBIT_RADIUS * Math.sin(angle) * Math.cos(ORBIT_INCLINATION);
  const y = ORBIT_RADIUS * Math.sin(angle) * Math.sin(ORBIT_INCLINATION);

  return new THREE.Vector3(x, y, z);
}

export function getSatelliteLatLng(timeSeconds: number) {
  const pos = getSatellitePosition(timeSeconds);
  const lat = Math.asin(pos.y / pos.length()) * (180 / Math.PI);
  const lng = Math.atan2(pos.z, pos.x) * (180 / Math.PI);
  const alt = (pos.length() - 2.0) * 6371; // km above surface
  const velocity = 7.66; // km/s approximate
  return { lat, lng, alt, velocity };
}

export function latLngToCartesian(
  lat: number,
  lng: number,
  radius: number = 2.0
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function getSunDirection(timeSeconds: number): THREE.Vector3 {
  // Slow rotation to simulate day/night cycle (compressed time)
  const angle = timeSeconds * 0.01;
  return new THREE.Vector3(
    Math.cos(angle),
    0.3,
    Math.sin(angle)
  ).normalize();
}

export function getOrbitPoints(
  timeSeconds: number,
  count: number = 200
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const step = ORBIT_PERIOD / count;
  for (let i = 0; i < count; i++) {
    points.push(getSatellitePosition(timeSeconds + i * step));
  }
  return points;
}
