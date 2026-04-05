import React from 'react'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)
import { todayStr, fmtDateShort, ss, drawer } from '../constants'
import { db, loadHrvLogs, saveHrvLog, saveBodyMeasurement, loadBodyMeasurements, deleteBodyMeasurement, updateBodyMeasurement, loadUserProfile, loadFitnessSessions } from '../lib/supabase'
import { FitnessTestForm, MetricsDetail, FitnessSessionHistory } from './FitnessBenchmark'
import { MetricheHeaderFab, MetricheTabHeader, CollapsibleHistory, MetricheFormModal } from './MetricGroupLayout'
import InsightsSection from './Insights'

export { loadBodyMeasurements }

const METRICS = [
  { id: 'weight_kg',    label: 'Peso',      unit: 'kg',  color: '#c6bfff',  desc: 'Peso corporeo a digiuno' },
  { id: 'bicep_cm',     label: 'Bicipite',  unit: 'cm',  color: '#89ceff',  desc: 'Metà del bicipite, braccio rilassato' },
  { id: 'chest_cm',     label: 'Petto',     unit: 'cm',  color: '#4ae176',  desc: 'A livello dei capezzoli' },
  { id: 'waist_cm',     label: 'Vita',      unit: 'cm',  color: '#fbbf24',  desc: 'Punto più stretto della vita' },
  { id: 'abdomen_cm',   label: 'Addome',    unit: 'cm',  color: '#fb923c',  desc: 'A livello dell\'ombelico' },
  { id: 'hips_cm',      label: 'Fianchi',   unit: 'cm',  color: '#ffb4ab',  desc: 'Massima estensione del gluteo' },
  { id: 'thigh_cm',     label: 'Coscia DX', unit: 'cm',  color: '#4ae176',  desc: 'Metà coscia destra' },
]

