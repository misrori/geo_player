import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTourById } from '../data/tours'
import { fetchGpx, parseGpx, haversine, nearestIndex, remainingDistance, bearing, formatDistance } from '../utils/gpx'
import TrackMap from '../components/TrackMap'
import ElevationChart from '../components/ElevationChart'

export default function TourPlayer({ custom = false }) {
  const { id } = useParams()
  const tour = custom ? null : getTourById(id)
  const nav = useNavigate()

  const [gpx, setGpx] = useState(null)
  const [gpxError, setGpxError] = useState(null)
  const [userPos, setUserPos] = useState(null)
  const [heading, setHeading] = useState(0)
  const [permissionError, setPermissionError] = useState(null)
  const [follow, setFollow] = useState(true)
  const [showElev, setShowElev] = useState(false)
  const [wakeLock, setWakeLock] = useState(false)
  const wakeLockRef = useRef(null)
  const lastPosRef = useRef(null)

  // GPX betöltés – tour-ból vagy a custom pufferből
  useEffect(() => {
    if (custom) {
      const buf = sessionStorage.getItem('customGpx')
      if (!buf) {
        setGpxError('Nincs betöltött GPX – menj vissza és válassz egyet.')
        return
      }
      try {
        setGpx(parseGpx(buf))
      } catch (e) {
        setGpxError('Nem sikerült beolvasni a GPX-et.')
      }
      return
    }
    if (!tour) return
    let cancel = false
    fetchGpx(tour.gpx)
      .then(g => { if (!cancel) setGpx(g) })
      .catch(e => { if (!cancel) setGpxError(e.message) })
    return () => { cancel = true }
  }, [tour, custom])

  // GPS pozíció követés
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPermissionError('A böngésző nem támogatja a GPS-t.')
      return
    }
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }
        const prev = lastPosRef.current
        if (prev) {
          const d = haversine(prev, p)
          if (d > 3) {
            // csak ha van érdemleges mozgás, számolunk irányt a pozíciókból
            setHeading(bearing(prev, p))
          }
        }
        if (pos.coords.heading != null && !Number.isNaN(pos.coords.heading)) {
          setHeading(pos.coords.heading)
        }
        lastPosRef.current = p
        setUserPos(p)
      },
      err => {
        setPermissionError(
          err.code === err.PERMISSION_DENIED
            ? 'Helymeghatározás engedély nincs megadva. Engedélyezd a böngésző beállításaiban.'
            : `GPS hiba: ${err.message}`
        )
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Wake Lock – képernyő mindig aktív túra közben
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let cancelled = false
    navigator.wakeLock.request('screen')
      .then(lock => {
        if (cancelled) { lock.release(); return }
        wakeLockRef.current = lock
        setWakeLock(true)
        lock.addEventListener('release', () => setWakeLock(false))
      })
      .catch(() => {/* a user nem adta meg vagy nem támogatott */})
    return () => {
      cancelled = true
      if (wakeLockRef.current) wakeLockRef.current.release()
    }
  }, [])

  // Fő HUD értékek
  const info = useMemo(() => {
    if (!gpx || !userPos) return null
    const n = nearestIndex(gpx.points, userPos.lat, userPos.lon)
    const remain = remainingDistance(gpx.points, n.index)
    const next = gpx.points[Math.min(gpx.points.length - 1, n.index + 3)]
    const dirTo = next ? bearing(userPos, next) : null
    // Kum. táv a nearestIndex-ig (a magasságprofil highlightjához)
    let covered = 0
    for (let i = 1; i <= n.index; i++) covered += haversine(gpx.points[i - 1], gpx.points[i])
    return {
      offTrackM: n.distanceM,
      remainingM: remain,
      coveredM: covered,
      nextBearing: dirTo,
      progress: n.index / Math.max(1, gpx.points.length - 1)
    }
  }, [gpx, userPos])

  const title = tour?.title || gpx?.name || 'Saját GPX'

  if (gpxError) {
    return (
      <>
        <header className="topbar">
          <button className="back" onClick={() => nav(-1)}>←</button>
          <h1>Hiba</h1>
        </header>
        <div className="error">{gpxError}</div>
      </>
    )
  }

  return (
    <div className="map-wrap">
      <TrackMap
        trackPoints={gpx?.points || []}
        userPos={userPos}
        heading={heading}
        follow={follow}
        onUserPan={() => setFollow(false)}
      />

      <div className="hud">
        <button className="close" onClick={() => nav(-1)} aria-label="Vissza">✕</button>
        <div className="panel">
          <div>
            <small>Hátralévő</small>
            <b>{info ? formatDistance(info.remainingM) : '–'}</b>
          </div>
          <div>
            <small>Útvonaltól</small>
            <b style={{ color: info && info.offTrackM > 50 ? '#ffab40' : '#81c784' }}>
              {info ? formatDistance(info.offTrackM) : '–'}
            </b>
          </div>
          <div>
            <small>GPS</small>
            <b>{userPos ? `±${Math.round(userPos.accuracy)} m` : '…'}</b>
          </div>
        </div>
      </div>

      <div className="fab-group">
        <button
          className={`fab ${follow ? 'active' : ''}`}
          onClick={() => setFollow(f => !f)}
          title={follow ? 'Követés ki' : 'Követés be'}
        >
          {follow ? '⊙' : '◎'}
        </button>
        <button
          className={`fab ${showElev ? 'active' : ''}`}
          onClick={() => setShowElev(v => !v)}
          title="Magasságprofil"
        >
          ⛰
        </button>
      </div>

      {showElev && gpx && (
        <div className="elev-overlay">
          <ElevationChart
            points={gpx.points}
            height={120}
            compact
            highlightM={info?.coveredM}
          />
        </div>
      )}

      <div className="hud-bottom">
        {permissionError && (
          <div className="info-line" style={{ background: 'rgba(211,47,47,0.9)' }}>
            ⚠️ {permissionError}
          </div>
        )}
        <div className="info-line">
          <span>
            {info && info.offTrackM > 100
              ? '⚠️ Letértél az útvonalról'
              : info && info.offTrackM < 20
                ? '✅ Útvonalon vagy'
                : '➡ Haladj a rózsaszín vonal mentén'}
          </span>
          {info && <b>{Math.round(info.progress * 100)}%</b>}
        </div>
      </div>
    </div>
  )
}
