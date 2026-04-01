import React from 'react'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)
import { C, ss, todayStr, fmtDateShort } from '../constants'
import { db, loadHrvLogs, saveBodyMeasurement, loadBodyMeasurements, deleteBodyMeasurement } from '../lib/supabase'

// kept for backward compat — re-export so App.jsx import still works if needed
export { loadBodyMeasurements }

// ── METRIC DEFINITIONS ─────────────────────────────────────────────
const METRICS = [
  { id: 'weight_kg',    label: 'Peso',         unit: 'kg',  color: C.violet,  desc: 'Peso corporeo a digiuno' },
  { id: 'bicep_cm',     label: 'Bicipite',      unit: 'cm',  color: C.blue,    desc: 'Metà del bicipite, braccio rilassato' },
  { id: 'chest_cm',     label: 'Petto',         unit: 'cm',  color: C.green,   desc: 'A livello dei capezzoli' },
  { id: 'waist_cm',     label: 'Vita',          unit: 'cm',  color: C.amber,   desc: 'Punto più stretto della vita' },
  { id: 'abdomen_cm',   label: 'Addome',        unit: 'cm',  color: C.orange,  desc: 'A livello dell\'ombelico' },
  { id: 'hips_cm',      label: 'Fianchi',       unit: 'cm',  color: C.red,     desc: 'Massima estensione del gluteo' },
  { id: 'thigh_cm',     label: 'Coscia DX',     unit: 'cm',  color: C.greenLight.replace('#','') ? C.green : C.green, desc: 'Metà coscia destra' },
]

// ── MINI SPARKLINE ─────────────────────────────────────────────────
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
        scales: {
          x: { display: false },
          y: { display: false },
        },
        animation: false,
      }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [data, color])

  if (data.length < 2) return null
  return <div style={{ position: 'relative', height: '32px', width: '80px' }}><canvas ref={canvasRef} /></div>
}

// ── FULL CHART ─────────────────────────────────────────────────────
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
          x: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: '#1E1E1E' } },
          y: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: '#1E1E1E' } },
        }
      }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [measurements, metric])

  if (pts.length === 0) return <div style={{ textAlign: 'center', padding: '20px', fontSize: '11px', color: C.hint }}>Nessun dato per questa metrica</div>
  return <div style={{ position: 'relative', height: '160px' }}><canvas ref={canvasRef} /></div>
}