function Sparkline({ data, color }) {
  const canvasRef = React.useRef(null)
  const chartRef  = React.useRef(null)

  React.useEffect(() => {
    if (!canvasRef.current || data.length < 2) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map(d => d.x),
        datasets: [{
          data: data.map(d => d.y),
          borderColor: color,
          backgroundColor: `${color}18`,
          tension: 0.4, fill: true,
          pointRadius: 0, borderWidth: 1.5,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: false,
      }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [data, color])

  if (data.length < 2) return null
  return <div className="relative h-8 w-20"><canvas ref={canvasRef} /></div>
}

function MetricChart({ measurements, metric }) {
  const canvasRef = React.useRef(null)
  const chartRef  = React.useRef(null)
  const pts = measurements.map(m => ({ x: m.measured_at?.slice(0,10), y: m[metric.id] })).filter(p => p.y != null)

  React.useEffect(() => {
    if (!canvasRef.current || pts.length < 1) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: pts.map(p => p.x),
        datasets: [{
          data: pts.map(p => p.y),
          borderColor: metric.color,
          backgroundColor: `${metric.color}18`,
          tension: 0.35, fill: true,
          pointBackgroundColor: metric.color,
          pointRadius: pts.length === 1 ? 6 : 4,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true, mode: 'index', intersect: false } },
        scales: {
          x: { ticks: { color: '#928f9f', font: { size: 9 } }, grid: { color: '#353534' } },
          y: { ticks: { color: '#928f9f', font: { size: 9 } }, grid: { color: '#353534' } },
        }
      }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [measurements, metric])

  if (pts.length === 0) return <div className="text-center py-8 text-xs text-on-surface-variant">Nessun dato per questa metrica</div>
  return <div className="relative h-40"><canvas ref={canvasRef} /></div>
}

function AddMeasurementForm({ onSaved, editingEntry = null, onClose }) {
  const [date,   setDate]   = React.useState(todayStr())
  const [vals,   setVals]   = React.useState({})
  const [saving, setSaving] = React.useState(false)
  const [saved,  setSaved]  = React.useState(false)

  React.useEffect(() => {
    if (!editingEntry) {
      setDate(todayStr())
      setVals({})
      return
    }
    setDate(editingEntry.measured_at?.slice(0, 10) || todayStr())
    const next = {}
    METRICS.forEach(m => {
      const v = editingEntry[m.id]
      next[m.id] = v != null && v !== '' ? String(v) : ''
    })
    setVals(next)
  }, [editingEntry?.id])

  const sv = (id, v) => setVals(p => ({ ...p, [id]: v }))
  const hasAny = Object.values(vals).some(v => v !== '' && v != null)

  const handleSave = async () => {
    if (!hasAny || saving) return
    setSaving(true)
    const entry = {
      measured_at: date,
      ...Object.fromEntries(METRICS.map(m => [m.id, vals[m.id] ? parseFloat(vals[m.id]) : null]))
    }
    let ok = false
    if (editingEntry?.id) {
      ok = await updateBodyMeasurement(editingEntry.id, entry)
    } else {
      ok = await saveBodyMeasurement(entry)
    }
    setSaving(false)
    if (ok) {
      setSaved(true)
      setVals({})
      onSaved()
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="box-border max-w-full overflow-x-hidden bg-surface-container-low p-6 sm:rounded-xl">
      <h3 className="mb-5 text-sm font-bold uppercase tracking-widest text-on-surface">
        {editingEntry ? 'Modifica misurazione' : 'Nuova misurazione'}
      </h3>
      <div className="mb-5 min-w-0">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">Data</label>
        <input type="date" className="box-border w-full max-w-full rounded-xl border-2 border-outline-variant bg-surface-container-highest px-4 py-3 text-on-surface" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div className="mb-6 grid min-w-0 max-w-full grid-cols-2 gap-4">
        {METRICS.map(m => (
          <div key={m.id} className="min-w-0">
            <div className="mb-2 flex min-w-0 items-center gap-2">
              <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: m.color }} />
              <span className="truncate text-xs font-semibold text-on-surface-variant">{m.label}</span>
              <span className="flex-shrink-0 text-[10px] text-on-surface-variant/60">{m.unit}</span>
            </div>
            <input
              type="number" step="0.1"
              className="box-border w-full max-w-full rounded-xl border-2 border-outline-variant bg-surface-container-highest px-3 py-3 text-center text-base font-bold text-on-surface"
              placeholder="—"
              value={vals[m.id] || ''}
              onChange={e => sv(m.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={!hasAny || saving}
        className="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-40"
        style={{
          background: saved ? '#4ae176' : 'linear-gradient(135deg, #c6bfff 0%, #8c81fb 100%)',
          color: saved ? '#003915' : '#160066',
          boxShadow: saved ? '0 4px 16px rgba(74, 225, 118, 0.3)' : '0 4px 16px rgba(198, 191, 255, 0.3)'
        }}>
        {saving ? 'Salvataggio...' : saved ? '✓ Salvato!' : editingEntry ? 'Aggiorna' : 'Salva misurazione'}
      </button>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-3 py-3 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant bg-transparent">
          Annulla
        </button>
      )}
    </div>
  )
}

function OverviewCards({ measurements, onSelectMetric, selectedMetric }) {
  if (measurements.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📏</div>
        <div className="text-base text-on-surface mb-2">Nessuna misurazione ancora</div>
        <div className="text-sm text-on-surface-variant">Aggiungi la prima per iniziare a tracciare il progresso.</div>
      </div>
    )
  }

  const last  = measurements[measurements.length - 1]
  const prev  = measurements.length > 1 ? measurements[measurements.length - 2] : null
  const first = measurements[0]

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {METRICS.map(m => {
        const val      = last[m.id]
        const prevVal  = prev?.[m.id]
        const firstVal = first[m.id]
        const delta    = (val != null && prevVal != null) ? (val - prevVal).toFixed(1) : null
        const totalDelta = (val != null && firstVal != null && first !== last) ? (val - firstVal).toFixed(1) : null
        const pts      = measurements.map(ms => ({ x: ms.measured_at?.slice(0,10), y: ms[m.id] })).filter(p => p.y != null)
        const isSelected = selectedMetric?.id === m.id
        if (val == null && pts.length === 0) return null

        const getDeltaBg = (delta) => {
          const lowerIsBetter = ['abdomen_cm', 'hips_cm', 'waist_cm', 'weight_kg']
          if (lowerIsBetter.includes(m.id)) return delta <= 0 ? 'rgba(74, 225, 118, 0.1)' : 'rgba(255, 180, 171, 0.1)'
          return delta >= 0 ? 'rgba(74, 225, 118, 0.1)' : 'rgba(255, 180, 171, 0.1)'
        }

        const getDeltaColor = (delta) => {
          const lowerIsBetter = ['abdomen_cm', 'hips_cm', 'waist_cm', 'weight_kg']
          if (lowerIsBetter.includes(m.id)) return delta <= 0 ? '#4ae176' : '#ffb4ab'
          return delta >= 0 ? '#4ae176' : '#ffb4ab'
        }

        return (
          <button
            key={m.id}
            onClick={() => onSelectMetric(isSelected ? null : m)}
            className="rounded-xl p-4 transition-all text-left"
            style={{
              background: isSelected ? `${m.color}12` : '#1c1b1b',
              border: `1.5px solid ${isSelected ? m.color + '55' : '#353534'}`
            }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: m.color }}>
                  {m.label}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <div className="text-2xl font-headline font-extrabold tracking-tight text-on-surface">
                    {val != null ? val : '—'}
                  </div>
                  <div className="text-xs text-on-surface-variant">{m.unit}</div>
                </div>
              </div>
              <Sparkline data={pts} color={m.color} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {delta !== null && (
                <div className="text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{
                    background: getDeltaBg(parseFloat(delta)),
                    color: getDeltaColor(parseFloat(delta))
                  }}>
                  {parseFloat(delta) > 0 ? '+' : ''}{delta} vs prec.
                </div>
              )}
              {totalDelta !== null && (
                <div className="text-[10px] font-semibold px-2 py-1 rounded-full bg-surface-container border border-outline-variant text-on-surface-variant">
                  {parseFloat(totalDelta) > 0 ? '+' : ''}{totalDelta} totale
                </div>
              )}
            </div>
          </button>
        )
      }).filter(Boolean)}
    </div>
  )
}

