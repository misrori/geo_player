import { Link, useSearchParams } from 'react-router-dom'
import { tours, regions, tourTypes } from '../data/tours'

const DIFFICULTIES = ['Könnyű', 'Közepes', 'Közepes-nehéz', 'Nehéz']
const DISTANCES = [
  { id: 'short', name: '< 8 km', test: km => km < 8 },
  { id: 'mid', name: '8–15 km', test: km => km >= 8 && km <= 15 },
  { id: 'long', name: '> 15 km', test: km => km > 15 }
]
const REGION_KEY = 'home.region'

function storedRegion() {
  try { return localStorage.getItem(REGION_KEY) } catch { return null }
}

export default function Home() {
  // A szűrők az URL-ben vannak, így a túráról visszalépve megmaradnak.
  const [params, setParams] = useSearchParams()
  const region = regions.some(r => r.id === params.get('region'))
    ? params.get('region')
    : regions.some(r => r.id === storedRegion()) ? storedRegion() : regions[0].id
  const type = params.get('type') || ''
  const diff = params.get('diff') || ''
  const dist = params.get('dist') || ''
  const q = params.get('q') || ''

  const update = changes => {
    const next = new URLSearchParams(params)
    next.set('region', region)
    for (const [k, v] of Object.entries(changes)) v ? next.set(k, v) : next.delete(k)
    if (changes.region) try { localStorage.setItem(REGION_KEY, changes.region) } catch { /* privát mód */ }
    setParams(next, { replace: true })
  }

  const inRegion = tours.filter(t => t.region === region)
  const distTest = DISTANCES.find(d => d.id === dist)?.test
  const needle = q.trim().toLowerCase()
  const visible = inRegion.filter(t =>
    (!type || t.type === type) &&
    (!diff || t.difficulty === diff) &&
    (!distTest || distTest(t.stats.distKm)) &&
    (!needle || `${t.title} ${t.subtitle}`.toLowerCase().includes(needle))
  )
  const typesHere = tourTypes.filter(tt => inRegion.some(t => t.type === tt.id))
  const diffsHere = DIFFICULTIES.filter(d => inRegion.some(t => t.difficulty === d))
  const filtered = type || diff || dist || needle

  return (
    <>
      <header className="topbar topbar--home">
        <div className="topbar__row">
          <h1>Túra Player</h1>
          <div className="spacer" />
          <Link to="/custom" className="topbar__action" title="Saját GPX feltöltése">📂 GPX</Link>
        </div>
        <nav className="region-tabs">
          {regions.map(r => (
            <button
              key={r.id}
              className={`region-tab ${r.id === region ? 'active' : ''}`}
              onClick={() => update({ region: r.id })}
            >
              {r.name}
              <span className="region-tab__count">{tours.filter(t => t.region === r.id).length}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="filters">
        <input
          className="filters__search"
          type="search"
          placeholder="Keresés (pl. kilátó, Pilis)…"
          value={q}
          onChange={e => update({ q: e.target.value })}
        />
        {typesHere.length > 1 && (
          <div className="filters__row">
            <FilterChip active={!type} onClick={() => update({ type: '' })}>Mind</FilterChip>
            {typesHere.map(tt => (
              <FilterChip key={tt.id} active={type === tt.id} onClick={() => update({ type: type === tt.id ? '' : tt.id })}>
                {tt.icon} {tt.name}
              </FilterChip>
            ))}
          </div>
        )}
        <div className="filters__row">
          {diffsHere.map(d => (
            <FilterChip key={d} active={diff === d} onClick={() => update({ diff: diff === d ? '' : d })}>{d}</FilterChip>
          ))}
        </div>
        <div className="filters__row">
          {DISTANCES.map(d => (
            <FilterChip key={d.id} active={dist === d.id} onClick={() => update({ dist: dist === d.id ? '' : d.id })}>{d.name}</FilterChip>
          ))}
          {filtered && (
            <button className="filters__clear" onClick={() => update({ type: '', diff: '', dist: '', q: '' })}>
              Szűrők törlése
            </button>
          )}
        </div>
        <div className="filters__count">{visible.length} / {inRegion.length} túra</div>
      </div>

      <div className="list">
        {visible.map(t => (
          <Link key={t.id} to={`/tour/${t.id}`} className="card">
            <img src={t.coverImage} alt={t.title} className="card__img" loading="lazy" />
            <div className="card__body">
              <div className="card__title">{t.title}</div>
              <div className="card__subtitle">{t.subtitle}</div>
              <div className="card__meta">
                {t.type === 'bike' && <span className="chip chip--bike">🚲 Kerékpár</span>}
                <span className={`chip ${t.difficulty === 'Nehéz' ? 'chip--hard' : t.difficulty.includes('nehéz') ? 'chip--warn' : ''}`}>
                  {t.difficulty}
                </span>
                <span className="chip">{t.stats.distKm} km</span>
                <span className="chip">{t.stats.ascM} m ↑</span>
              </div>
            </div>
          </Link>
        ))}

        {visible.length === 0 && (
          <div className="empty">Nincs a szűrőknek megfelelő túra.</div>
        )}
      </div>
    </>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button className={`filter-chip ${active ? 'active' : ''}`} onClick={onClick}>{children}</button>
  )
}
