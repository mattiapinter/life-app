import React from 'react'
import {
  Chart,
  LineController,
  ScatterController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from 'chart.js'
import { CollapsibleHistory } from './MetricGroupLayout'
import { TRAINING_PLAN } from '../data/trainingPlan'
import { hrvSortedAsc } from '../lib/readinessCalc'
import { loadBodyMeasurements } from '../lib/supabase'

Chart.register(
  LineController,
  ScatterController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
)

const GRID = '#353534'
const TICKS = '#928f9f'

const GRADE_INDEX = {
  '4': 1, '4+': 2, '5': 3, '5+': 4,
  '6a': 5, '6a+': 6, '6b': 7, '6b+': 8,
  '6c': 9, '6c+': 10, '7a': 11, '7a+': 12,
  '7b': 13, '7b+': 14, '7c': 15, '7c+': 16,
  '8a': 17, '8a+': 18, '8b': 19, '8b+': 20,
}

const FIRST_STYLES = new Set(['a_vista', 'flash', 'redpoint'])

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

function weekKeyISO(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y = t.getUTCFullYear()
  const w = Math.ceil((((t - new Date(Date.UTC(y, 0, 1))) / 86400000) + 1) / 7)
  return `${y}-W${String(w).padStart(2, '0')}`
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

  if (n < 5) {
    return <p className="text-xs text-on-surface-variant py-4">Servono almeno 5 sessioni con RPE e readiness per questo grafico.</p>
  }
  return (
    <>
      <div className="relative h-52"><canvas ref={canvasRef} /></div>
      <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
        {corrNeg
          ? 'Il tuo readiness predice accuratamente lo sforzo percepito. Nei giorni con HRV elevato il tuo RPE è effettivamente più basso a parità di sessione. Il sistema è calibrato su di te (Esco e Flatt, 2014).'
          : 'La correlazione tra readiness e RPE non è ancora chiara sui tuoi dati. Servono più sessioni registrate per capire come il tuo corpo risponde agli indicatori di recupero.'}
      </p>
    </>
  )
}

function SleepVolumeChart({ weeks }) {
  const canvasRef = React.useRef(null)
  const chartRef = React.useRef(null)
  const avgDeep = weeks.length ? weeks.reduce((s, w) => s + w.avgDeep, 0) / weeks.length : 0
  const lineOk = avgDeep >= 60

  React.useEffect(() => {
    if (!canvasRef.current || weeks.length < 2) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: weeks.map(w => w.label),
        datasets: [
          {
            type: 'bar',
            label: 'sessioni',
            data: weeks.map(w => w.sessions),
            backgroundColor: 'rgba(198, 191, 255, 0.25)',
            borderColor: '#8c81fb',
            borderWidth: 1,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: 'sonno profondo',
            data: weeks.map(w => w.avgDeep),
            borderColor: lineOk ? '#4ae176' : '#ffb4ab',
            tension: 0.3,
            yAxisID: 'y1',
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: TICKS }, grid: { color: GRID } },
          y: { position: 'left', ticks: { color: TICKS }, grid: { color: GRID }, title: { display: true, text: 'Sessioni', color: TICKS } },
          y1: { position: 'right', ticks: { color: TICKS }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Deep min', color: TICKS } },
        },
      },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [weeks, lineOk])

  if (weeks.length < 2) {
    return <p className="text-xs text-on-surface-variant py-4">Servono almeno 2 settimane di dati sonno e allenamento.</p>
  }
  return (
    <>
      <div className="relative h-52"><canvas ref={canvasRef} /></div>
      <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
        {lineOk
          ? 'Il tuo sonno profondo è nella zona ottimale per il recupero muscolare. Il rilascio di GH avviene principalmente in questa fase e supporta l\'adattamento agli stimoli allenanti (Dattilo et al., 2011).'
          : 'Il tuo sonno profondo è cronicamente sotto la soglia ottimale. Il recupero muscolare e il rilascio di GH avvengono principalmente in questa fase. Anticipa l\'orario di addormentamento di 30 minuti questa settimana (Dattilo et al., 2011).'}
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

function ReadinessGradeChart({ points, n }) {
  const canvasRef = React.useRef(null)
  const chartRef = React.useRef(null)
  const { m } = points.length >= 2 ? linReg(points) : { m: 0 }

  React.useEffect(() => {
    if (!canvasRef.current || points.length < 2) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    const xs = points.map(p => p.x)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const reg = linReg(points)
    chartRef.current = new Chart(canvasRef.current, {
      type: 'scatter',
      data: {
        datasets: [
          {
            type: 'scatter',
            data: points.map(p => ({ x: p.x, y: p.y })),
            backgroundColor: '#89ceff',
            pointRadius: 5,
          },
          {
            type: 'line',
            data: [{ x: minX, y: reg.m * minX + reg.b }, { x: maxX, y: reg.m * maxX + reg.b }],
            borderColor: m >= 0 ? '#4ae176' : '#ffb4ab',
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: TICKS }, grid: { color: GRID }, title: { display: true, text: 'Readiness', color: TICKS } },
          y: { ticks: { color: TICKS }, grid: { color: GRID }, title: { display: true, text: 'Grado idx', color: TICKS } },
        },
      },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [points, m])

  if (n < 4) {
    return <p className="text-xs text-on-surface-variant py-4">Servono almeno 4 salite con readiness e grado.</p>
  }
  return (
    <>
      <div className="relative h-52"><canvas ref={canvasRef} /></div>
      <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
        {m > 0
          ? 'Nei giorni con readiness più alto tendi a salire più forte. Continua a registrare per affinare il pattern.'
          : 'Il rapporto readiness e difficoltà delle vie varia. Più dati aiuteranno a personalizzare il carico in falesia.'}
      </p>
    </>
  )
}

function HrrTrendChart({ series }) {
  const canvasRef = React.useRef(null)
  const chartRef = React.useRef(null)
  const improving = series.length >= 4 && series[series.length - 1].hrr > series[0].hrr

  React.useEffect(() => {
    if (!canvasRef.current || series.length < 3) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    const ma4 = series.map((_, i) => {
      const slice = series.slice(Math.max(0, i - 3), i + 1)
      return Math.round(slice.reduce((s, x) => s + x.hrr, 0) / slice.length)
    })
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: series.map((_, i) => String(i + 1)),
        datasets: [
          {
            data: series.map(s => s.hrr),
            borderColor: improving ? '#4ae176' : '#ffb4ab',
            tension: 0.3,
            fill: false,
            pointRadius: 3,
          },
          {
            data: ma4,
            borderColor: '#928f9f',
            borderDash: [4, 4],
            tension: 0.3,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: TICKS }, grid: { color: GRID } },
          y: { ticks: { color: TICKS }, grid: { color: GRID }, title: { display: true, text: 'HRR bpm', color: TICKS } },
        },
      },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [series, improving])

  return (
    <>
      <div className="relative h-52"><canvas ref={canvasRef} /></div>
      <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
        {improving
          ? 'Il tuo recupero cardiovascolare post sforzo sta migliorando. Un HRR più alto a 60 secondi indica un miglioramento della capacità aerobica e della funzione vagale (Buchheit et al., 2010).'
          : 'L\'HRR è stabile o in leggero calo. Può indicare accumulo di fatica o necessità di maggiore volume aerobico. Monitora nelle prossime sessioni prima di trarre conclusioni.'}
      </p>
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

  const sleepWeeks = React.useMemo(() => {
    const trainDates = new Set((trainingLogs || []).map(l => l.log_date).filter(Boolean))
    const map = {}
    ;(healthLogs || []).forEach(h => {
      if (!h.log_date || h.sleep_deep == null) return
      const wk = weekKeyISO(h.log_date)
      if (!map[wk]) map[wk] = { deep: [], dates: new Set() }
      map[wk].deep.push(h.sleep_deep)
    })
    trainDates.forEach(d => {
      const wk = weekKeyISO(d)
      if (!map[wk]) map[wk] = { deep: [], dates: new Set() }
      map[wk].dates.add(d)
    })
    return Object.keys(map).sort().map(k => ({
      label: k.replace('-W', ' S'),
      sessions: map[k].dates.size,
      avgDeep: map[k].deep.length ? map[k].deep.reduce((a, b) => a + b, 0) / map[k].deep.length : 0,
    })).filter(w => w.avgDeep > 0 || w.sessions > 0)
  }, [healthLogs, trainingLogs])

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

  const readinessGradePoints = React.useMemo(() => {
    const pts = []
    const bySession = {}
    ;(ascents || []).forEach(a => {
      if (!FIRST_STYLES.has(a.style)) return
      const sidKey = a.session_id != null ? String(a.session_id) : ''
      const sd = sessionDateById[sidKey]
      if (!sd) return
      if (!bySession[sidKey]) bySession[sidKey] = []
      const g = String(a.grade || '').trim()
      const idx = GRADE_INDEX[g] ?? GRADE_INDEX[g.toLowerCase()]
      if (idx != null) bySession[sidKey].push(idx)
    })
    Object.entries(bySession).forEach(([sid, idxs]) => {
      const sd = sessionDateById[sid]
      if (!sd) return
      const rd = readinessForDate(sd, hrvLogs, healthByDate)
      if (rd == null) return
      pts.push({ x: rd, y: Math.max(...idxs) })
    })
    return pts
  }, [ascents, sessionDateById, hrvLogs, healthByDate])

  const hrrSeries = React.useMemo(() => {
    return (ascents || [])
      .filter(a => a.hrr_bpm != null && a.session_id != null && sessionDateById[String(a.session_id)])
      .map(a => ({ date: sessionDateById[String(a.session_id)], hrr: Number(a.hrr_bpm) }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [ascents, sessionDateById])

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

  const hrrCount = hrrSeries.length

  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant leading-relaxed">
        Correlazioni e trend dai tuoi log. Ogni sezione si apre per approfondire.
      </p>

      <CollapsibleHistory
        title="Readiness vs RPE"
        badge={readinessRpePoints.length}
        defaultOpen={readinessRpePoints.length >= 5}
        className={readinessRpePoints.length < 5 ? 'opacity-40' : ''}>
        <ReadinessRpeChart points={readinessRpePoints} n={readinessRpePoints.length} />
      </CollapsibleHistory>

      <CollapsibleHistory
        title="Sonno profondo vs volume"
        badge={sleepWeeks.length}
        defaultOpen={sleepWeeks.length >= 2}
        className={sleepWeeks.length < 2 ? 'opacity-40' : ''}>
        <SleepVolumeChart weeks={sleepWeeks} />
      </CollapsibleHistory>

      <CollapsibleHistory
        title="Power to Weight trend"
        badge={pwSessions.length}
        defaultOpen={pwSessions.length >= 2}
        className={pwSessions.length < 2 ? 'opacity-40' : ''}>
        <PwTrendChart sessions={pwSessions} scaricoPlugin={scaricoPlugin} />
      </CollapsibleHistory>

      <CollapsibleHistory
        title="Readiness vs grado arrampicata"
        badge={readinessGradePoints.length}
        defaultOpen={readinessGradePoints.length >= 4}
        className={readinessGradePoints.length < 4 ? 'opacity-40' : ''}>
        <ReadinessGradeChart points={readinessGradePoints} n={readinessGradePoints.length} />
      </CollapsibleHistory>

      <CollapsibleHistory
        title="HRR nel tempo"
        badge={hrrCount}
        defaultOpen={hrrCount >= 3}
        className={hrrCount < 3 ? 'opacity-40' : ''}>
        {hrrCount < 3 ? (
          <p className="text-xs text-on-surface-variant py-3 leading-relaxed">
            Registra l&apos;HRR in almeno 3 sessioni di arrampicata per attivare questo grafico. Trovi il campo nella schermata di salvataggio di ogni sessione.
          </p>
        ) : (
          <HrrTrendChart series={hrrSeries} />
        )}
      </CollapsibleHistory>
    </div>
  )
}