function BodyStoricoList({ measurements, onDeleted, onEdit }) {
  const [confirmDel, setConfirmDel] = React.useState(null)
  const [deleting,   setDeleting]   = React.useState(false)
  const sorted = [...measurements].reverse()

  if (sorted.length === 0) {
    return <div className="text-center py-10 text-sm text-on-surface-variant">Nessuna misurazione ancora.</div>
  }

  return (
    <div>
      {confirmDel && (
        <div style={{ ...drawer.centerOverlay(80, 'rgba(0,0,0,0.85)') }} onClick={() => setConfirmDel(null)}>
          <div className="bg-surface-container rounded-xl p-6 w-full border border-error/20" style={{ ...drawer.centerCard, maxWidth: '384px' }} onClick={e => e.stopPropagation()}>
            <div className="text-base font-bold text-on-surface mb-2">Elimina misurazione</div>
            <div className="text-sm text-on-surface-variant mb-5">del {fmtDateShort(confirmDel.measured_at?.slice(0,10))}?</div>
            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-xl text-sm font-semibold text-on-surface-variant bg-surface-container-highest border border-outline-variant" onClick={() => setConfirmDel(null)}>
                Annulla
              </button>
              <button
                className="flex-1 py-3 rounded-xl text-sm font-bold text-error bg-error/10 border border-error/20 disabled:opacity-50"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  await deleteBodyMeasurement(confirmDel.id)
                  await onDeleted()
                  setDeleting(false); setConfirmDel(null)
                }}>
                {deleting ? '...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {sorted.map((m, i) => (
          <div key={m.id || i} className="bg-surface-container-highest/80 rounded-xl p-4 border border-outline-variant/10">
            <div className="flex justify-between items-center gap-2 mb-2">
              <div className="text-sm font-bold text-on-surface">{fmtDateShort(m.measured_at?.slice(0,10))}</div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Modifica"
                  onClick={() => onEdit?.(m)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 border border-primary/20">
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                <button
                  type="button"
                  aria-label="Elimina"
                  onClick={() => setConfirmDel(m)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-error/80 hover:bg-error/10 border border-error/20">
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {METRICS.map(met => {
                const val = m[met.id]
                if (val == null) return null
                return (
                  <div key={met.id} className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-lg border border-outline-variant">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: met.color }} />
                    <span className="text-xs text-on-surface-variant">{met.label}</span>
                    <span className="text-sm font-bold text-on-surface">{val}</span>
                    <span className="text-[10px] text-on-surface-variant/60">{met.unit}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HrvQuickForm({ editingRow = null, onSaved, onClose }) {
  const [date, setDate] = React.useState(editingRow?.log_date || todayStr())
  const [val, setVal] = React.useState(editingRow ? String(editingRow.hrv_value) : '')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setDate(editingRow?.log_date || todayStr())
    setVal(editingRow ? String(editingRow.hrv_value) : '')
  }, [editingRow?.id, editingRow?.log_date])

  const submit = async () => {
    const n = parseInt(val, 10)
    if (!n || n < 10 || n > 300) return
    setSaving(true)
    const ok = await saveHrvLog({ log_date: date.slice(0, 10), hrv_value: n })
    setSaving(false)
    if (ok) onSaved?.()
  }

  return (
    <div className="max-w-full min-w-0 space-y-5 overflow-x-hidden">
      <div className="min-w-0">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Data</label>
        <input
          type="date"
          disabled={!!editingRow}
          className="box-border w-full max-w-full bg-surface-container-highest border-2 border-outline-variant rounded-xl px-4 py-3 text-on-surface disabled:opacity-60"
          value={date.slice(0, 10)}
          onChange={e => setDate(e.target.value)}
        />
        {editingRow && <p className="text-[11px] text-on-surface-variant mt-1">In modifica non puoi cambiare la data del log.</p>}
      </div>
      <div className="min-w-0">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">HRV (ms)</label>
        <input
          type="number"
          inputMode="numeric"
          className="box-border w-full max-w-full bg-surface-container-highest border-2 border-outline-variant rounded-xl px-4 py-3 text-center text-xl font-bold text-on-surface"
          placeholder="es. 45"
          value={val}
          onChange={e => setVal(e.target.value)}
        />
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={submit}
        className="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider disabled:opacity-40"
        style={{
          background: 'linear-gradient(135deg, #c6bfff 0%, #8c81fb 100%)',
          color: '#160066',
          boxShadow: '0 4px 16px rgba(198, 191, 255, 0.3)',
        }}>
        {saving ? 'Salvataggio...' : editingRow ? 'Aggiorna' : 'Salva'}
      </button>
      <button type="button" onClick={onClose} className="w-full py-3 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant">
        Annulla
      </button>
    </div>
  )
}

function HrvMetricheTab({ onHrvSaved }) {
  const [hrvLogs, setHrvLogs] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingRow, setEditingRow] = React.useState(null)

  const canvasRef = React.useRef(null)
  const chartRef  = React.useRef(null)

  const load = () => loadHrvLogs().then(data => { setHrvLogs(data || []); setLoading(false) })
  React.useEffect(() => { load() }, [])

  const sorted = [...hrvLogs].sort((a, b) => a.log_date.localeCompare(b.log_date))
  const avg7   = sorted.length
    ? Math.round(sorted.slice(-7).reduce((s, r) => s + r.hrv_value, 0) / Math.min(sorted.length, 7))
    : null

  const getStatus = (v, avg) => {
    if (!v || !avg) return 'neutral'
    const p = v / avg
    if (p >= 0.97) return 'green'
    if (p >= 0.88) return 'yellow'
    return 'red'
  }

  const statusColor = { green: '#4ae176', yellow: '#fbbf24', red: '#ffb4ab', neutral: '#928f9f' }

  React.useEffect(() => {
    if (!canvasRef.current || sorted.length < 2) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: sorted.map(r => fmtDateShort(r.log_date)),
        datasets: [
          {
            data: sorted.map(r => r.hrv_value),
            borderColor: '#c6bfff', backgroundColor: 'rgba(198, 191, 255, 0.1)',
            tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2,
            pointBackgroundColor: sorted.map(r => statusColor[getStatus(r.hrv_value, avg7)]),
          },
          {
            data: sorted.map((_, i) => {
              const slice = sorted.slice(Math.max(0, i - 6), i + 1)
              return Math.round(slice.reduce((s, r) => s + r.hrv_value, 0) / slice.length)
            }),
            borderColor: '#928f9f', borderDash: [4, 4],
            tension: 0.35, fill: false, pointRadius: 0, borderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#928f9f', font: { size: 9 } }, grid: { color: '#353534' } },
          y: { ticks: { color: '#928f9f', font: { size: 9 } }, grid: { color: '#353534' } },
        },
      },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [hrvLogs])

  const openNew = () => { setEditingRow(null); setModalOpen(true) }
  const openEdit = (row) => { setEditingRow(row); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditingRow(null) }

  const last = sorted.length ? sorted[sorted.length - 1] : null
  const subtitle = last
    ? `Ultimo ${fmtDateShort(last.log_date)} · ${last.hrv_value} ms`
    : 'Variabilità cardiaca. Anche dalla Home'

  if (loading) {
    return (
      <div className="px-6 pb-6">
        <div className="text-center py-12 text-sm text-on-surface-variant">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="px-6 space-y-5 pb-6">
      <MetricheTabHeader subtitle={subtitle} onFabClick={openNew} fabAriaLabel="Nuova misurazione HRV" />

      {sorted.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-outline-variant/15 bg-surface-container-low">
          <div className="text-4xl mb-3">💓</div>
          <div className="text-sm text-on-surface-variant px-4">Nessun dato ancora. Tocca + per aggiungere o registra dalla Home.</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: 'Ultimo', v: last.hrv_value + ' ms', c: statusColor[getStatus(last.hrv_value, avg7)] },
              { l: 'Media 7gg', v: avg7 + ' ms', c: '#c6bfff' },
              { l: 'Misurazioni', v: sorted.length, c: '#928f9f' },
            ].map(it => (
              <div key={it.l} className="bg-surface-container-low rounded-xl p-4 text-center border border-outline-variant/10">
                <div className="text-xl font-headline font-extrabold tracking-tight" style={{ color: it.c }}>{it.v}</div>
                <div className="text-[10px] uppercase tracking-wider text-on-surface-variant mt-1">{it.l}</div>
              </div>
            ))}
          </div>

          {sorted.length >= 2 && (
            <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/15">
              <div className="flex justify-between items-center mb-3 pb-3 border-b border-outline-variant/10">
                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">Andamento</h3>
                <div className="text-xs text-on-surface-variant">
                  <span style={{ color: '#c6bfff' }}>━</span> valore &nbsp;
                  <span style={{ color: '#928f9f' }}>╌</span> media 7gg
                </div>
              </div>
              <div className="relative h-40"><canvas ref={canvasRef} /></div>
              <div className="flex justify-between mt-3 text-xs text-on-surface-variant">
                <span>Min: <strong className="text-on-surface">{Math.min(...sorted.map(r => r.hrv_value))}</strong></span>
                <span>Max: <strong className="text-on-surface">{Math.max(...sorted.map(r => r.hrv_value))}</strong></span>
              </div>
            </div>
          )}

          <CollapsibleHistory title="Storico" badge={sorted.length} defaultOpen>
            <div className="space-y-2 pt-2">
              {[...sorted].reverse().map((r, i) => {
                const s = getStatus(r.hrv_value, avg7)
                return (
                  <div
                    key={r.id || i}
                    className="flex items-center justify-between gap-2 py-3 px-1 border-b border-outline-variant/10 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor[s] }} />
                      <span className="text-sm text-on-surface-variant">{fmtDateShort(r.log_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-base font-bold text-on-surface tabular-nums">
                        {r.hrv_value} <span className="text-xs text-on-surface-variant font-normal">ms</span>
                      </span>
                      <button
                        type="button"
                        aria-label="Modifica"
                        onClick={() => openEdit(r)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 border border-primary/20">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CollapsibleHistory>
        </>
      )}

      {modalOpen && (
        <MetricheFormModal title={editingRow ? 'Modifica HRV' : 'Nuova misurazione HRV'} onClose={closeModal}>
          <HrvQuickForm
            key={editingRow?.id || editingRow?.log_date || 'new'}
            editingRow={editingRow}
            onClose={closeModal}
            onSaved={() => { load(); onHrvSaved?.(); closeModal() }}
          />
        </MetricheFormModal>
      )}
    </div>
  )
}

function BodyComposition({ measurements, userProfile }) {
  const last = measurements.length > 0 ? measurements[measurements.length - 1] : null

  if (!last) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📊</div>
        <div className="text-base text-on-surface mb-2">Nessun dato disponibile</div>
        <div className="text-sm text-on-surface-variant">Aggiungi misurazioni per vedere la stima della composizione corporea.</div>
      </div>
    )
  }

  const height_m = (userProfile?.height_cm || 185) / 100
  const weight = last.weight_kg
  const waist = last.waist_cm
  const abdomen = last.abdomen_cm
  const neck = userProfile?.neck_cm || 38
  const hips = last.hips_cm

  if (!weight || !abdomen || !hips) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📊</div>
        <div className="text-base text-on-surface mb-2">Dati insufficienti</div>
        <div className="text-sm text-on-surface-variant">Serve almeno: peso, addome e fianchi per la stima.</div>
      </div>
    )
  }

  const bmi = weight / (height_m * height_m)

  const bodyFatPercentage = 495 / (1.0324 - 0.19077 * Math.log10(abdomen - neck) + 0.15456 * Math.log10(height_m * 100)) - 450

  const fatMass = (bodyFatPercentage / 100) * weight
  const leanMass = weight - fatMass

  const getBmiCategory = (bmi) => {
    if (bmi < 18.5) return { label: 'Sottopeso', color: '#89ceff' }
    if (bmi < 25) return { label: 'Normopeso', color: '#4ae176' }
    if (bmi < 30) return { label: 'Sovrappeso', color: '#fbbf24' }
    return { label: 'Obesità', color: '#ffb4ab' }
  }

  const getBfCategory = (bf) => {
    if (bf < 6) return { label: 'Essenziale', color: '#89ceff' }
    if (bf < 14) return { label: 'Atleta', color: '#4ae176' }
    if (bf < 18) return { label: 'Fitness', color: '#c6bfff' }
    if (bf < 25) return { label: 'Media', color: '#fbbf24' }
    return { label: 'Elevata', color: '#ffb4ab' }
  }

  const bmiCat = getBmiCategory(bmi)
  const bfCat = getBfCategory(bodyFatPercentage)

  const metrics = [
    { label: 'BMI', value: bmi.toFixed(1), unit: '', desc: bmiCat.label, color: bmiCat.color },
    { label: 'Grasso', value: bodyFatPercentage.toFixed(1), unit: '%', desc: bfCat.label, color: bfCat.color },
    { label: 'Massa Grassa', value: fatMass.toFixed(1), unit: 'kg', desc: 'Tessuto adiposo', color: '#fb923c' },
    { label: 'Massa Magra', value: leanMass.toFixed(1), unit: 'kg', desc: 'Muscoli + ossa', color: '#4ae176' },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/20">
        <div className="text-xs text-on-surface-variant mb-3">
          ⓘ Stima basata su Navy Method (circonferenze + altezza). Margine errore ±3-4%.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {metrics.map(m => (
          <div key={m.label} className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: m.color }}>
              {m.label}
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <div className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">
                {m.value}
              </div>
              {m.unit && <div className="text-sm text-on-surface-variant">{m.unit}</div>}
            </div>
            <div className="text-xs text-on-surface-variant">{m.desc}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-low rounded-xl p-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface mb-4">Info</h3>
        <div className="space-y-3 text-xs text-on-surface-variant leading-relaxed">
          <p><strong className="text-on-surface">BMI:</strong> Rapporto peso/altezza. Indicativo, non considera la massa muscolare.</p>
          <p><strong className="text-on-surface">Grasso corporeo:</strong> Stimato con circonferenze. Per atleti può sottostimare la massa muscolare.</p>
          <p><strong className="text-on-surface">Massa magra:</strong> Include muscoli, ossa, organi e acqua.</p>
        </div>
      </div>
    </div>
  )
}

function normalizeDatiTab(id) {
  if (id === 'hrv' || id === 'testfisici' || id === 'biometria' || id === 'insights') return id
  return 'biometria'
}

export default function MetricheSection({
  initialSub,
  onSubChange,
  fitSessions = [],
  setFitSessions,
  onHrvSaved,
  hrvLogs = [],
  healthLogs = [],
  healthLogToday = null,
  trainingLogs = [],
  ascents = [],
  climbingSessions = [],
}) {
  const [sub, setSub] = React.useState(() => normalizeDatiTab(initialSub || 'biometria'))
  const [measurements, setMeasurements] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [selectedMetric, setSelectedMetric] = React.useState(null)
  const [userProfile, setUserProfile] = React.useState(null)
  const [editingFitSession, setEditingFitSession] = React.useState(null)
  const [bodyModalOpen, setBodyModalOpen] = React.useState(false)
  const [editingMeasurement, setEditingMeasurement] = React.useState(null)
  const [fitnessModalOpen, setFitnessModalOpen] = React.useState(false)

  React.useEffect(() => {
    if (initialSub == null) return
    const n = normalizeDatiTab(initialSub)
    if (n !== sub) setSub(n)
  }, [initialSub])

  React.useEffect(() => {
    if (sub !== 'testfisici') {
      setEditingFitSession(null)
      setFitnessModalOpen(false)
    }
  }, [sub])

  const refreshFitnessSessions = async () => {
    const data = await loadFitnessSessions()
    setFitSessions?.(data)
  }

  const load = async () => {
    setLoading(true)
    const [data, profile] = await Promise.all([loadBodyMeasurements(), loadUserProfile()])
    setMeasurements(data)
    setUserProfile(profile)
    setLoading(false)
  }

  React.useEffect(() => { load() }, [])

  const last = measurements.length > 0 ? measurements[measurements.length - 1] : null

  const openBodyForm = (row) => {
    setEditingMeasurement(row ?? null)
    setBodyModalOpen(true)
  }
  const closeBodyForm = () => {
    setBodyModalOpen(false)
    setEditingMeasurement(null)
  }

  const openFitnessForm = (session) => {
    setEditingFitSession(session ?? null)
    setFitnessModalOpen(true)
  }
  const closeFitnessForm = () => {
    setFitnessModalOpen(false)
    setEditingFitSession(null)
  }

  const biometriaSubtitle = last
    ? `Ultimo: ${fmtDateShort(last.measured_at?.slice(0, 10))}${last.weight_kg != null ? ` · ${last.weight_kg} kg` : ''}`
    : 'Misure corporee, grafici e composizione stimata'

  const datiEyebrow = 'salute · metriche'
  const datiPageSubtitle =
    sub === 'biometria'
      ? biometriaSubtitle
      : sub === 'hrv'
        ? 'Variabilità cardiaca e storico'
        : sub === 'testfisici'
          ? fitSessions.length
            ? `${fitSessions.length} sessioni · ultimo ${fmtDateShort(fitSessions[fitSessions.length - 1]?.session_date)}`
            : 'Mobilità, forza e resistenza — benchmark e storico qui sotto'
          : sub === 'insights'
            ? 'Correlazioni e trend dai log'
            : ''

  const selectedMetricPanel = selectedMetric && (
    <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/15">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/10">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: selectedMetric.color }}>
            {selectedMetric.label}
          </div>
          <div className="text-xs text-on-surface-variant">{selectedMetric.desc}</div>
        </div>
        <button type="button" className="text-2xl text-on-surface-variant/60 hover:text-on-surface px-2" onClick={() => setSelectedMetric(null)}>
          ✕
        </button>
      </div>
      <MetricChart measurements={measurements} metric={selectedMetric} />
      {(() => {
        const vals = measurements.map(m => m[selectedMetric.id]).filter(v => v != null)
        if (vals.length < 2) return null
        const min = Math.min(...vals).toFixed(1)
        const max = Math.max(...vals).toFixed(1)
        const avg = (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)
        return (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[{ l: 'Min', v: min }, { l: 'Media', v: avg }, { l: 'Max', v: max }].map(it => (
              <div key={it.l} className="text-center p-3 bg-surface-container-highest rounded-lg border border-outline-variant">
                <div className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">{it.l}</div>
                <div className="text-lg font-headline font-bold text-on-surface">{it.v}</div>
                <div className="text-[10px] text-on-surface-variant">{selectedMetric.unit}</div>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )

  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingBottom: '160px', maxWidth: '448px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={ss.hdr}>
        <div style={ss.eyebrow}>{datiEyebrow}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={ss.title}>Dati</div>
          {sub === 'biometria' && (
            <MetricheHeaderFab onClick={() => openBodyForm(null)} ariaLabel="Nuova misurazione" />
          )}
          {sub === 'testfisici' && (
            <MetricheHeaderFab onClick={() => openFitnessForm(null)} ariaLabel="Nuovo test" />
          )}
        </div>
        {datiPageSubtitle ? <div style={ss.subtitle}>{datiPageSubtitle}</div> : null}
      </div>

      {loading && sub === 'biometria' ? (
        <div className="text-center py-16 text-sm text-on-surface-variant">Caricamento...</div>
      ) : (
        <div>
          {sub === 'biometria' && (
            <div className="px-6 space-y-5 pb-6">
              <OverviewCards measurements={measurements} selectedMetric={selectedMetric} onSelectMetric={setSelectedMetric} />
              {selectedMetricPanel}
              <BodyComposition measurements={measurements} userProfile={userProfile} />
              <CollapsibleHistory title="Storico misurazioni" badge={measurements.length} defaultOpen>
                <BodyStoricoList
                  measurements={measurements}
                  onDeleted={load}
                  onEdit={row => openBodyForm(row)}
                />
              </CollapsibleHistory>
              {bodyModalOpen && (
                <MetricheFormModal
                  title={editingMeasurement ? 'Modifica misurazione' : 'Nuova misurazione'}
                  onClose={closeBodyForm}>
                  <AddMeasurementForm
                    editingEntry={editingMeasurement}
                    onSaved={() => { load(); closeBodyForm() }}
                    onClose={closeBodyForm}
                  />
                </MetricheFormModal>
              )}
            </div>
          )}

          {sub === 'hrv' && <HrvMetricheTab onHrvSaved={onHrvSaved} />}

          {sub === 'insights' && (
            <div className="px-6 pb-6">
              <InsightsSection
                hrvLogs={hrvLogs}
                healthLogs={healthLogs}
                healthLogToday={healthLogToday}
                fitSessions={fitSessions}
                trainingLogs={trainingLogs}
                ascents={ascents}
                sessions={climbingSessions}
              />
            </div>
          )}

          {sub === 'testfisici' && (
            <div className="px-6 space-y-5 pb-6">
              <MetricsDetail
                variant="embedded"
                fitSessions={fitSessions}
                onBack={() => {}}
                onGoToTest={() => openFitnessForm(null)}
                title="Benchmark"
              />
              <CollapsibleHistory title="Storico sessioni" badge={fitSessions.length} defaultOpen>
                <FitnessSessionHistory
                  bare
                  fitSessions={fitSessions}
                  onChanged={refreshFitnessSessions}
                  onEditSession={s => openFitnessForm(s)}
                />
              </CollapsibleHistory>
              {fitnessModalOpen && (
                <MetricheFormModal
                  title={editingFitSession ? 'Modifica test' : 'Nuovo test'}
                  onClose={closeFitnessForm}>
                  <FitnessTestForm
                    compact
                    editingSession={editingFitSession}
                    onCancelEdit={() => setEditingFitSession(null)}
                    onSaved={async () => {
                      await refreshFitnessSessions()
                      closeFitnessForm()
                    }}
                  />
                </MetricheFormModal>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
