import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { haversine, bearing } from '../utils/gpx'

// Fix Leaflet default icon URL-jei (Vite-nál máshogy nem találja).
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

// Felhasználó pozíciója – nyíllal a haladási irány szerint.
const userIconHtml = (heading) => `
  <div class="user-arrow" style="transform: rotate(${heading || 0}deg);">
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="10" fill="rgba(25,118,210,0.25)"/>
      <polygon points="18,4 26,22 18,18 10,22" fill="#1976d2" stroke="#fff" stroke-width="2"/>
    </svg>
  </div>
`

const parkingIconHtml = `
  <div style="background:#1b5e20;color:#fff;border-radius:50%;width:32px;height:32px;display:grid;place-items:center;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.3);">P</div>
`

export default function TrackMap({ trackPoints, userPos, heading, follow, onMapReady }) {
  const ref = useRef(null)
  const mapRef = useRef(null)
  const trackLayerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const parkingMarkerRef = useRef(null)
  const arrowLayerRef = useRef(null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return

    const map = L.map(ref.current, {
      zoomControl: true,
      attributionControl: true,
      tap: true
    }).setView([48.95, 20.4], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map)

    mapRef.current = map
    if (onMapReady) onMapReady(map)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Track rajzolása
  useEffect(() => {
    const map = mapRef.current
    if (!map || !trackPoints || trackPoints.length === 0) return

    if (trackLayerRef.current) {
      trackLayerRef.current.remove()
    }
    const latlngs = trackPoints.map(p => [p.lat, p.lon])
    const line = L.polyline(latlngs, {
      color: '#e91e63',
      weight: 5,
      opacity: 0.85,
      lineJoin: 'round'
    }).addTo(map)
    trackLayerRef.current = line

    // Start marker (parkoló)
    if (parkingMarkerRef.current) parkingMarkerRef.current.remove()
    const start = trackPoints[0]
    parkingMarkerRef.current = L.marker([start.lat, start.lon], {
      icon: L.divIcon({ html: parkingIconHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 16] }),
      title: 'Parkoló / start'
    }).addTo(map)

    // Haladási irányt jelző nyilak ~400 méterenként a track mentén
    if (arrowLayerRef.current) arrowLayerRef.current.remove()
    const arrows = L.layerGroup()
    let accum = 0
    const stepM = 400
    let nextTarget = stepM
    for (let i = 1; i < trackPoints.length; i++) {
      accum += haversine(trackPoints[i - 1], trackPoints[i])
      if (accum >= nextTarget) {
        const dir = bearing(trackPoints[i - 1], trackPoints[i])
        const ll = trackPoints[i]
        const html = `<div style="transform: rotate(${dir.toFixed(0)}deg);">
          <svg width="22" height="22" viewBox="0 0 22 22" style="display:block;">
            <polygon points="11,2 18,18 11,14 4,18" fill="#e91e63" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
        </div>`
        L.marker([ll.lat, ll.lon], {
          icon: L.divIcon({ html, className: 'track-arrow', iconSize: [22, 22], iconAnchor: [11, 11] }),
          interactive: false,
          keyboard: false
        }).addTo(arrows)
        nextTarget += stepM
      }
    }
    arrows.addTo(map)
    arrowLayerRef.current = arrows

    // Fit bounds (csak az első berajzoláskor)
    map.fitBounds(line.getBounds(), { padding: [30, 30] })
  }, [trackPoints])

  // User marker
  useEffect(() => {
    const map = mapRef.current
    if (!map || !userPos) return

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userPos.lat, userPos.lon])
      userMarkerRef.current.setIcon(L.divIcon({
        html: userIconHtml(heading),
        className: 'user-marker',
        iconSize: [36, 36], iconAnchor: [18, 18]
      }))
    } else {
      userMarkerRef.current = L.marker([userPos.lat, userPos.lon], {
        icon: L.divIcon({
          html: userIconHtml(heading),
          className: 'user-marker',
          iconSize: [36, 36], iconAnchor: [18, 18]
        }),
        zIndexOffset: 1000
      }).addTo(map)
    }

    if (follow) {
      map.panTo([userPos.lat, userPos.lon], { animate: true, duration: 0.4 })
    }
  }, [userPos, heading, follow])

  return <div ref={ref} className="leaflet-container" style={{ height: '100%', width: '100%' }} />
}
