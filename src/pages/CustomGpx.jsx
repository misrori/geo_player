import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseGpx, trackStats } from '../utils/gpx'

export default function CustomGpx() {
  const nav = useNavigate()
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  const handleFile = async (file) => {
    setError(null); setParsed(null)
    if (!file) return
    const text = await file.text()
    try {
      const g = parseGpx(text)
      if (!g.points || g.points.length === 0) {
        setError('A fájlban nincsenek GPS pontok (trkpt).')
        return
      }
      sessionStorage.setItem('customGpx', text)
      setParsed({ name: g.name || file.name, stats: trackStats(g.points), count: g.points.length, first: g.points[0] })
    } catch (e) {
      setError('Nem olvasható GPX fájl.')
    }
  }

  return (
    <>
      <header className="topbar">
        <button className="back" onClick={() => nav('/')}>←</button>
        <h1>Saját GPX</h1>
      </header>

      <div className="notice">
        Tölts fel egy GPX fájlt a telefonodról, és a túra lejátszója elő mutatja, hogy merre kell menni – a parkoló automatikusan a track első pontja lesz.
      </div>

      <div className="upload-box">
        <p>Válassz egy .gpx fájlt a mobilodról.</p>
        <input
          type="file"
          accept=".gpx,application/gpx+xml,text/xml"
          ref={fileRef}
          onChange={e => handleFile(e.target.files?.[0])}
          id="gpx-file"
        />
        <label htmlFor="gpx-file">📂 Tallózás…</label>
      </div>

      {error && <div className="error">{error}</div>}

      {parsed && (
        <>
          <div className="section">
            <h2>Betöltve: {parsed.name}</h2>
          </div>
          <div className="detail__stats">
            <div className="stat">
              <div className="stat__value">{parsed.stats.distKm.toFixed(1)}</div>
              <div className="stat__label">km</div>
            </div>
            <div className="stat">
              <div className="stat__value">{parsed.stats.ascM}</div>
              <div className="stat__label">m ↑</div>
            </div>
            <div className="stat">
              <div className="stat__value">{parsed.stats.elevMax || '–'}</div>
              <div className="stat__label">max m</div>
            </div>
            <div className="stat">
              <div className="stat__value">{parsed.count}</div>
              <div className="stat__label">pont</div>
            </div>
          </div>
          <div className="parking-box">
            <h3>🅿️ Parkoló (GPX első pontja)</h3>
            <div className="coord">GPS: {parsed.first.lat.toFixed(5)}, {parsed.first.lon.toFixed(5)}</div>
          </div>
          <div className="cta-dock">
            <button
              className="btn btn--secondary"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${parsed.first.lat},${parsed.first.lon}&travelmode=driving`, '_blank', 'noopener')}
            >
              🧭 Navigáció startra
            </button>
            <button className="btn btn--primary" onClick={() => nav('/custom/play')}>
              ▶ Túra indítása
            </button>
          </div>
        </>
      )}
    </>
  )
}
