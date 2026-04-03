import React from 'react'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)
import { todayStr, fmtDateShort } from '../constants'
import { db, loadHrvLogs, saveHrvLog, saveBodyMeasurement, loadBodyMeasurements, deleteBodyMeasurement } from '../lib/supabase'

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

function AddMeasurementForm({ onSaved }) {
  const [date,   setDate]   = React.useState(todayStr())
  const [vals,   setVals]   = React.useState({})
  const [saving, setSaving] = React.useState(false)
  const [saved,  setSaved]  = React.useState(false)

  const sv = (id, v) => setVals(p => ({ ...p, [id]: v }))
  const hasAny = Object.values(vals).some(v => v !== '' && v != null)

  const handleSave = async () => {
    if (!hasAny || saving) return
    setSaving(true)
    const entry = {
      measured_at: date,
      ...Object.fromEntries(METRICS.map(m => [m.id, vals[m.id] ? parseFloat(vals[m.id]) : null]))
    }
    const ok = await saveBodyMeasurement(entry)
    setSaving(false)
    if (ok) { setSaved(true); setVals({}); onSaved(); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <div className="bg-surface-container-low rounded-xl p-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface mb-5">Nuova Misurazione</h3>
      <div className="mb-5">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Data</label>
        <input type="date" className="w-full bg-surface-container-highest border-2 border-outline-variant rounded-xl px-4 py-3 text-on-surface" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {METRICS.map(m => (
          <div key={m.id}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
              <span className="text-xs text-on-surface-variant font-semibold">{m.label}</span>
              <span className="text-[10px] text-on-surface-variant/60">{m.unit}</span>
            </div>
            <input
              type="number" step="0.1"
              className="w-full bg-surface-container-highest border-2 border-outline-variant rounded-xl px-4 py-3 text-center text-base font-bold text-on-surface"
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
        className="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-40"
        style={{
          background: saved ? '#4ae176' : 'linear-gradient(135deg, #c6bfff 0%, #8c81fb 100%)',
          color: saved ? '#003915' : '#160066',
          boxShadow: saved ? '0 4px 16px rgba(74, 225, 118, 0.3)' : '0 4px 16px rgba(198, 191, 255, 0.3)'
        }}>
        {saving ? 'Salvataggio...' : saved ? '✓ Salvato!' : 'Salva Misurazione'}
      </button>
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

function StoricoTable({ measurements, onDeleted }) {
  const [confirmDel, setConfirmDel] = React.useState(null)
  const [deleting,   setDeleting]   = React.useState(false)
  const sorted = [...measurements].reverse()

  if (sorted.length === 0) {
    return <div className="text-center py-12 text-sm text-on-surface-variant">Nessuna misurazione ancora.</div>
  }

  return (
    <div>
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6" onClick={() => setConfirmDel(null)}>
          <div className="bg-surface-container rounded-xl p-6 w-full max-w-sm border border-error/20" onClick={e => e.stopPropagation()}>
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
      {sorted.map((m, i) => (
        <div key={m.id || i} className="bg-surface-container-low rounded-xl p-4 mb-3">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-bold text-on-surface">{fmtDateShort(m.measured_at?.slice(0,10))}</div>
            <button className="text-xs text-error/60 hover:text-error" onClick={() => setConfirmDel(m)}>
              Elimina
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {METRICS.map(met => {
              const val = m[met.id]
              if (val == null) return null
              return (
                <div key={met.id} className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-highest rounded-lg border border-outline-variant">
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
  )
}

function HrvHistory() {
  const [hrvLogs, setHrvLogs] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [editingId,  setEditingId]  = React.useState(null)
  const [editVal,    setEditVal]    = React.useState('')
  const [savingEdit, setSavingEdit] = React.useState(false)

  const canvasRef = React.useRef(null)
  const chartRef  = React.useRef(null)

  const load = () => loadHrvLogs().then(data => { setHrvLogs(data); setLoading(false) })
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

  const handleSaveEdit = async (row) => {
    const v = parseInt(editVal)
    if (!v || v < 10 || v > 300) return
    setSavingEdit(true)
    await saveHrvLog({ log_date: row.log_date, hrv_value: v })
    await load()
    setSavingEdit(false)
    setEditingId(null)
    setEditVal('')
  }

  if (loading) return <div className="text-center py-12 text-sm text-on-surface-variant">Caricamento...</div>

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">💓</div>
        <div className="text-base text-on-surface mb-2">Nessun dato HRV ancora.</div>
        <div className="text-sm text-on-surface-variant">Registra ogni mattina dalla Home.</div>
      </div>
    )
  }

  const maxHrv = Math.max(...sorted.map(r => r.hrv_value))
  const minHrv = Math.min(...sorted.map(r => r.hrv_value))
  const last   = sorted[sorted.length - 1]

  return (
    <div className="px-6 pb-32">
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { l: 'Ultimo', v: last.hrv_value + ' ms', c: statusColor[getStatus(last.hrv_value, avg7)] },
          { l: 'Media 7gg', v: avg7 + ' ms', c: '#c6bfff' },
          { l: 'Misurazioni', v: sorted.length, c: '#928f9f' },
        ].map(it => (
          <div key={it.l} className="bg-surface-container-low rounded-xl p-4 text-center">
            <div className="text-xl font-headline font-extrabold tracking-tight" style={{ color: it.c }}>{it.v}</div>
            <div className="text-[10px] uppercase tracking-wider text-on-surface-variant mt-1">{it.l}</div>
          </div>
        ))}
      </div>

      {sorted.length >= 2 && (
        <div className="bg-surface-container-low rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">Andamento HRV</h3>
            <div className="text-xs text-on-surface-variant">
              <span style={{ color: '#c6bfff' }}>━</span> valore &nbsp;
              <span style={{ color: '#928f9f' }}>╌</span> media 7gg
            </div>
          </div>
          <div className="relative h-40"><canvas ref={canvasRef} /></div>
          <div className="flex justify-between mt-3 text-xs text-on-surface-variant">
            <span>Min: <strong className="text-on-surface">{minHrv}</strong></span>
            <span>Max: <strong className="text-on-surface">{maxHrv}</strong></span>
            <span>Range: <strong className="text-on-surface">{maxHrv - minHrv}</strong></span>
          </div>
        </div>
      )}

      <div className="bg-surface-container-low rounded-xl p-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface mb-4">Storico</h3>
        {[...sorted].reverse().map((r, i) => {
          const s = getStatus(r.hrv_value, avg7)
          const isEditing = editingId === r.id

          return (
            <div key={r.id || i} className="py-3 border-b border-outline-variant/10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: statusColor[s] }} />
                  <div className="text-sm text-on-surface-variant">{fmtDateShort(r.log_date)}</div>
                </div>

                <div className="flex items-center gap-3">
                  {!isEditing && (
                    <>
                      <div className="text-base font-bold text-on-surface">
                        {r.hrv_value} <span className="text-xs text-on-surface-variant font-normal">ms</span>
                      </div>
                      <button
                        className="text-xs text-on-surface-variant/60 hover:text-on-surface px-3 py-1 rounded-lg border border-outline-variant bg-surface-container"
                        onClick={() => { setEditingId(r.id); setEditVal(String(r.hrv_value)) }}>
                        ✎
                      </button>
                    </>
                  )}

                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        autoFocus
                        className="w-20 bg-surface-container-highest border-2 border-outline-variant rounded-lg px-3 py-1 text-sm font-bold text-center text-on-surface"
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(r) }}
                      />
                      <button
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-tertiary/10 text-tertiary border border-tertiary/20 disabled:opacity-50"
                        disabled={savingEdit}
                        onClick={() => !savingEdit && handleSaveEdit(r)}>
                        {savingEdit ? '...' : '✓'}
                      </button>
                      <button
                        className="px-2 py-1 rounded-lg text-xs text-on-surface-variant bg-surface-container border border-outline-variant"
                        onClick={() => { setEditingId(null); setEditVal('') }}>
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BodyComposition({ measurements }) {
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

  const height_m = 1.77
  const weight = last.weight_kg
  const waist = last.waist_cm
  const abdomen = last.abdomen_cm
  const neck = 38
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
    <div className="px-6 pb-32">
      <div className="bg-surface-container-low rounded-xl p-5 mb-4 border border-outline-variant/20">
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

export default function MetricheSection() {
  const [sub,            setSub]            = React.useState('overview')
  const [measurements,   setMeasurements]   = React.useState([])
  const [loading,        setLoading]        = React.useState(true)
  const [selectedMetric, setSelectedMetric] = React.useState(null)

  const load = async () => {
    setLoading(true)
    const data = await loadBodyMeasurements()
    setMeasurements(data)
    setLoading(false)
  }

  React.useEffect(() => { load() }, [])

  const last = measurements.length > 0 ? measurements[measurements.length - 1] : null

  const tabs = [
    { id: 'overview', l: 'Overview' },
    { id: 'hrv',      l: 'HRV' },
    { id: 'misure',   l: 'Misure' },
    { id: 'composizione', l: 'Composizione' },
    { id: 'aggiungi', l: 'Aggiungi' },
    { id: 'storico',  l: 'Storico' },
  ]

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-6 pt-6 pb-8">
        <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          Salute · Biometria
        </p>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface mb-1">
          Metriche
        </h1>
        <p className="text-on-surface-variant font-medium">
          {last
            ? `ultimo aggiornamento: ${fmtDateShort(last.measured_at?.slice(0,10))}${last.weight_kg ? ` · ${last.weight_kg} kg` : ''}`
            : 'nessuna misurazione ancora'}
        </p>
      </div>

      <div className="flex gap-2 px-6 mb-6 overflow-x-auto hide-scrollbar">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
              sub === t.id
                ? 'bg-primary/10 text-primary border-2 border-primary/20'
                : 'bg-surface-container-low text-on-surface-variant border-2 border-outline-variant/10'
            }`}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm text-on-surface-variant">Caricamento...</div>
      ) : (
        <div>
          {sub === 'overview' && (
            <div className="px-6">
              <OverviewCards measurements={measurements} selectedMetric={selectedMetric} onSelectMetric={setSelectedMetric} />
              {selectedMetric && (
                <div className="bg-surface-container-low rounded-xl p-6 mb-4">
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/10">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: selectedMetric.color }}>
                        {selectedMetric.label}
                      </div>
                      <div className="text-xs text-on-surface-variant">{selectedMetric.desc}</div>
                    </div>
                    <button className="text-2xl text-on-surface-variant/60 hover:text-on-surface px-2" onClick={() => setSelectedMetric(null)}>
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
              )}
              {measurements.length === 0 && (
                <div className="text-center mt-4">
                  <button
                    className="px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest kinetic-gradient text-on-primary-fixed"
                    style={{ boxShadow: '0 4px 16px rgba(198, 191, 255, 0.3)' }}
                    onClick={() => setSub('aggiungi')}>
                    + Prima Misurazione
                  </button>
                </div>
              )}
              {measurements.length > 0 && (
                <div className="text-center mt-2">
                  <button className="text-xs text-primary/80 hover:text-primary py-3" onClick={() => setSub('aggiungi')}>
                    + Aggiungi misurazione
                  </button>
                </div>
              )}
            </div>
          )}
          {sub === 'hrv' && <HrvHistory />}
          {sub === 'misure' && (
            <div className="px-6">
              <OverviewCards measurements={measurements} selectedMetric={selectedMetric} onSelectMetric={setSelectedMetric} />
              {selectedMetric && (
                <div className="bg-surface-container-low rounded-xl p-6 mb-4">
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/10">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: selectedMetric.color }}>
                        {selectedMetric.label}
                      </div>
                      <div className="text-xs text-on-surface-variant">{selectedMetric.desc}</div>
                    </div>
                    <button className="text-2xl text-on-surface-variant/60 hover:text-on-surface px-2" onClick={() => setSelectedMetric(null)}>
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
              )}
            </div>
          )}
          {sub === 'composizione' && <BodyComposition measurements={measurements} />}
          {sub === 'aggiungi' && (
            <div className="px-6">
              <AddMeasurementForm onSaved={() => { load(); setSub('overview') }} />
            </div>
          )}
          {sub === 'storico' && (
            <div className="px-6">
              <StoricoTable measurements={measurements} onDeleted={load} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
