import React from 'react'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)
import {
  C, ss, ALL_TESTS, MOB_TESTS, STR_TESTS,
  USER_HEIGHT, USER_LEG, todayStr, fmtDateShort,
} from '../constants'
import { saveFitnessSession, updateFitnessSession, deleteFitnessSession } from '../lib/supabase'
import { MetricGroupCard } from './MetricGroupLayout'

export function MetricsDetail({
  fitSessions,
  onBack,
  onGoToTest,
  backLabel = '← Indietro',
  title = 'Benchmark',
  variant = 'full',
  bottomSlot = null,
}) {
  const [selIdx, setSelIdx] = React.useState(0)
  const canvasRef = React.useRef(null)
  const chartRef  = React.useRef(null)

  const displayTests = [...MOB_TESTS, ...STR_TESTS]
  const test  = displayTests[selIdx]
  const first = fitSessions[0]
  const last  = fitSessions[fitSessions.length - 1]
  const pts   = fitSessions.map(s => ({ x: s.session_date, y: s[test.id] })).filter(p => p.y != null)

  const improvement = (first && last && first[test.id] != null && last[test.id] != null && first !== last)
    ? ((last[test.id] - first[test.id]) / Math.abs(first[test.id]) * 100).toFixed(1) : null

  React.useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    if (pts.length < 2) return
    chartRef.current = new Chart(canvasRef.current, {
      type:'line',
      data:{ labels: pts.map(p => p.x), datasets:[{ data: pts.map(p => p.y), borderColor:'#7B6FE8', backgroundColor:'rgba(123,111,232,0.12)', pointBackgroundColor:'#7B6FE8', tension:0.35, fill:true, pointRadius:5 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ x:{ ticks:{ color:'#888', font:{ size:9 } }, grid:{ color:'#1E1E1E' } }, y:{ ticks:{ color:'#888', font:{ size:9 } }, grid:{ color:'#1E1E1E' } } } },
    })
  }, [selIdx, fitSessions])

  const emptyBodyEmbedded = (
    <div style={{ textAlign:'center', padding:'24px 12px', color:C.hint, fontSize:'13px', lineHeight:1.5 }}>
      Nessun test registrato ancora.
      <div style={{ marginTop:'12px', fontSize:'12px', opacity:0.9 }}>Usa il pulsante + in alto per aggiungere una sessione.</div>
    </div>
  )

  const emptyBodyFull = (
    <div style={{ textAlign:'center', padding:'48px 20px', color:C.hint, fontSize:'13px' }}>
      Nessun test registrato ancora.
      <div style={{ marginTop:'16px' }}>
        <div style={{ ...ss.savBtn, maxWidth:'200px', margin:'0 auto', cursor:'pointer' }} onClick={onGoToTest}>Registra primo test</div>
      </div>
    </div>
  )

  if (!fitSessions.length) {
    if (variant === 'embedded') {
      return <MetricGroupCard title="Andamento">{emptyBodyEmbedded}</MetricGroupCard>
    }
    return (
      <div>
        <div className="px-6 pt-2 pb-5 border-b border-outline-variant/15">
          <button type="button" className="text-xs font-semibold text-on-surface-variant mb-3 bg-transparent border-0 p-0 cursor-pointer" onClick={onBack}>{backLabel}</button>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">{title}</h2>
        </div>
        {emptyBodyFull}
      </div>
    )
  }

  const mainBlocks = (
    <>

        {(last?.spaccata_piedi || last?.spaccata_seduti) && (
          <div style={ss.card}>
            <div style={ss.secLbl}>Spaccata vs altezza ({USER_HEIGHT} cm)</div>
            <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
              <div style={{ flex:1, background:C.greenBg, border:`1px solid ${C.greenBorder}`, borderRadius:'12px', padding:'14px' }}>
                <div style={{ fontSize:'9px', fontWeight:'600', color:C.green, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'4px' }}>In piedi</div>
                <div style={{ fontSize:'28px', fontWeight:'700', color:C.greenLight }}>{last.spaccata_piedi ? Math.round((last.spaccata_piedi / USER_HEIGHT) * 100) + '%' : '—'}</div>
                <div style={{ fontSize:'10px', color:C.green, opacity:.8, marginTop:'2px' }}>{last.spaccata_piedi ? last.spaccata_piedi + ' cm' : ''}</div>
              </div>
              <div style={{ flex:1, background:C.amberBg, border:`1px solid ${C.amberBorder}`, borderRadius:'12px', padding:'14px' }}>
                <div style={{ fontSize:'9px', fontWeight:'600', color:C.amber, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'4px' }}>Da seduti</div>
                <div style={{ fontSize:'28px', fontWeight:'700', color:C.amberLight }}>{last.spaccata_seduti ? Math.round((last.spaccata_seduti / USER_HEIGHT) * 100) + '%' : '—'}</div>
                <div style={{ fontSize:'10px', color:C.amber, opacity:.8, marginTop:'2px' }}>{last.spaccata_seduti ? last.spaccata_seduti + ' cm' : ''}</div>
              </div>
            </div>
            <div style={{ fontSize:'10px', color:C.hint }}>100% = apertura uguale all'altezza · sopra 100% ottima mobilità</div>
          </div>
        )}

        <a href="https://drive.google.com/drive/folders/1Sghs3pDiQkl2wMUqiGVb0auGAZzru21s?usp=sharing"
          target="_blank" rel="noopener noreferrer"
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'12px', background:C.violetBg, border:`1px solid ${C.violetBorder}`, borderRadius:'12px', fontSize:'12px', fontWeight:'600', color:C.violetLight, textDecoration:'none', marginBottom:'12px' }}>
          📁 Cartella Foto test →
        </a>

        <div style={ss.card}>
          <div style={ss.secLbl}>Andamento nel tempo</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'14px' }}>
            {displayTests.map((t, i) => (
              <div key={t.id} onClick={() => setSelIdx(i)}
                style={{ padding:'4px 9px', fontSize:'10px', fontWeight:'500', borderRadius:'999px', cursor:'pointer', userSelect:'none', background: selIdx === i ? C.violet : C.surface, color: selIdx === i ? '#fff' : C.muted, border:`1px solid ${selIdx === i ? C.violetBorder : C.border}` }}>
                {t.label.replace('Forza ','').replace(' frontale','').replace('massimale trazione','traz. max').replace('Resistenza tacca 20mm','Resist.').trim()}
              </div>
            ))}
          </div>
          {last?.[test.id] != null && (
            <div style={{ display:'flex', alignItems:'baseline', gap:'10px', marginBottom:'12px' }}>
              <div style={{ fontSize:'32px', fontWeight:'700', color:C.text }}>{last[test.id]}</div>
              <div style={{ fontSize:'13px', color:C.muted }}>{test.unit}</div>
              {improvement !== null && (
                <div style={{ fontSize:'11px', fontWeight:'600', padding:'3px 10px', borderRadius:'999px', background: parseFloat(improvement) >= 0 ? C.greenBg : C.redBg, color: parseFloat(improvement) >= 0 ? C.greenLight : C.redLight }}>
                  {parseFloat(improvement) >= 0 ? '+' : ''}{improvement}% dall'inizio
                </div>
              )}
            </div>
          )}
          {pts.length >= 2
            ? <div style={{ position:'relative', height:'160px' }}><canvas ref={canvasRef} /></div>
            : <div style={{ textAlign:'center', padding:'20px', fontSize:'11px', color:C.hint }}>{pts.length === 1 ? 'Serve un secondo test per il grafico' : 'Nessun dato per questa metrica'}</div>
          }
        </div>

        <div style={ss.card}>
          <div style={ss.secLbl}>Ultimo test · {last?.session_date}{last?.body_weight_kg ? ` · ${last.body_weight_kg} kg` : ''}</div>
          {[...MOB_TESTS, ...STR_TESTS].map(t => {
            const val  = last?.[t.id]
            const fval = first?.[t.id]
            const d    = (val != null && fval != null && first !== last) ? (val - fval).toFixed(1) : null
            return (
              <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:'12px', color:C.textSoft, flex:1 }}>{t.label}</div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  {d !== null && <div style={{ fontSize:'10px', fontWeight:'600', padding:'2px 7px', borderRadius:'999px', background: parseFloat(d) >= 0 ? C.greenBg : C.redBg, color: parseFloat(d) >= 0 ? C.greenLight : C.redLight }}>{parseFloat(d) >= 0 ? '+' : ''}{d}</div>}
                  <div style={{ fontSize:'14px', fontWeight:'700', color: val != null ? C.text : C.hint }}>
                    {val != null ? val : '—'}{val != null && <span style={{ fontSize:'10px', color:C.muted, marginLeft:'2px' }}>{t.unit}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {variant !== 'embedded' && (
          <div style={{ textAlign:'center', paddingTop:'4px' }}>
            <div style={{ fontSize:'11px', color:C.hint, cursor:'pointer', padding:'8px' }} onClick={onGoToTest}>+ Registra nuovo test</div>
          </div>
        )}
    </>
  )

  if (variant === 'embedded') {
    return (
      <>
        <div style={{ ...ss.body, padding: '0' }}>{mainBlocks}</div>
        {bottomSlot}
      </>
    )
  }

  return (
    <div>
      <div className="px-6 pt-2 pb-5 border-b border-outline-variant/15">
        <button type="button" className="text-xs font-semibold text-on-surface-variant mb-3 bg-transparent border-0 p-0 cursor-pointer" onClick={onBack}>{backLabel}</button>
        <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Performance · {fitSessions.length} test</p>
        <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface mb-1">{title}</h2>
        <p className="text-sm text-on-surface-variant font-medium">dal {first?.session_date} · ultimo {last?.session_date}</p>
      </div>
      <div style={ss.body}>
        {mainBlocks}
      </div>
    </div>
  )
}

function sessionSummaryChips(session) {
  const chips = []
  for (const t of [...MOB_TESTS.slice(0, 2), ...STR_TESTS.slice(0, 2)]) {
    const v = session[t.id]
    if (v != null) chips.push({ label: t.label.replace('Forza tacca 20mm ', '').slice(0, 12), val: v, unit: t.unit })
  }
  return chips.slice(0, 4)
}

export function FitnessSessionHistory({ fitSessions, onChanged, onEditSession, bare }) {
  const [confirmDel, setConfirmDel] = React.useState(null)
  const [deleting, setDeleting] = React.useState(false)
  const sorted = [...fitSessions].sort((a, b) => String(b.session_date).localeCompare(String(a.session_date)))

  if (sorted.length === 0) {
    return bare ? (
      <div className="text-center py-10 text-sm text-on-surface-variant">Nessuna sessione ancora.</div>
    ) : null
  }

  const inner = (
    <>
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6" onClick={() => setConfirmDel(null)}>
          <div className="bg-surface-container rounded-xl p-6 w-full max-w-sm border border-error/20" onClick={e => e.stopPropagation()}>
            <div className="text-base font-bold text-on-surface mb-2">Elimina test</div>
            <div className="text-sm text-on-surface-variant mb-5">
              Sessione del {fmtDateShort(confirmDel.session_date)}? L&apos;operazione non è reversibile.
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-on-surface-variant bg-surface-container-highest border border-outline-variant"
                onClick={() => setConfirmDel(null)}>
                Annulla
              </button>
              <button
                type="button"
                className="flex-1 py-3 rounded-xl text-sm font-bold text-error bg-error/10 border border-error/20 disabled:opacity-50"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  await deleteFitnessSession(confirmDel.id)
                  await onChanged?.()
                  setDeleting(false)
                  setConfirmDel(null)
                }}>
                {deleting ? '...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {sorted.map(s => {
          const chips = sessionSummaryChips(s)
          return (
            <div key={s.id} className="bg-surface-container-highest/80 rounded-xl p-4 border border-outline-variant/10">
              <div className="flex justify-between items-start gap-2 mb-2">
                <div>
                  <div className="text-sm font-bold text-on-surface">{fmtDateShort(s.session_date)}</div>
                  {s.body_weight_kg != null && (
                    <div className="text-xs text-on-surface-variant mt-0.5">{s.body_weight_kg} kg</div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    type="button"
                    aria-label="Modifica"
                    onClick={() => onEditSession?.(s)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 border border-primary/20">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Elimina"
                    onClick={() => setConfirmDel(s)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-error/80 hover:bg-error/10 border border-error/20">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
              {chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((c, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container border border-outline-variant text-on-surface-variant">
                      {c.label}: <strong className="text-on-surface">{c.val}</strong> {c.unit}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )

  if (bare) return inner
  return <MetricGroupCard title="Storico sessioni">{inner}</MetricGroupCard>
}

export function BenchmarkWidget({ fitSessions, onOpenMetrics }) {
  const [idx, setIdx] = React.useState(0)
  const canvasRef = React.useRef(null)
  const chartRef  = React.useRef(null)

  const displayTests = [...MOB_TESTS.slice(0,3), ...STR_TESTS]
  const test = displayTests[idx]

  const pts = fitSessions
    .map(s => ({ x: s.session_date, y: s[test.id] }))
    .filter(p => p.y != null)

  React.useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    if (!pts.length) return
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data:{ labels: pts.map(p => p.x), datasets:[{ data: pts.map(p => p.y), borderColor:'#7B6FE8', backgroundColor:'rgba(123,111,232,0.1)', pointBackgroundColor:'#7B6FE8', tension:0.35, fill:true, pointRadius:4 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ x:{ ticks:{ color:'#888', font:{ size:9 } }, grid:{ color:'#1E1E1E' } }, y:{ ticks:{ color:'#888', font:{ size:9 } }, grid:{ color:'#1E1E1E' } } } },
    })
  }, [idx, fitSessions])

  const last  = fitSessions.length ? fitSessions[fitSessions.length - 1] : null
  const prev  = fitSessions.length > 1 ? fitSessions[fitSessions.length - 2] : null
  const delta = last && prev && last[test.id] != null && prev[test.id] != null
    ? (last[test.id] - prev[test.id]).toFixed(1) : null

  return (
    <div style={{ ...ss.card, cursor:'pointer' }} onClick={onOpenMetrics}>
      <div style={ss.secLbl}>Benchmark · tocca per il dettaglio</div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
        <div style={{ padding:'6px 12px', color:C.muted, fontSize:'20px' }}
          onClick={e => { e.stopPropagation(); setIdx((idx - 1 + displayTests.length) % displayTests.length) }}>‹</div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'12px', fontWeight:'600', color:C.text }}>{test.label}</div>
          <div style={{ fontSize:'10px', color:C.hint, marginTop:'2px' }}>{test.unit}</div>
        </div>
        <div style={{ padding:'6px 12px', color:C.muted, fontSize:'20px' }}
          onClick={e => { e.stopPropagation(); setIdx((idx + 1) % displayTests.length) }}>›</div>
      </div>
      {last && last[test.id] != null && (
        <div style={{ display:'flex', alignItems:'baseline', gap:'8px', marginBottom:'10px', justifyContent:'center' }}>
          <div style={{ fontSize:'28px', fontWeight:'700', color:C.text }}>{last[test.id]}</div>
          <div style={{ fontSize:'12px', color:C.muted }}>{test.unit}</div>
          {delta && (
            <div style={{ fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'999px', background: parseFloat(delta) >= 0 ? C.greenBg : C.redBg, color: parseFloat(delta) >= 0 ? C.greenLight : C.redLight }}>
              {parseFloat(delta) >= 0 ? '+' : ''}{delta}
            </div>
          )}
        </div>
      )}
      {pts.length > 1
        ? <div style={{ position:'relative', height:'100px' }}><canvas ref={canvasRef} /></div>
        : <div style={{ textAlign:'center', padding:'16px', fontSize:'11px', color:C.hint }}>{pts.length === 1 ? 'Serve un secondo test per il grafico' : 'Nessun dato — registra il primo test'}</div>
      }
    </div>
  )
}

export function FitnessTestForm({ onSaved, editingSession = null, onCancelEdit, compact }) {
  const [formDate, setFormDate] = React.useState(todayStr())
  const [formPeso, setFormPeso] = React.useState('')
  const [fv,       setFv]       = React.useState({})
  const [saving,   setSaving]   = React.useState(false)
  const [savedMsg, setSavedMsg] = React.useState(false)

  React.useEffect(() => {
    if (!editingSession) return
    setFormDate(editingSession.session_date || todayStr())
    setFormPeso(editingSession.body_weight_kg != null ? String(editingSession.body_weight_kg) : '')
    const next = {}
    ALL_TESTS.forEach(t => {
      const v = editingSession[t.id]
      next[t.id] = v != null && v !== '' ? String(v) : ''
    })
    setFv(next)
  }, [editingSession?.id])

  const sv = (id, v) => setFv(p => ({ ...p, [id]: v }))
  const relPct    = () => { const p = parseFloat(formPeso), k = parseFloat(fv['trazione_kg']); return (p > 0 && !isNaN(k)) ? Math.round((k / p) * 100) : null }
  const resistSec = () => { const r = parseFloat(fv['resist_reps']); return !isNaN(r) ? Math.round(r * 10) : null }

  const salva = async () => {
    if (!formDate) return
    setSaving(true)
    const session = {
      session_date: formDate,
      height_cm: USER_HEIGHT, leg_length_cm: USER_LEG,
      body_weight_kg: formPeso ? parseFloat(formPeso) : null,
      ...Object.fromEntries(ALL_TESTS.map(t => [t.id, fv[t.id] ? parseFloat(fv[t.id]) : null])),
      trazione_pct: relPct(),
      resist_time_sec: resistSec(),
    }
    let ok = false
    if (editingSession?.id) {
      ok = await updateFitnessSession(editingSession.id, session)
    } else {
      ok = await saveFitnessSession(session)
    }
    if (ok) {
      setSavedMsg(true)
      setFv({})
      setFormPeso('')
      onCancelEdit?.()
      onSaved()
      setTimeout(() => setSavedMsg(false), 2500)
    }
    setSaving(false)
  }

  const inp = (test) => (
    <div key={test.id} style={{ marginBottom:'12px' }}>
      <div style={{ fontSize:'12px', fontWeight:'500', color:C.text, marginBottom:'2px' }}>{test.label}</div>
      <div style={{ fontSize:'10px', color:C.hint, marginBottom:'5px' }}>{test.desc} · {test.unit}</div>
      <input type="number" step="0.1" style={ss.inp} value={fv[test.id] || ''} onChange={e => sv(test.id, e.target.value)} placeholder={`— ${test.unit}`} />
    </div>
  )

  const bodyStyle = compact
    ? { padding: '0', paddingBottom: '24px', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', overflowX: 'hidden' }
    : ss.body

  return (
    <div style={bodyStyle}>
      {editingSession && !compact && (
        <div className="flex justify-between items-center mb-3 px-1">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Modifica sessione</span>
          <button
            type="button"
            className="text-xs font-semibold text-on-surface-variant"
            onClick={() => { onCancelEdit?.(); setFv({}); setFormPeso(''); setFormDate(todayStr()) }}>
            Annulla
          </button>
        </div>
      )}
      {editingSession && compact && (
        <div className="flex justify-end mb-2">
          <button
            type="button"
            className="text-xs font-semibold text-on-surface-variant"
            onClick={() => { onCancelEdit?.(); setFv({}); setFormPeso(''); setFormDate(todayStr()) }}>
            Annulla modifica
          </button>
        </div>
      )}
      <div style={ss.card}>
        <div style={ss.secLbl}>Info sessione</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px', minWidth:0 }}>
          <div style={{ minWidth:0 }}><div style={{ fontSize:'10px', color:C.hint, marginBottom:'5px' }}>Data</div><input type="date" style={{ ...ss.inp, maxWidth:'100%', boxSizing:'border-box' }} value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
          <div style={{ minWidth:0 }}><div style={{ fontSize:'10px', color:C.hint, marginBottom:'5px' }}>Peso (kg)</div><input type="number" step="0.1" style={{ ...ss.inp, maxWidth:'100%', boxSizing:'border-box' }} value={formPeso} onChange={e => setFormPeso(e.target.value)} placeholder="es. 72" /></div>
        </div>
      </div>
      <div style={ss.card}>
        <div style={ss.secLbl}>Mobilità</div>
        {MOB_TESTS.map(t => inp(t))}
      </div>
      <div style={ss.card}>
        <div style={ss.secLbl}>Forza</div>
        {STR_TESTS.slice(0, 4).map(t => inp(t))}
        <div style={{ marginBottom:'12px' }}>
          <div style={{ fontSize:'12px', fontWeight:'500', color:C.text, marginBottom:'2px' }}>Forza massimale trazione</div>
          <div style={{ fontSize:'10px', color:C.hint, marginBottom:'5px' }}>Carico aggiuntivo singola trazione · kg extra</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            <input type="number" step="0.5" style={ss.inp} value={fv['trazione_kg'] || ''} onChange={e => sv('trazione_kg', e.target.value)} placeholder="kg extra" />
            <div style={{ ...ss.inp, background:C.surface, color:C.muted, display:'flex', alignItems:'center' }}>{relPct() != null ? `${relPct()}% BW` : '% BW'}</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize:'12px', fontWeight:'500', color:C.text, marginBottom:'2px' }}>Resistenza tacca 20mm</div>
          <div style={{ fontSize:'10px', color:C.hint, marginBottom:'5px' }}>7"/3" off a cedimento — Beast</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            <input type="number" style={ss.inp} value={fv['resist_reps'] || ''} onChange={e => sv('resist_reps', e.target.value)} placeholder="n° reps" />
            <div style={{ ...ss.inp, background:C.surface, color:C.muted, display:'flex', alignItems:'center' }}>{resistSec() != null ? `${resistSec()} sec` : 'sec totali'}</div>
          </div>
        </div>
      </div>
      <div style={ss.card}>
        <div style={ss.secLbl}>Test Fotografici</div>
        <div style={{ fontSize:'11px', color:C.muted, lineHeight:'1.6', marginBottom:'14px' }}>
          Flessione braccia · Extrarotazione/Intrarotazione femore. Tracciamento tramite foto — nessun inserimento numerico necessario.
        </div>
        <a href="https://drive.google.com/drive/folders/1Sghs3pDiQkl2wMUqiGVb0auGAZzru21s?usp=sharing" target="_blank" rel="noopener noreferrer"
          style={{ display:'block', textAlign:'center', padding:'10px', background:C.violetBg, border:`1px solid ${C.violetBorder}`, borderRadius:'10px', fontSize:'12px', fontWeight:'600', color:C.violetLight, textDecoration:'none' }}>
          📁 Cartella Foto →
        </a>
      </div>
      <div style={{ ...ss.savBtn, opacity: saving ? 0.6 : 1 }} onClick={!saving ? salva : undefined}>
        {saving ? 'Salvataggio...' : editingSession ? 'Aggiorna test' : 'Salva test'}
      </div>
      {savedMsg && <div style={{ textAlign:'center', fontSize:'12px', color:C.greenLight, marginTop:'8px' }}>✓ Test salvato!</div>}
    </div>
  )
}
