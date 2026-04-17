import React from 'react'
import {
  Chart,
  LineController,
  ScatterController,
  DoughnutController,
  LineElement,
  PointElement,
  ArcElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { CollapsibleHistory } from './MetricGroupLayout'
import { TRAINING_PLAN } from '../data/trainingPlan'
import { SESSION_COLORS } from '../constants'
import { hrvSortedAsc } from '../lib/readinessCalc'
import { loadBodyMeasurements } from '../lib/supabase'

Chart.register(
  LineController,
  ScatterController,
  DoughnutController,
  LineElement,
  PointElement,
  ArcElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend
)

const GRID = '#353534'
const TICKS = '#928f9f'

const CLIMB_GRADES = [
  '4', '4+', '5', '5+', '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c', '8c+', '9a', '9a+', '9b', '9b+', '9c',
]
const GRADE_INDEX = Object.fromEntries(CLIMB_GRADES.map((g, i) => [g, i]))
CLIMB_GRADES.forEach(g => { GRADE_INDEX[g.toLowerCase()] = GRADE_INDEX[g] })

function gradeToIdx(g) {
  if (g == null) return null
  const t = String(g).trim()
  return GRADE_INDEX[t] ?? GRADE_INDEX[t.toLowerCase()] ?? null
}

function idxToGradeLabel(idx) {
  if (idx == null || !Number.isFinite(idx)) return '—'
  const i = Math.max(0, Math.min(CLIMB_GRADES.length - 1, Math.round(idx)))
  return CLIMB_GRADES[i]
}

function isoDaysAgo(days) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function fmtMonthIt(ym) {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  return new Date(y, m - 1, 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
}

function readinessForDate(dateStr, allHrv, healthByDate) {
  const hrvToday = allHrv.find(r => r.log_date === dateStr)
  const sorted = hrvSortedAsc(allHrv.filter(r => r.log_date <= dateStr))
  const hrv28 = sorted.slice(-28)
  const avgHrv = hrv28.length ? hrv28.reduce((s, r) => s + r.hrv_value, 0) / hrv28.length : null
  const hrvScore = (hrvToday && avgHrv)
    ? Math.min(Math.max((hrvToday.hrv_value / avgHrv) * 100, 40), 120)
    : null
  const h = healthByDate[dateStr]
  const sleepDeep = h?.sleep_deep
  const sleepTotal = h?.sleep_total
  const sleepScore = (sleepDeep != null && sleepTotal != null)
    ? (sleepDeep / 90 * 60) + (sleepTotal / 480 * 40)
    : null
  if (!hrvScore && !sleepScore) return null
  if (!hrvScore) return Math.round(sleepScore)
  if (!sleepScore) return Math.round(hrvScore)
  return Math.round(hrvScore * 0.55 + sleepScore * 0.45)
}

function linReg(points) {
  const n = points.length
  if (n < 2) return { m: 0, b: points[0]?.y ?? 0 }
  let sx = 0, sy = 0, sxy = 0, sxx = 0
  points.forEach(p => {
    sx += p.x; sy += p.y; sxy += p.x * p.y; sxx += p.x * p.x
  })
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1)
  const b = (sy - m * sx) / n
  return { m, b }
}

function isScaricoDate(d) {
  const e = TRAINING_PLAN.calendar.find(c => c.day_date === d)
  return e?.scarico === true
}

function ReadinessRpeChart({ points, n }) {
  const canvasRef = React.useRef(null)
  const chartRef = React.useRef(null)
  const corrNeg = React.useMemo(() => {
    if (points.length < 2) return false
    const { m } = linReg(points)
    return m < 0
  }, [points])

  React.useEffect(() => {
    if (!canvasRef.current || points.length < 2) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    const xs = points.map(p => p.x)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const { m, b } = linReg(points)
    const lineColor = corrNeg ? '#4ae176' : '#ffb4ab'
    chartRef.current = new Chart(canvasRef.current, {
      type: 'scatter',
      data: {
        datasets: [
          {
            type: 'scatter',
            label: 'sessioni',
            data: points.map(p => ({ x: p.x, y: p.y })),
            backgroundColor: '#c6bfff',
            borderColor: '#8c81fb',
            pointRadius: 5,
          },
          {
            type: 'line',
            label: 'trend',
            data: [{ x: minX, y: m * minX + b }, { x: maxX, y: m * maxX + b }],
            borderColor: lineColor,
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: TICKS }, grid: { color: GRID }, title: { display: true, text: 'Readiness', color: TICKS } },
          y: { ticks: { color: TICKS }, grid: { color: GRID }, title: { display: true, text: 'RPE', color: TICKS } },
        },
      },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [points, corrNeg])

  if (n < 3) {
    return <p className="text-xs text-on-surface-variant py-4">Servono almeno 3 sessioni con RPE e readiness per iniziare a vedere un pattern.</p>
  }
  return (
    <>
      <div className="relative h-52"><canvas ref={canvasRef} /></div>
      {n < 8 ? (
        <p className="text-xs text-on-surface-variant/80 mt-2 leading-relaxed">
          Con almeno 8 punti il trend sarà più stabile; intanto usa questo come indicazione generale.
        </p>
      ) : null}
      <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
        {corrNeg
          ? 'Il tuo readiness predice accuratamente lo sforzo percepito. Nei giorni con HRV elevato il tuo RPE è effettivamente più basso a parità di sessione. Il sistema è calibrato su di te (Esco e Flatt, 2014).'
          : 'La correlazione tra readiness e RPE non è ancora chiara sui tuoi dati. Servono più sessioni registrate per capire come il tuo corpo risponde agli indicatori di recupero.'}
      </p>
    </>
  )
}

function HrvTrend30Chart({ series }) {
  const canvasRef = React.useRef(null)
  const chartRef = React.useRef(null)

  React.useEffect(() => {
    if (!canvasRef.current || series.length < 2) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: series.map(r => r.log_date),
        datasets: [
          {
            label: 'HRV',
            data: series.map(r => r.hrv_value),
            borderColor: '#89ceff',
            backgroundColor: 'rgba(137, 206, 255, 0.12)',
            tension: 0.25,
            fill: true,
            pointRadius: 2,
            borderWidth: 2,
          },
          {
            label: 'Media 7gg',
            data: series.map(r => r.ma7),
            borderColor: '#c6bfff',
            borderDash: [5, 4],
            tension: 0.3,
            fill: false,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { color: TICKS, font: { size: 9 }, boxWidth: 10 } },
        },
        scales: {
          x: { ticks: { color: TICKS, maxRotation: 45, font: { size: 9 } }, grid: { color: GRID } },
          y: { ticks: { color: TICKS }, grid: { color: GRID }, title: { display: true, text: 'ms', color: TICKS } },
        },
      },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [series])

  if (series.length < 2) {
    return <p className="text-xs text-on-surface-variant py-4">Servono almeno 2 letture HRV negli ultimi 30 giorni.</p>
  }
  const last = series[series.length - 1]
  const prev = series[series.length - 2]
  const drop = last.ma7 != null && prev.ma7 != null && last.ma7 < prev.ma7 * 0.92
  return (
    <>
      <div className="relative h-52"><canvas ref={canvasRef} /></div>
      <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
        {drop
          ? 'La media mobile a 7 giorni sta scendendo: spesso precede fatica accumulata o stress. Valuta volume e recupero nelle prossime sessioni.'
          : 'Confronta la linea viola (trend 7 giorni) con i punti giornalieri: quando restano allineati il carico è sostenibile; divergenze forti meritano un check-in sul recupero.'}
      </p>
    </>
  )
}

function TrainingMixDonut({ rows }) {
  const canvasRef = React.useRef(null)
  const chartRef = React.useRef(null)

  React.useEffect(() => {
    if (!canvasRef.current || !rows.length) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: rows.map(r => SESSION_COLORS[r.type]?.label || r.type),
        datasets: [{
          data: rows.map(r => r.n),
          backgroundColor: rows.map(r => {
            const sc = SESSION_COLORS[r.type] || SESSION_COLORS.REST
            return sc.bg || '#353534'
          }),
          borderColor: rows.map(r => {
            const sc = SESSION_COLORS[r.type] || SESSION_COLORS.REST
            return sc.border || GRID
          }),
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: TICKS, font: { size: 10 }, boxWidth: 10, padding: 8 } },
        },
      },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [rows])

  if (!rows.length) {
    return <p className="text-xs text-on-surface-variant py-4">Nessuna sessione registrata negli ultimi 30 giorni.</p>
  }
  return (
    <>
      <div className="relative mx-auto h-52 max-w-[220px]"><canvas ref={canvasRef} /></div>
      <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
        Ogni fetta conta i giorni in cui hai loggato almeno un allenamento per quel tipo di sessione (rispetto al piano). Utile per vedere se stai saltando troppo spesso qualcosa.
      </p>
    </>
  )
}

function GradeProgressionChart({ rows }) {
  const canvasRef = React.useRef(null)
  const chartRef = React.useRef(null)

  React.useEffect(() => {
    if (!canvasRef.current || rows.length < 2) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: rows.map(r => fmtMonthIt(r.month)),
        datasets: [{
          label: 'Grado max',
          data: rows.map(r => r.idx),
          borderColor: '#89ceff',
          backgroundColor: 'rgba(137, 206, 255, 0.08)',
          tension: 0.2,
          stepped: 'before',
          fill: false,
          pointRadius: 4,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: TICKS, maxRotation: 45 }, grid: { color: GRID } },
          y: {
            ticks: {
              color: TICKS,
              callback(v) { return idxToGradeLabel(Number(v)) },
            },
            grid: { color: GRID },
            title: { display: true, text: 'A vista / flash', color: TICKS },
          },
        },
      },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [rows])

  if (rows.length < 2) {
    return <p className="text-xs text-on-surface-variant py-4">Servono almeno 2 mesi con salite a vista o in flash per vedere l'andamento.</p>
  }
  const last = rows[rows.length - 1].idx
  const prev = rows[rows.length - 2].idx
  return (
    <>
      <div className="relative h-52"><canvas ref={canvasRef} /></div>
      <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
        {last > prev
          ? `L'ultimo mese (${fmtMonthIt(rows[rows.length - 1].month)}) chiude sul massimo ${idxToGradeLabel(last)}: segnale positivo di progressione sulle vie nuove.`
          : last < prev
            ? 'Il picco mensile è sceso rispetto al mese precedente: può essere normale (rotazione vie, periodo) o segnale da monitorare se persiste.'
            : 'Grado massimo stabile sul periodo: mantieni volume e recupero bilanciati.'}
      </p>
    </>
  )
}

function PwTrendChart({ sessions, scaricoPlugin }) {
  const canvasRef = React.useRef(null)
  const chartRef = React.useRef(null)

  React.useEffect(() => {
    if (!canvasRef.current || sessions.length < 2) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    const labels = sessions.map(s => s.session_date)
    const vals = sessions.map(s => s.pw)
    const lineColor = (v) => {
      if (v < 1.3) return '#ffb4ab'
      if (v < 1.5) return '#fbbf24'
      if (v < 1.7) return '#4ae176'
      return '#89ceff'
    }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: vals,
          borderColor: '#c6bfff',
          borderWidth: 2,
          tension: 0.35,
          fill: false,
          pointBackgroundColor: vals.map(lineColor),
          pointBorderColor: vals.map(lineColor),
          pointRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: TICKS, maxRotation: 45 }, grid: { color: GRID } },
          y: { ticks: { color: TICKS }, grid: { color: GRID } },
        },
      },
      plugins: [scaricoPlugin],
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [sessions, scaricoPlugin])

  if (sessions.length < 2) {
    return <p className="text-xs text-on-surface-variant py-4">Servono almeno 2 sessioni test con tacca e peso.</p>
  }
  const last = sessions[sessions.length - 1].pw
  const prev = sessions[sessions.length - 2].pw
  const d = last - prev
  const wLast = sessions[sessions.length - 1].weight
  const wPrev = sessions[sessions.length - 2].weight
  const wDrop = wLast != null && wPrev != null && wLast < wPrev - 0.3

  let tip = 'Il Power to Weight è stabile. Con il test mensile in arrivo concentrati sul recupero completo nei giorni precedenti per esprimere la forza massimale reale.'
  if (d > 0.02) tip = 'Il Power to Weight è in crescita. La forza delle dita migliora più velocemente del peso corporeo, che è esattamente l\'adattamento cercato in questa fase (MacLeod et al., 2007).'
  else if (d < -0.02 && !wDrop) tip = 'La forza dita sta calando con peso stabile. Verifica il volume di arrampicata recente e il recupero. Uno stallo adattativo si risolve spesso con un breve periodo di scarico.'
  else if (d < -0.02 && wDrop) tip = 'Forza e peso calano insieme. Assicurati di non essere in deficit calorico eccessivo. La perdita di forza con perdita di peso rapida è un segnale di RED-S da non ignorare (Mountjoy et al., 2014).'

  return (
    <>
      <div className="relative h-52"><canvas ref={canvasRef} /></div>
      <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">{tip}</p>
    </>
  )
}

