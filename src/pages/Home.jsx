import { Link } from 'react-router-dom'
import { tours } from '../data/tours'

export default function Home() {
  return (
    <>
      <header className="topbar">
        <h1>Szlovák Paradicsom Túrák</h1>
        <div className="spacer" />
      </header>

      <div className="list">
        {tours.map(t => (
          <Link key={t.id} to={`/tour/${t.id}`} className="card">
            <img src={t.coverImage} alt={t.title} className="card__img" loading="lazy" />
            <div className="card__body">
              <div className="card__title">{t.title}</div>
              <div className="card__subtitle">{t.subtitle}</div>
              <div className="card__meta">
                <span className={`chip ${t.difficulty === 'Nehéz' ? 'chip--hard' : t.difficulty.includes('nehéz') ? 'chip--warn' : ''}`}>
                  {t.difficulty}
                </span>
                <span className="chip">{t.stats.distKm} km</span>
                <span className="chip">{t.stats.ascM} m ↑</span>
              </div>
            </div>
          </Link>
        ))}

        <Link to="/custom" className="card" style={{ background: '#e3f2fd' }}>
          <div className="card__body" style={{ padding: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>📂</div>
            <div className="card__title" style={{ color: '#1565c0' }}>Saját GPX feltöltése</div>
            <div className="card__subtitle">Tölts be egy saját útvonalat és játszd le élő GPS-szel</div>
          </div>
        </Link>
      </div>
    </>
  )
}