// ── INPUT FORM ─────────────────────────────────────────────────────
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
    if (ok) {
      setSaved(true)
      setVals({})
      onSaved()
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div style={ss.card}>
      <div style={ss.secLbl}>Nuova misurazione</div>

      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '10px', color: C.hint, marginBottom: '5px' }}>Data</div>
        <input type="date" style={ss.inp} value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        {METRICS.map(m => (
          <div key={m.id}>
            <div style={{ fontSize: '10px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: m.color, flexShrink: 0 }} />
              <span style={{ color: C.muted, fontWeight: '500' }}>{m.label}</span>
              <span style={{ color: C.hint, fontSize: '9px' }}>{m.unit}</span>
            </div>
            <input
              type="number" step="0.1"
              style={{ ...ss.inp, fontSize: '15px', fontWeight: '600', padding: '10px', textAlign: 'center' }}
              placeholder="—"
              value={vals[m.id] || ''}
              onChange={e => sv(m.id, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div
        style={{ ...ss.savBtn, opacity: (!hasAny || saving) ? 0.4 : 1, background: saved ? C.green : C.violet }}
        onClick={handleSave}>
        {saving ? 'Salvataggio...' : saved ? '✓ Salvato!' : 'Salva misurazione'}
      </div>
    </div>
  )
}

// ── OVERVIEW CARDS ─────────────────────────────────────────────────
function OverviewCards({ measurements, onSelectMetric, selectedMetric }) {
  if (measurements.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>📏</div>
        <div style={{ fontSize: '14px', color: C.muted, marginBottom: '6px' }}>Nessuna misurazione ancora</div>
        <div style={{ fontSize: '12px', color: C.hint }}>Aggiungi la prima per iniziare a tracciare il progresso.</div>
      </div>
    )
  }

  const last  = measurements[measurements.length - 1]
  const prev  = measurements.length > 1 ? measurements[measurements.length - 2] : null
  const first = measurements[0]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
      {METRICS.map(m => {
        const val     = last[m.id]
        const prevVal = prev?.[m.id]
        const firstVal = first[m.id]
        const delta   = (val != null && prevVal != null) ? (val - prevVal).toFixed(1) : null
        const totalDelta = (val != null && firstVal != null && first !== last) ? (val - firstVal).toFixed(1) : null
        const pts     = measurements.map(ms => ({ x: ms.measured_at?.slice(0,10), y: ms[m.id] })).filter(p => p.y != null)
        const isSelected = selectedMetric?.id === m.id

        if (val == null && pts.length === 0) return null

        return (
          <div
            key={m.id}
            style={{
              background: isSelected ? `${m.color}12` : C.surface,
              border: `1px solid ${isSelected ? m.color + '55' : C.border}`,
              borderRadius: '14px', padding: '12px',
              cursor: 'pointer',
              transition: 'all .15s',
            }}
            onClick={() => onSelectMetric(isSelected ? null : m)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '600', color: m.color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '2px' }}>{m.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: val != null ? C.text : C.hint, letterSpacing: '-.02em' }}>
                    {val != null ? val : '—'}
                  </div>
                  <div style={{ fontSize: '10px', color: C.muted }}>{m.unit}</div>
                </div>
              </div>
              <Sparkline data={pts} color={m.color} />
            </div>

            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {delta !== null && (
                <div style={{
                  fontSize: '10px', fontWeight: '700',
                  padding: '2px 6px', borderRadius: '999px',
                  background: getDeltaBg(m.id, parseFloat(delta)),
                  color: getDeltaColor(m.id, parseFloat(delta)),
                }}>
                  {parseFloat(delta) > 0 ? '+' : ''}{delta} vs prec.
                </div>
              )}
              {totalDelta !== null && (
                <div style={{
                  fontSize: '10px', fontWeight: '600',
                  padding: '2px 6px', borderRadius: '999px',
                  background: C.surface, color: C.hint, border: `1px solid ${C.border}`,
                }}>
                  {parseFloat(totalDelta) > 0 ? '+' : ''}{totalDelta} totale
                </div>
              )}
            </div>
          </div>
        )
      }).filter(Boolean)}
    </div>
  )
}

// Delta color logic — per peso e misure "grasso" (addome, fianchi, vita) calo = verde
function getDeltaBg(id, delta) {
  const lowerIsBetter = ['abdomen_cm', 'hips_cm', 'waist_cm', 'weight_kg']
  if (lowerIsBetter.includes(id)) {
    return delta <= 0 ? C.greenBg : C.redBg
  }
  // Per muscoli (bicipite, petto, coscia) aumento = verde
  return delta >= 0 ? C.greenBg : C.redBg
}
function getDeltaColor(id, delta) {
  const lowerIsBetter = ['abdomen_cm', 'hips_cm', 'waist_cm', 'weight_kg']
  if (lowerIsBetter.includes(id)) {
    return delta <= 0 ? C.greenLight : C.redLight
  }
  return delta >= 0 ? C.greenLight : C.redLight
}

// ── STORICO TABELLA ────────────────────────────────────────────────
function StoricoTable({ measurements, onDeleted }) {
  const [confirmDel, setConfirmDel] = React.useState(null)
  const [deleting,   setDeleting]   = React.useState(false)

  const sorted = [...measurements].reverse()

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 20px', fontSize: '13px', color: C.hint }}>
        Nessuna misurazione ancora.
      </div>
    )
  }

  return (
    <div>
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setConfirmDel(null)}>
          <div style={{ background: C.surface, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '320px', border: `1px solid ${C.redBorder}` }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: C.text, marginBottom: '8px' }}>Elimina misurazione</div>
            <div style={{ fontSize: '13px', color: C.muted, marginBottom: '20px' }}>del {fmtDateShort(confirmDel.measured_at?.slice(0,10))}?</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', background: C.bg, border: `1px solid ${C.border}`, fontSize: '13px', color: C.muted }}
                onClick={() => setConfirmDel(null)}>Annulla</div>
              <div style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', background: C.redBg, border: `1px solid ${C.redBorder}`, fontSize: '13px', fontWeight: '600', color: C.red, opacity: deleting ? 0.5 : 1 }}
                onClick={async () => {
                  setDeleting(true)
                  await deleteBodyMeasurement(confirmDel.id)
                  await onDeleted()
                  setDeleting(false); setConfirmDel(null)
                }}>
                {deleting ? '...' : 'Elimina'}
              </div>
            </div>
          </div>
        </div>
      )}

      {sorted.map((m, i) => (
        <div key={m.id || i} style={{ ...ss.card, marginBottom: '8px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: C.text }}>{fmtDateShort(m.measured_at?.slice(0,10))}</div>
            <div style={{ fontSize: '10px', color: C.red, cursor: 'pointer', opacity: 0.6 }} onClick={() => setConfirmDel(m)}>Elimina</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {METRICS.map(met => {
              const val = m[met.id]
              if (val == null) return null
              return (
                <div key={met.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: met.color }} />
                  <span style={{ fontSize: '10px', color: C.muted }}>{met.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: C.text }}>{val}</span>
                  <span style={{ fontSize: '9px', color: C.hint }}>{met.unit}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── HRV HISTORY ────────────────────────────────────────────────────
function HrvHistory() {
  const [hrvLogs, setHrvLogs] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const canvasRef = React.useRef(null)
  const chartRef  = React.useRef(null)

  React.useEffect(() => {
    loadHrvLogs().then(data => { setHrvLogs(data); setLoading(false) })
  }, [])

  const sorted = [...hrvLogs].sort((a, b) => a.log_date.localeCompare(b.log_date))
  const avg7 = sorted.length
    ? Math.round(sorted.slice(-7).reduce((s, r) => s + r.hrv_value, 0) / Math.min(sorted.length, 7))
    : null

  const getStatus = (v, avg) => {
    if (!v || !avg) return 'neutral'
    const p = v / avg
    if (p >= 0.97) return 'green'
    if (p >= 0.88) return 'yellow'
    return 'red'
  }
  const statusColor  = { green: C.green, yellow: C.amber, red: C.red, neutral: C.hint }
  const statusBg     = { green: C.greenBg, yellow: C.amberBg, red: C.redBg, neutral: C.surface }
  const statusBorder = { green: C.greenBorder, yellow: C.amberBorder, red: C.redBorder, neutral: C.border }

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
            borderColor: C.violet, backgroundColor: 'rgba(123,111,232,0.1)',
            tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2,
            pointBackgroundColor: sorted.map(r => statusColor[getStatus(r.hrv_value, avg7)]),
          },
          // Media mobile 7gg
          {
            data: sorted.map((_, i) => {
              const slice = sorted.slice(Math.max(0, i - 6), i + 1)
              return Math.round(slice.reduce((s, r) => s + r.hrv_value, 0) / slice.length)
            }),
            borderColor: C.muted, borderDash: [4, 4],
            tension: 0.35, fill: false, pointRadius: 0, borderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: '#1E1E1E' } },
          y: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: '#1E1E1E' } },
        },
      },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [hrvLogs])

  if (loading) return <div style={{ textAlign: 'center', padding: '32px', fontSize: '12px', color: C.hint }}>Caricamento...</div>

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>💓</div>
        <div style={{ fontSize: '14px', color: C.muted }}>Nessun dato HRV ancora.</div>
        <div style={{ fontSize: '12px', color: C.hint, marginTop: '8px' }}>Registra ogni mattina dalla Home.</div>
      </div>
    )
  }

  const maxHrv = Math.max(...sorted.map(r => r.hrv_value))
  const minHrv = Math.min(...sorted.map(r => r.hrv_value))
  const last   = sorted[sorted.length - 1]

  return (
    <div style={ss.body}>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {[
          { l: 'Ultimo',   v: last.hrv_value + ' ms', c: statusColor[getStatus(last.hrv_value, avg7)] },
          { l: 'Media 7gg', v: avg7 + ' ms',          c: C.violet },
          { l: 'Misurazioni', v: sorted.length,       c: C.muted },
        ].map(it => (
          <div key={it.l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: it.c }}>{it.v}</div>
            <div style={{ fontSize: '9px', color: C.hint, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: '3px' }}>{it.l}</div>
          </div>
        ))}
      </div>

      {/* Grafico */}
      {sorted.length >= 2 && (
        <div style={ss.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: `1px solid ${C.border}` }}>
            <div style={ss.secLbl}>Andamento HRV</div>
            <div style={{ fontSize: '10px', color: C.hint }}>
              <span style={{ color: C.violet }}>━</span> valore &nbsp;
              <span style={{ color: C.muted }}>╌</span> media 7gg
            </div>
          </div>
          <div style={{ position: 'relative', height: '160px' }}><canvas ref={canvasRef} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: C.hint }}>
            <span>Min: <strong style={{ color: C.text }}>{minHrv}</strong></span>
            <span>Max: <strong style={{ color: C.text }}>{maxHrv}</strong></span>
            <span>Range: <strong style={{ color: C.text }}>{maxHrv - minHrv}</strong></span>
          </div>
        </div>
      )}

      {/* Lista storica */}
      <div style={ss.card}>
        <div style={ss.secLbl}>Storico</div>
        {[...sorted].reverse().map((r, i) => {
          const s = getStatus(r.hrv_value, avg7)
          return (
            <div key={r.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '12px', color: C.muted }}>{fmtDateShort(r.log_date)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor[s] }} />
                <div style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>{r.hrv_value}</div>
                <div style={{ fontSize: '10px', color: C.hint }}>ms</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MAIN CORPO SECTION ─────────────────────────────────────────────
export default function CorpoSection() {
  const [sub,          setSub]          = React.useState('overview')
  const [measurements, setMeasurements] = React.useState([])
  const [loading,      setLoading]      = React.useState(true)
  const [selectedMetric, setSelectedMetric] = React.useState(null)

  const load = async () => {
    setLoading(true)
    const data = await loadBodyMeasurements()
    setMeasurements(data)
    setLoading(false)
  }

  React.useEffect(() => { load() }, [])

  const last = measurements.length > 0 ? measurements[measurements.length - 1] : null

  return (
    <div>
      <div style={ss.hdr}>
        <div style={ss.eyebrow}>misure · composizione</div>
        <div style={ss.title}>Corpo</div>
        <div style={ss.subtitle}>
          {last
            ? `ultimo aggiornamento: ${fmtDateShort(last.measured_at?.slice(0,10))}${last.weight_kg ? ` · ${last.weight_kg} kg` : ''}`
            : 'nessuna misurazione ancora'}
        </div>
      </div>

      <div style={ss.subBar}>
        {[
          { id: 'overview', l: 'Overview' },
          { id: 'aggiungi', l: 'Aggiungi' },
          { id: 'storico',  l: 'Storico' },
          { id: 'hrv',      l: 'HRV' },
        ].map(t => (
          <div key={t.id} style={ss.subTab(sub === t.id)} onClick={() => setSub(t.id)}>{t.l}</div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', fontSize: '12px', color: C.hint }}>Caricamento...</div>
      ) : (
        <>
          {sub === 'overview' && (
            <div style={ss.body}>
              <OverviewCards
                measurements={measurements}
                selectedMetric={selectedMetric}
                onSelectMetric={setSelectedMetric}
              />

              {/* Grafico grande per metrica selezionata */}
              {selectedMetric && (
                <div style={{ ...ss.card, marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: '600', color: selectedMetric.color, textTransform: 'uppercase', letterSpacing: '.06em' }}>{selectedMetric.label}</div>
                      <div style={{ fontSize: '11px', color: C.hint, marginTop: '1px' }}>{selectedMetric.desc}</div>
                    </div>
                    <div style={{ fontSize: '18px', color: C.hint, cursor: 'pointer', padding: '4px 8px' }} onClick={() => setSelectedMetric(null)}>✕</div>
                  </div>
                  <MetricChart measurements={measurements} metric={selectedMetric} />

                  {/* Min/Max/Avg */}
                  {(() => {
                    const vals = measurements.map(m => m[selectedMetric.id]).filter(v => v != null)
                    if (vals.length < 2) return null
                    const min = Math.min(...vals).toFixed(1)
                    const max = Math.max(...vals).toFixed(1)
                    const avg = (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)
                    return (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        {[{ l: 'Min', v: min }, { l: 'Media', v: avg }, { l: 'Max', v: max }].map(it => (
                          <div key={it.l} style={{ flex: 1, textAlign: 'center', padding: '8px', background: C.bg, borderRadius: '8px', border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: '9px', color: C.hint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '3px' }}>{it.l}</div>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: C.text }}>{it.v}</div>
                            <div style={{ fontSize: '9px', color: C.muted }}>{selectedMetric.unit}</div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}

              {measurements.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <div style={{ ...ss.savBtn, maxWidth: '200px', margin: '0 auto' }} onClick={() => setSub('aggiungi')}>
                    + Prima misurazione
                  </div>
                </div>
              )}

              {measurements.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  <div style={{ fontSize: '11px', color: C.hint, cursor: 'pointer', padding: '8px' }} onClick={() => setSub('aggiungi')}>
                    + Aggiungi misurazione
                  </div>
                </div>
              )}
            </div>
          )}

          {sub === 'aggiungi' && (
            <div style={ss.body}>
              <AddMeasurementForm onSaved={() => { load(); setSub('overview') }} />
            </div>
          )}

          {sub === 'storico' && (
            <div style={ss.body}>
              <StoricoTable measurements={measurements} onDeleted={load} />
            </div>
          )}

          {sub === 'hrv' && <HrvHistory />}
        </>
      )}
    </div>
  )
}