export default function InsightsSection({
  hrvLogs = [],
  healthLogs = [],
  healthLogToday: _healthLogToday,
  fitSessions = [],
  trainingLogs = [],
  ascents = [],
  sessions = [],
}) {
  const [bodyMeasurements, setBodyMeasurements] = React.useState([])

  React.useEffect(() => {
    loadBodyMeasurements().then(setBodyMeasurements)
  }, [])

  const healthByDate = React.useMemo(() => {
    const m = {}
    ;(healthLogs || []).forEach(h => { if (h.log_date) m[h.log_date] = h })
    return m
  }, [healthLogs])

  const sessionDateById = React.useMemo(() => {
    const m = {}
    ;(sessions || []).forEach(s => {
      if (s.id != null) m[String(s.id)] = s.session_date
    })
    return m
  }, [sessions])

  const readinessRpePoints = React.useMemo(() => {
    const rpeByDate = {}
    ;(trainingLogs || []).forEach(l => {
      const rpe = l.rpe_actual ?? l.rpe
      if (rpe == null || !l.log_date) return
      const cur = rpeByDate[l.log_date]
      if (cur == null || rpe > cur) rpeByDate[l.log_date] = rpe
    })
    const pts = []
    Object.entries(rpeByDate).forEach(([d, rpe]) => {
      const rd = readinessForDate(d, hrvLogs, healthByDate)
      if (rd != null) pts.push({ x: rd, y: rpe })
    })
    return pts
  }, [trainingLogs, hrvLogs, healthByDate])

  const hrv30Series = React.useMemo(() => {
    const cutoff = isoDaysAgo(30)
    const raw = hrvSortedAsc((hrvLogs || []).filter(r => r.log_date >= cutoff && r.hrv_value != null))
    const vals = raw.map(r => Number(r.hrv_value))
    const ma7 = vals.map((_, i) => {
      const slice = vals.slice(Math.max(0, i - 6), i + 1)
      return slice.reduce((a, b) => a + b, 0) / slice.length
    })
    return raw.map((r, i) => ({ log_date: r.log_date, hrv_value: vals[i], ma7: ma7[i] }))
  }, [hrvLogs])

  const trainingMix30 = React.useMemo(() => {
    const cutoff = isoDaysAgo(30)
    const seen = new Set()
    const counts = {}
    ;(trainingLogs || []).forEach(l => {
      if (!l.log_date || l.log_date < cutoff) return
      const st = l.session_type
      if (!st) return
      const key = `${l.log_date}\0${st}`
      if (seen.has(key)) return
      seen.add(key)
      counts[st] = (counts[st] || 0) + 1
    })
    return Object.entries(counts)
      .map(([type, n]) => ({ type, n }))
      .sort((a, b) => b.n - a.n)
  }, [trainingLogs])

  const gradeProgressionSeries = React.useMemo(() => {
    const styles = new Set(['a_vista', 'flash'])
    const byMonth = {}
    ;(ascents || []).forEach(a => {
      if (!a.completed || !styles.has(a.style)) return
      const sid = a.session_id != null ? String(a.session_id) : ''
      const d = sessionDateById[sid]
      if (!d) return
      const idx = gradeToIdx(a.grade)
      if (idx == null) return
      const month = d.slice(0, 7)
      byMonth[month] = Math.max(byMonth[month] ?? -1, idx)
    })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, idx]) => ({ month, idx }))
  }, [ascents, sessionDateById])

  const pwSessions = React.useMemo(() => {
    const measures = [...bodyMeasurements].sort((a, b) => String(a.measured_at).localeCompare(String(b.measured_at)))
    const nearestWeight = (dateStr) => {
      let best = null
      let bestD = Infinity
      measures.forEach(m => {
        const d0 = m.measured_at?.slice(0, 10)
        if (!d0) return
        const diff = Math.abs(new Date(d0) - new Date(dateStr))
        if (diff < bestD) { bestD = diff; best = m.weight_kg }
      })
      return best
    }
    const out = []
    ;(fitSessions || []).forEach(s => {
      const sx = s.tacca_sx
      const dx = s.tacca_dx
      if (sx == null && dx == null) return
      const tacca = sx != null && dx != null ? (sx + dx) / 2 : (sx ?? dx)
      const w = s.body_weight_kg ?? nearestWeight(s.session_date)
      if (w == null || w <= 0) return
      const pw = (tacca + w) / w
      out.push({ session_date: s.session_date, pw, weight: w })
    })
    return out.sort((a, b) => a.session_date.localeCompare(b.session_date))
  }, [fitSessions, bodyMeasurements])

  const scaricoPlugin = React.useMemo(() => ({
    id: 'scaricoBands',
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart
      if (!scales.x) return
      const labels = chart.data.labels || []
      ctx.save()
      labels.forEach((lab, i) => {
        if (!isScaricoDate(lab)) return
        const x = scales.x.getPixelForTick(i)
        const w = (scales.x.getPixelForTick(i + 1) - x) || 8
        ctx.fillStyle = 'rgba(251, 191, 36, 0.12)'
        ctx.fillRect(x - w / 2, chartArea.top, w, chartArea.bottom - chartArea.top)
      })
      ctx.restore()
    },
  }), [])

  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant leading-relaxed">
        Trend operativi (recupero, piano, progressione) e correlazioni chiave. Ogni sezione si apre per approfondire.
      </p>

      <CollapsibleHistory
        title="HRV · ultimi 30 giorni"
        badge={hrv30Series.length}
        defaultOpen={hrv30Series.length >= 4}
        className={hrv30Series.length < 2 ? 'opacity-40' : ''}>
        <HrvTrend30Chart series={hrv30Series} />
      </CollapsibleHistory>

      <CollapsibleHistory
        title="Distribuzione allenamento · 30 giorni"
        badge={trainingMix30.reduce((s, r) => s + r.n, 0)}
        defaultOpen={trainingMix30.length >= 2}
        className={trainingMix30.length === 0 ? 'opacity-40' : ''}>
        <TrainingMixDonut rows={trainingMix30} />
      </CollapsibleHistory>

      <CollapsibleHistory
        title="Progressione gradi (a vista / flash)"
        badge={gradeProgressionSeries.length}
        defaultOpen={gradeProgressionSeries.length >= 3}
        className={gradeProgressionSeries.length < 2 ? 'opacity-40' : ''}>
        <GradeProgressionChart rows={gradeProgressionSeries} />
      </CollapsibleHistory>

      <CollapsibleHistory
        title="Readiness vs RPE"
        badge={readinessRpePoints.length}
        defaultOpen={readinessRpePoints.length >= 5}
        className={readinessRpePoints.length < 3 ? 'opacity-40' : ''}>
        <ReadinessRpeChart points={readinessRpePoints} n={readinessRpePoints.length} />
      </CollapsibleHistory>

      <CollapsibleHistory
        title="Power to Weight trend"
        badge={pwSessions.length}
        defaultOpen={pwSessions.length >= 2}
        className={pwSessions.length < 2 ? 'opacity-40' : ''}>
        <PwTrendChart sessions={pwSessions} scaricoPlugin={scaricoPlugin} />
      </CollapsibleHistory>
    </div>
  )
}
