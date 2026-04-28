import { useMemo, useRef, useState } from 'react'
import { haversine } from '../utils/gpx'

/**
 * SVG magasságprofil.
 *  - mode: 'elev' (csak tengerszint feletti magasság)
 *          'ascent' (csak kumulatív emelkedés a starttól 0-ról)
 *          'both' (mindkettő – bal tengely magasság, jobb tengely kum. emelkedés)
 *  - Kurzoron mutatja a távot, magasságot, emelkedést és meredekséget.
 */
export default function ElevationChart({
  points,
  height = 140,
  compact = false,
  highlightM = null,
  defaultMode = 'both'
}) {
  const [cursor, setCursor] = useState(null)
  const [mode, setMode] = useState(compact ? 'elev' : defaultMode)
  const svgRef = useRef(null)

  const data = useMemo(() => {
    if (!points || points.length < 2) return null
    const cum = [0]
    const asc = [0]
    for (let i = 1; i < points.length; i++) {
      cum.push(cum[i - 1] + haversine(points[i - 1], points[i]))
      const dE = (points[i].ele ?? 0) - (points[i - 1].ele ?? 0)
      asc.push(asc[i - 1] + (dE > 0 ? dE : 0))
    }
    const eles = points.map(p => p.ele ?? 0)
    const totalDist = cum[cum.length - 1]
    let minE = Infinity, maxE = -Infinity
    for (const e of eles) { if (e < minE) minE = e; if (e > maxE) maxE = e }
    return { cum, eles, asc, totalDist, minE, maxE, totalAsc: asc[asc.length - 1] }
  }, [points])

  if (!data) return null

  const showElev = mode === 'elev' || mode === 'both'
  const showAsc = mode === 'ascent' || mode === 'both'
  const padL = 48, padR = mode === 'both' ? 48 : 12, padT = 16, padB = compact ? 18 : 26
  const W = 1000, H = height
  const plotW = W - padL - padR, plotH = H - padT - padB

  const xOf = (d) => padL + (d / data.totalDist) * plotW
  const yElev = (e) => padT + plotH - ((e - data.minE) / Math.max(1, data.maxE - data.minE)) * plotH
  const yAsc = (a) => padT + plotH - (a / Math.max(1, data.totalAsc)) * plotH

  // Path-ok építése
  const step = Math.max(1, Math.floor(data.cum.length / 400))
  const idxs = []
  for (let i = 0; i < data.cum.length; i += step) idxs.push(i)
  if (idxs[idxs.length - 1] !== data.cum.length - 1) idxs.push(data.cum.length - 1)

  const elevPath = idxs.map((i, k) =>
    `${k === 0 ? 'M' : 'L'} ${xOf(data.cum[i]).toFixed(1)} ${yElev(data.eles[i]).toFixed(1)}`
  ).join(' ')
  const elevArea = elevPath +
    ` L ${xOf(data.cum[idxs[idxs.length - 1]]).toFixed(1)} ${padT + plotH} L ${xOf(0).toFixed(1)} ${padT + plotH} Z`

  const ascPath = idxs.map((i, k) =>
    `${k === 0 ? 'M' : 'L'} ${xOf(data.cum[i]).toFixed(1)} ${yAsc(data.asc[i]).toFixed(1)}`
  ).join(' ')

  // Tengely cimkék
  const yElevTicks = compact ? [data.minE, data.maxE] : (() => {
    const steps = 4, arr = []
    for (let i = 0; i <= steps; i++) arr.push(Math.round(data.minE + (data.maxE - data.minE) * i / steps))
    return arr
  })()
  const yAscTicks = (() => {
    const steps = 4, arr = []
    for (let i = 0; i <= steps; i++) arr.push(Math.round(data.totalAsc * i / steps))
    return arr
  })()
  const xTicks = compact ? [] : (() => {
    const steps = 4, arr = []
    for (let i = 0; i <= steps; i++) arr.push(data.totalDist * i / steps)
    return arr
  })()

  const indexForX = (svgX) => {
    const d = ((svgX - padL) / plotW) * data.totalDist
    let lo = 0, hi = data.cum.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (data.cum[mid] < d) lo = mid + 1; else hi = mid
    }
    return Math.max(0, Math.min(data.cum.length - 1, lo))
  }

  const handleMove = (e) => {
    const svg = svgRef.current
    if (!svg) return
    const pt = svg.createSVGPoint()
    const touch = e.touches?.[0]
    pt.x = (touch ?? e).clientX
    pt.y = (touch ?? e).clientY
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse())
    const idx = indexForX(loc.x)
    setCursor({ idx, d: data.cum[idx], e: data.eles[idx], a: data.asc[idx] })
  }

  const highlightIdx = highlightM != null ? (() => {
    let lo = 0, hi = data.cum.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (data.cum[mid] < highlightM) lo = mid + 1; else hi = mid
    }
    return lo
  })() : null

  // Meredekség a kurzornál
  let slope = null
  if (cursor) {
    const w = 30
    let lo = cursor.idx, hi = cursor.idx
    while (lo > 0 && data.cum[cursor.idx] - data.cum[lo] < w) lo--
    while (hi < data.cum.length - 1 && data.cum[hi] - data.cum[cursor.idx] < w) hi++
    const dd = data.cum[hi] - data.cum[lo]
    const de = data.eles[hi] - data.eles[lo]
    if (dd > 0) slope = (de / dd) * 100
  }

  return (
    <div className="elev-chart">
      {!compact && (
        <div className="elev-header">
          <div className="elev-toggle">
            <button className={mode === 'elev' ? 'on' : ''} onClick={() => setMode('elev')}>Magasság</button>
            <button className={mode === 'ascent' ? 'on' : ''} onClick={() => setMode('ascent')}>Emelkedés</button>
            <button className={mode === 'both' ? 'on' : ''} onClick={() => setMode('both')}>Mindkettő</button>
          </div>
          <div className="elev-legend">
            {showElev && <span className="lg lg--elev">↕ magasság (m)</span>}
            {showAsc && <span className="lg lg--asc">↑ összesen (m)</span>}
          </div>
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        onMouseMove={handleMove}
        onMouseLeave={() => setCursor(null)}
        onTouchMove={handleMove}
        onTouchEnd={() => setCursor(null)}
        style={{ touchAction: 'none' }}
      >
        <defs>
          <linearGradient id="elevGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#66bb6a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#66bb6a" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="ascGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fb8c00" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#fb8c00" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Y grid a magassághoz (vagy emelkedéshez ha csak az van) */}
        {showElev && yElevTicks.map((v, i) => (
          <g key={`ey${i}`}>
            <line x1={padL} x2={W - padR} y1={yElev(v)} y2={yElev(v)} stroke="#e0e0e0" strokeDasharray="2,3" />
            <text x={padL - 6} y={yElev(v) + 4} fontSize="12" textAnchor="end" fill="#2e7d32" fontWeight="600">{v}</text>
          </g>
        ))}
        {!showElev && yAscTicks.map((v, i) => (
          <g key={`ay${i}`}>
            <line x1={padL} x2={W - padR} y1={yAsc(v)} y2={yAsc(v)} stroke="#e0e0e0" strokeDasharray="2,3" />
            <text x={padL - 6} y={yAsc(v) + 4} fontSize="12" textAnchor="end" fill="#e65100" fontWeight="600">{v}</text>
          </g>
        ))}
        {/* Secondary Y – csak 'both' módban */}
        {mode === 'both' && yAscTicks.map((v, i) => (
          <text key={`ay2${i}`} x={W - padR + 4} y={yAsc(v) + 4} fontSize="12" textAnchor="start" fill="#e65100" fontWeight="600">{v}</text>
        ))}
        {/* X tengely */}
        {xTicks.map((d, i) => (
          <text key={`x${i}`} x={xOf(d)} y={H - 6} fontSize="11" textAnchor="middle" fill="#888">
            {(d / 1000).toFixed(1)} km
          </text>
        ))}
        {/* Magasság area + line */}
        {showElev && <path d={elevArea} fill="url(#elevGrad)" />}
        {showElev && <path d={elevPath} fill="none" stroke="#2e7d32" strokeWidth="1.8" />}

        {/* Emelkedés vonal (narancs). 'ascent' módban area-val, 'both' módban csak vonal */}
        {showAsc && mode === 'ascent' && (
          <path d={ascPath + ` L ${xOf(data.cum[idxs[idxs.length - 1]]).toFixed(1)} ${padT + plotH} L ${xOf(0).toFixed(1)} ${padT + plotH} Z`} fill="url(#ascGrad)" />
        )}
        {showAsc && <path d={ascPath} fill="none" stroke="#fb8c00" strokeWidth="2" strokeDasharray={mode === 'both' ? '5,3' : ''} />}

        {/* Highlight (user pozíció) */}
        {highlightIdx != null && (
          <g>
            <line x1={xOf(data.cum[highlightIdx])} x2={xOf(data.cum[highlightIdx])} y1={padT} y2={padT + plotH}
                  stroke="#1976d2" strokeWidth="2" strokeDasharray="3,3" />
            {showElev && <circle cx={xOf(data.cum[highlightIdx])} cy={yElev(data.eles[highlightIdx])} r="5" fill="#1976d2" stroke="#fff" strokeWidth="2" />}
            {mode === 'ascent' && <circle cx={xOf(data.cum[highlightIdx])} cy={yAsc(data.asc[highlightIdx])} r="5" fill="#1976d2" stroke="#fff" strokeWidth="2" />}
          </g>
        )}

        {/* Kurzor */}
        {cursor && (
          <g>
            <line x1={xOf(cursor.d)} x2={xOf(cursor.d)} y1={padT} y2={padT + plotH}
                  stroke="#e91e63" strokeWidth="1.2" />
            {showElev && <circle cx={xOf(cursor.d)} cy={yElev(cursor.e)} r="4.5" fill="#2e7d32" stroke="#fff" strokeWidth="2" />}
            {showAsc && <circle cx={xOf(cursor.d)} cy={yAsc(cursor.a)} r="4.5" fill="#fb8c00" stroke="#fff" strokeWidth="2" />}
          </g>
        )}
      </svg>

      {cursor && (
        <div className="elev-tooltip">
          <span><b>{(cursor.d / 1000).toFixed(2)} km</b></span>
          {showElev && <span style={{ color: '#a5d6a7' }}>↕ <b>{Math.round(cursor.e)} m</b></span>}
          {showAsc && <span style={{ color: '#ffcc80' }}>↑ <b>{Math.round(cursor.a)} m</b></span>}
          {slope != null && (
            <span style={{ color: Math.abs(slope) > 15 ? '#ffab91' : Math.abs(slope) > 8 ? '#ffe082' : '#c5e1a5' }}>
              <b>{slope > 0 ? '↗' : '↘'} {Math.abs(slope).toFixed(1)}%</b>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
