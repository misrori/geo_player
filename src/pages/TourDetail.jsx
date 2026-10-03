import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { getTourById } from '../data/tours'
import { fetchGpx, trackStats } from '../utils/gpx'
import ElevationChart from '../components/ElevationChart'

export default function TourDetail() {
  const { id } = useParams()
  const tour = getTourById(id)
  const nav = useNavigate()
  const location = useLocation()
  // Vissza a listára a szűrőkkel együtt (ha onnan jöttünk), különben a főoldalra.
  const back = () => location.key !== 'default' ? nav(-1) : nav('/')
  const [gpx, setGpx] = useState(null)
  const [gpxError, setGpxError] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    if (!tour) return
    let cancel = false
    setGpx(null); setGpxError(null)
    fetchGpx(tour.gpx)
      .then(g => { if (!cancel) { setGpx(g); setGpxError(null) } })
      .catch(e => { if (!cancel) setGpxError(e.message) })
    return () => { cancel = true }
  }, [tour])

  if (!tour) {
    return (
      <>
        <header className="topbar">
          <button className="back" onClick={back}>←</button>
          <h1>Nem található</h1>
        </header>
        <div className="error">Ez a túra nem található.</div>
      </>
    )
  }

  const stats = gpx ? trackStats(gpx.points) : null
  const distKm = stats ? stats.distKm.toFixed(1) : tour.stats.distKm
  const ascM = stats ? stats.ascM : tour.stats.ascM
  const elevMax = stats ? stats.elevMax : tour.stats.elevMax

  // Parkoló = a GPX első pontja
  const parkingLat = gpx?.points[0]?.lat
  const parkingLon = gpx?.points[0]?.lon

  const openGoogleMaps = () => {
    if (parkingLat == null) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${parkingLat},${parkingLon}&travelmode=driving`
    window.open(url, '_blank', 'noopener')
  }

  return (
    <div className="detail">
      <header className="topbar">
        <button className="back" onClick={back}>←</button>
        <h1 style={{ fontSize: '0.95rem' }}>{tour.title}</h1>
      </header>

      <div className="detail__hero">
        <img src={tour.coverImage} alt={tour.title} />
        <div className="detail__hero__title">
          <h1>{tour.title}</h1>
          <p>{tour.subtitle}</p>
        </div>
      </div>

      <div className="detail__stats">
        <div className="stat">
          <div className="stat__value">{distKm}</div>
          <div className="stat__label">km</div>
        </div>
        <div className="stat">
          <div className="stat__value">{tour.stats.distKm && Math.round(tour.stats.distKm / (tour.type === 'bike' ? 15 : 3.5) * 10) / 10 || '~'}</div>
          <div className="stat__label">~ óra</div>
        </div>
        <div className="stat">
          <div className="stat__value">{ascM}</div>
          <div className="stat__label">m ↑</div>
        </div>
        <div className="stat">
          <div className="stat__value">{elevMax || '~'}</div>
          <div className="stat__label">max m</div>
        </div>
      </div>

      <div className="section">
        <h2>Magasságprofil</h2>
        <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: 6 }}>
          Húzd el az ujjad rajta – megmutatja, hogy melyik km-nél milyen magasan leszel és mekkora a meredekség.
        </p>
      </div>
      {gpx
        ? <div style={{ background: '#fff', margin: '0 12px', borderRadius: 12, padding: '8px 10px 2px' }}>
            <ElevationChart points={gpx.points} height={160} />
          </div>
        : <div style={{ margin: '0 16px', padding: 14, color: '#888', fontSize: '0.85rem' }}>
            {gpxError ? `GPX nem tölthető: ${gpxError}` : 'Profil betöltése…'}
          </div>
      }

      <div className="section">
        <h2>Leírás</h2>
        <p>{tour.description}</p>
      </div>

      {tour.character && (
        <div className="section">
          <h2>A túra jellege</h2>
          <p>{tour.character}</p>
        </div>
      )}

      {tour.highlights.length > 0 && (
        <div className="section">
          <h2>Látnivalók</h2>
          <ul>
            {tour.highlights.map(h => <li key={h}>{h}</li>)}
          </ul>
        </div>
      )}

      <div className="section">
        <h2>{tour.parking.name === 'Kiindulópont' ? 'Kiindulópont' : 'Parkoló'}</h2>
      </div>
      <div className="parking-box">
        <h3>🅿️ {tour.parking.name}</h3>
        {tour.parking.note && <p>{tour.parking.note}</p>}
        {parkingLat != null && (
          <div className="coord">GPS: {parkingLat.toFixed(5)}, {parkingLon.toFixed(5)}</div>
        )}
        {gpxError && !gpx && <div className="error" style={{ margin: '8px 0 0' }}>GPX hiba: {gpxError}</div>}
      </div>

      {tour.equipment.length > 0 && (
        <div className="section">
          <h2>Felszerelés</h2>
          <ul>
            {tour.equipment.map(e => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="section">
        <h2>Képek</h2>
      </div>
      <div className="gallery gallery--compact">
        {tour.images.map((src, i) => (
          <img key={i} src={src} alt="" loading="lazy" onClick={() => setLightbox(src)} />
        ))}
      </div>
      <a
        className="more-images-link"
        href={tour.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        📷 További képek és teljes leírás a kirandulastippek.hu-n →
      </a>

      <div className="cta-dock">
        <button
          className="btn btn--secondary"
          onClick={openGoogleMaps}
          disabled={parkingLat == null}
        >
          🧭 Navigáció a starthoz
        </button>
        <Link to={`/tour/${tour.id}/play`} className="btn btn--primary">
          ▶ Túra indítása
        </Link>
      </div>

      {lightbox && (
        <div className="modal" onClick={() => setLightbox(null)}>
          <button className="close-modal" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="" />
        </div>
      )}
    </div>
  )
}
