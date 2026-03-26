import React from 'react'
import { Chart, LineController, BarController, LineElement, BarElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'
Chart.register(LineController, BarController, LineElement, BarElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)
import {
  C, ss, SESSION_COLORS, ALL_TESTS, MOB_TESTS, STR_TESTS, PHOTO_TESTS,
  USER_HEIGHT, USER_LEG, todayStr, fmtDate, fmtDateShort, fmtDayName,
} from '../constants'
import { TRAINING_PLAN, getTodayCalEntry } from '../data/trainingPlan'
import { saveTrainingLog, loadTrainingLogs, saveFitnessSession, loadFitnessSessions, saveSessionNote } from '../lib/supabase'
import { IcoInfo, IcoChev, IcoChevL, IcoPlay } from './Icons'
import { Modal, CoachNoteModal, VideoButton, ChangeSessionDrawer } from './UI'

// ── SESSION DETAIL ─────────────────────────────────────────────────
function SessionDetail({ entry, onBack, trainingLogs, onLogsChanged, videos, onVideosChange }) {
  const [showCoach,    setShowCoach]    = React.useState(false)
  const [showWarmup,   setShowWarmup]   = React.useState(false)
  const [showCooldown, setShowCooldown] = React.useState(false)
  const [showChange,   setShowChange]   = React.useState(false)
  const [logForm,      setLogForm]      = React.useState({})
  const [sessionNote,  setSessionNote]  = React.useState('')
  const [saving,       setSaving]       = React.useState(false)
  const [savedMsg,     setSavedMsg]     = React.useState(false)
  const [overrideType, setOverrideType] = React.useState(null)

  const sessionType = overrideType || entry.session_type
  const sc    = SESSION_COLORS[sessionType] || SESSION_COLORS.REST
  const coachNote = TRAINING_PLAN.coach_notes.sessions[sessionType]
  const week  = entry.week
  const needsWarmup2 = ['PLACCA_VERTICALE','STRAPIOMBO','DAY_PROJECT','STRAPIOMBO_TRAZIONI_SETT4'].includes(sessionType)
  const warmupData   = needsWarmup2 ? TRAINING_PLAN.warmup_2 : TRAINING_PLAN.warmup_1

  const saveLog = async (exerciseName, sets, reps, weight, rpe) => {
    setSaving(true)
    const log = {
      log_date: entry.day_date,
      session_type: sessionType,
      exercise_name: exerciseName,
      sets_done: sets ? parseInt(sets) : null,
      reps_done: reps ? parseInt(reps) : null,
      weight_kg: weight ? parseFloat(weight) : null,
      rpe_actual: rpe ? parseInt(rpe) : null,
      created_at: new Date().toISOString(),
    }
    await saveTrainingLog(log)
    onLogsChanged()
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
    setSaving(false)
  }

  const saveNote = async () => {
    if (!sessionNote.trim()) return
    await saveSessionNote({ note_date: entry.day_date, session_type: sessionType, note_text: sessionNote, created_at: new Date().toISOString() })
    setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000)
  }

  // ── Warmup exercises row
  const WarmupRow = ({ ex }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'12px', fontWeight:'500', color:C.text }}>{ex.name}</div>
        {ex.note && <div style={{ fontSize:'10px', color:C.hint, marginTop:'1px' }}>{ex.note}</div>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginLeft:'8px' }}>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:'11px', color:C.muted }}>
            {ex.sets && `${ex.sets}×`}{ex.duration || (ex.reps && (typeof ex.reps === 'number' ? `${ex.reps} reps` : ex.reps))}
          </div>
          {ex.load && <div style={{ fontSize:'10px', color:C.violet }}>{ex.load}</div>}
          {ex.protocol && <div style={{ fontSize:'10px', color:C.violet }}>{ex.protocol}</div>}
        </div>
        <VideoButton exerciseName={ex.name} videos={videos} onVideosChange={onVideosChange} />
      </div>
    </div>
  )

  // ── PESI circuit 2 row
  const PesiRow = ({ ex }) => {
    const wd  = ex.weeks.find(w => w.week === week) || ex.weeks[0]
    const key = `pesi_${ex.name}`
    const lastLog = trainingLogs.find(l => l.exercise_name === ex.name && l.session_type === 'PESI')

    return (
      <div style={{ marginBottom:'14px', paddingBottom:'14px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ fontSize:'13px', fontWeight:'600', color:C.text }}>{ex.name}</div>
              <VideoButton exerciseName={ex.name} videos={videos} onVideosChange={onVideosChange} />
            </div>
            <div style={{ fontSize:'10px', color:C.hint, marginTop:'3px' }}>
              Tempo {ex.tempo} · {wd.sets} × {wd.reps} reps{wd.rpe ? ` · RPE ${wd.rpe}` : ''}
            </div>
          </div>
          {lastLog && !ex.bodyweight && (
            <div style={{ fontSize:'10px', color:C.violet, background:C.violetBg, padding:'3px 8px', borderRadius:'6px', border:`1px solid ${C.violetBorder}`, whiteSpace:'nowrap', marginLeft:'8px' }}>
              ultimo: {lastLog.weight_kg}kg
            </div>
          )}
        </div>

        {ex.bodyweight ? (
          // body weight — only reps
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
            <input type="number" style={{ ...ss.inp, fontSize:'12px', padding:'8px 10px' }} placeholder="Reps fatte"
              value={logForm[key + '_reps'] || ''} onChange={e => setLogForm(p => ({ ...p, [key + '_reps']: e.target.value }))} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', background:C.surface, border:`1px solid ${C.border}`, borderRadius:'8px', fontSize:'12px', color:C.hint, cursor:'pointer' }}
              onClick={() => saveLog(ex.name, wd.sets, logForm[key + '_reps'], null, wd.rpe)}>
              {saving ? '…' : '✓ Salva'}
            </div>
          </div>
        ) : (
          // weighted — peso + reps
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 80px', gap:'6px' }}>
            <input type="number" step="0.5" style={{ ...ss.inp, fontSize:'12px', padding:'8px 10px' }} placeholder="Peso kg"
              value={logForm[key + '_kg'] || ''} onChange={e => setLogForm(p => ({ ...p, [key + '_kg']: e.target.value }))} />
            <input type="number" style={{ ...ss.inp, fontSize:'12px', padding:'8px 10px' }} placeholder="Reps"
              value={logForm[key + '_reps'] || ''} onChange={e => setLogForm(p => ({ ...p, [key + '_reps']: e.target.value }))} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', background:C.surface, border:`1px solid ${C.border}`, borderRadius:'8px', fontSize:'12px', color:C.hint, cursor:'pointer' }}
              onClick={() => saveLog(ex.name, wd.sets, logForm[key + '_reps'], logForm[key + '_kg'], wd.rpe)}>
              {saving ? '…' : '✓'}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderPESI = () => (
    <div>
      <div style={ss.card}>
        <div style={ss.secLbl}>Circuito 1 — Mobilità / Attivazione</div>
        <div style={{ fontSize:'10px', color:C.hint, marginBottom:'10px' }}>Uguale per tutte le settimane</div>
        {TRAINING_PLAN.sessions.PESI.circuit_1.map((ex, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize:'12px', color:C.text, fontWeight:'500' }}>{ex.name}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ fontSize:'11px', color:C.muted }}>{ex.sets && `${ex.sets}×`}{ex.duration || (ex.reps && `${ex.reps} reps`)}</div>
              <VideoButton exerciseName={ex.name} videos={videos} onVideosChange={onVideosChange} />
            </div>
          </div>
        ))}
      </div>
      <div style={ss.card}>
        <div style={ss.secLbl}>Circuito 2 · Settimana {week}</div>
        <div style={{ fontSize:'10px', color:C.hint, marginBottom:'12px' }}>Recupero 20s tra esercizi · 3 min a fine giro</div>
        {TRAINING_PLAN.sessions.PESI.circuit_2.map((ex, i) => <PesiRow key={i} ex={ex} />)}
      </div>
    </div>
  )

  const renderPALESTRA = () => {
    const blk  = TRAINING_PLAN.sessions.PALESTRA.blocks_working.find(b => b.week === week) || TRAINING_PLAN.sessions.PALESTRA.blocks_working[0]
    const emom = TRAINING_PLAN.sessions.PALESTRA.pullups_emom.find(b => b.week === week) || TRAINING_PLAN.sessions.PALESTRA.pullups_emom[0]
    return (
      <div>
        <div style={ss.card}>
          <div style={ss.secLbl}>Blocchi di Riscaldamento</div>
          <div style={{ fontSize:'12px', color:C.textSoft, lineHeight:'1.6' }}>4-5 blocchi singoli · RPE 4→8 · recupero completo. Devi sentirti fresco e pronto prima di iniziare i blocchi ripetuti.</div>
        </div>
        <div style={ss.card}>
          <div style={ss.secLbl}>Blocchi Ripetuti · Settimana {week}</div>
          <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
            {[{ l:'Serie', v: blk.sets }, { l:'Rip/serie', v: `${blk.reps}×` }, { l:'Recupero', v: `${blk.rest_min} min` }].map(it => (
              <div key={it.l} style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                <div style={{ fontSize:'9px', color:C.hint, fontWeight:'600', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'4px' }}>{it.l}</div>
                <div style={{ fontSize:'18px', fontWeight:'700', color:C.text }}>{it.v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:'11px', color:C.muted, lineHeight:'1.6', background:C.bg, padding:'10px', borderRadius:'8px', border:`1px solid ${C.border}` }}>
            Flash con media fatica → ripeti {blk.reps} volte → devi cadere all'ultima.
          </div>
        </div>
        <div style={ss.card}>
          <div style={ss.secLbl}>EMOM Trazioni · Settimana {week}</div>
          <div style={{ display:'flex', gap:'8px' }}>
            {[{ l:'Durata', v:`${emom.duration_min} min` }, { l:'Reps/min', v:`${emom.reps} reps` }].map(it => (
              <div key={it.l} style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                <div style={{ fontSize:'9px', color:C.hint, fontWeight:'600', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'4px' }}>{it.l}</div>
                <div style={{ fontSize:'18px', fontWeight:'700', color:C.text }}>{it.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderCORSA = () => {
    const wd = TRAINING_PLAN.sessions.CORSA.weeks.find(w => w.week === week) || TRAINING_PLAN.sessions.CORSA.weeks[0]
    return (
      <div style={ss.card}>
        <div style={ss.secLbl}>Easy Run · Settimana {week}</div>
        <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
          {[{ l:'Durata', v:`${wd.duration_min} min` }, { l:'Zona', v: wd.zone }].map(it => (
            <div key={it.l} style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:'9px', color:C.hint, fontWeight:'600', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'4px' }}>{it.l}</div>
              <div style={{ fontSize:'22px', fontWeight:'700', color:C.orangeLight }}>{it.v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:'11px', color:C.muted, lineHeight:'1.6', background:C.bg, padding:'10px', borderRadius:'8px', border:`1px solid ${C.border}` }}>
          Test della chiacchiera: devi poter parlare senza affanno. Quando finisci devi sentirti rinvigorito, non stanco.
        </div>
      </div>
    )
  }

  const renderROCCIA = (tipo) => {
    const sd = TRAINING_PLAN.sessions[tipo] || TRAINING_PLAN.sessions.STRAPIOMBO
    const wd = sd.weeks?.find(w => w.week === week) || sd.weeks?.[0] || { double_routes: 2 }
    return (
      <div>
        <div style={ss.card}>
          <div style={ss.secLbl}>Struttura · Settimana {week}</div>
          {[
            { step:'1. Via di scaldo',    detail:'RPE 6-7 · recupero a tornare nuovo' },
            { step:`2. Vie Doppie (${wd.double_routes})`, detail:'~15 min di recupero tra le vie' },
            { step:'3. Via defaticamento', detail:'RPE 5-6' },
          ].map((s, i) => (
            <div key={i} style={{ display:'flex', gap:'12px', alignItems:'flex-start', padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:C.greenBg, border:`1px solid ${C.greenBorder}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <div style={{ fontSize:'10px', fontWeight:'700', color:C.green }}>{i + 1}</div>
              </div>
              <div>
                <div style={{ fontSize:'12px', fontWeight:'600', color:C.text }}>{s.step}</div>
                <div style={{ fontSize:'11px', color:C.muted, marginTop:'2px' }}>{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={ss.card}>
          <div style={ss.secLbl}>Come eseguire una via doppia</div>
          <div style={{ fontSize:'12px', color:C.textSoft, lineHeight:'1.75' }}>
            Scala da <strong style={{ color:C.text }}>primo</strong> senza fermarti → fatti calare → rifai <strong style={{ color:C.text }}>subito da secondo</strong> senza recupero.
            <br /><br />
            Al 2° giro devi <strong style={{ color:C.green }}>cadere nella seconda metà</strong> o chiudere con fatica estrema (RPE 9-10).
          </div>
        </div>
      </div>
    )
  }

  const renderREST = () => (
    <div style={ss.card}>
      <div style={{ textAlign:'center', padding:'24px 0' }}>
        <div style={{ fontSize:'32px', marginBottom:'12px' }}>🛋️</div>
        <div style={{ fontSize:'15px', fontWeight:'600', color:C.text, marginBottom:'8px' }}>Giorno di riposo</div>
        <div style={{ fontSize:'12px', color:C.muted, lineHeight:'1.6' }}>Il recupero è parte dell'allenamento. Nessuna attività fisica oggi.</div>
      </div>
    </div>
  )

  return (
    <div>
      {showCoach && <CoachNoteModal sessionType={sessionType} sessionLabel={sc.label} accentColor={sc.text} note={coachNote} onClose={() => setShowCoach(false)} />}
      {showChange && <ChangeSessionDrawer currentEntry={entry} onClose={() => setShowChange(false)} onChanged={(type) => setOverrideType(type)} />}

      {/* Header */}
      <div style={{ ...ss.hdr, background: sc.bg, borderBottomColor: sc.border }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
          <div style={{ fontSize:'12px', color: sc.text, cursor:'pointer', fontWeight:'500' }} onClick={onBack}>← Piano</div>
        </div>
        <div style={{ fontSize:'10px', fontWeight:'600', letterSpacing:'.1em', textTransform:'uppercase', color: sc.text, marginBottom:'6px' }}>
          Settimana {week} · {fmtDateShort(entry.day_date)}{entry.scarico ? ' · SCARICO' : ''}
        </div>
        <div style={{ fontSize:'26px', fontWeight:'700', color:C.text, letterSpacing:'-.02em' }}>{sc.label}</div>
        {entry.also && <div style={{ fontSize:'11px', color: sc.text, marginTop:'4px', opacity:0.8 }}>+ {SESSION_COLORS[entry.also]?.label}</div>}
        <div style={{ marginTop:'14px', display:'flex', gap:'8px' }}>
          <div style={{ flex:1, padding:'9px 12px', background:'rgba(0,0,0,0.3)', borderRadius:'10px', fontSize:'11px', fontWeight:'600', color: sc.text, textAlign:'center', cursor:'pointer', border:`1px solid ${sc.border}` }}
            onClick={() => setShowWarmup(!showWarmup)}>
            {showWarmup ? '▲' : '▼'} Riscaldamento
          </div>
          {sessionType !== 'REST' && (
            <div style={{ padding:'9px 12px', background:'rgba(0,0,0,0.3)', borderRadius:'10px', fontSize:'11px', fontWeight:'600', color: sc.text, cursor:'pointer', border:`1px solid ${sc.border}`, display:'flex', alignItems:'center', gap:'6px' }}
              onClick={() => setShowCoach(true)}>
              <IcoInfo col={sc.text} /> Coach
            </div>
          )}
        </div>
      </div>

      {/* Warmup expandable */}
      {showWarmup && (
        <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'16px' }}>
          <div style={{ fontSize:'11px', fontWeight:'600', color:C.hint, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'10px' }}>
            {needsWarmup2 ? 'Riscaldamento 2 — Falesia (23 min)' : 'Riscaldamento 1 — Casa/Palestra (20 min)'}
          </div>
          {warmupData.exercises.map((ex, i) => <WarmupRow key={i} ex={ex} />)}
          {!needsWarmup2 && (
            <>
              <div style={{ fontSize:'11px', fontWeight:'600', color:C.hint, textTransform:'uppercase', letterSpacing:'.08em', margin:'14px 0 8px' }}>Trave (10 min)</div>
              {TRAINING_PLAN.warmup_1.trave.map((t, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'11px', fontWeight:'500', color:C.text }}>{t.grip}</div>
                    <div style={{ fontSize:'10px', color:C.hint, marginTop:'1px' }}>{t.exercise}</div>
                  </div>
                  <div style={{ textAlign:'right', marginLeft:'8px', display:'flex', alignItems:'center', gap:'8px' }}>
                    <div>
                      <div style={{ fontSize:'10px', color:C.violet }}>{t.protocol}</div>
                      <div style={{ fontSize:'10px', color:C.hint }}>{t.load}</div>
                    </div>
                    <VideoButton exerciseName={t.grip} videos={videos} onVideosChange={onVideosChange} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <div style={ss.body}>
        {sessionType === 'PESI'             && renderPESI()}
        {sessionType === 'PALESTRA'         && renderPALESTRA()}
        {sessionType === 'CORSA'            && renderCORSA()}
        {(sessionType === 'PLACCA_VERTICALE' || sessionType === 'STRAPIOMBO' || sessionType === 'STRAPIOMBO_TRAZIONI_SETT4') && renderROCCIA(sessionType)}
        {sessionType === 'REST'             && renderREST()}

        {/* PESI aggiuntivo per doppia sessione */}
        {entry.also === 'PESI' && sessionType !== 'PESI' && (
          <div style={{ marginTop:'4px' }}>
            <div style={{ fontSize:'11px', fontWeight:'600', color:C.muted, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'12px', paddingTop:'8px', borderTop:`1px solid ${C.border}` }}>
              + Pesi (sessione abbinata)
            </div>
            {renderPESI()}
          </div>
        )}

        {/* Cooldown */}
        {sessionType !== 'REST' && (
          <div style={{ ...ss.card }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => setShowCooldown(!showCooldown)}>
              <div style={{ fontSize:'12px', fontWeight:'600', color:C.muted }}>Defaticamento · 15 min</div>
              <div style={{ fontSize:'12px', color:C.hint }}>{showCooldown ? '▲' : '▼'}</div>
            </div>
            {showCooldown && (
              <div style={{ marginTop:'12px' }}>
                {TRAINING_PLAN.cooldown.exercises.map((ex, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:'12px', color:C.text }}>{ex.name}</div>
                    <div style={{ fontSize:'11px', color:C.muted }}>{ex.duration}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Note sessione */}
        {sessionType !== 'REST' && (
          <div style={ss.card}>
            <div style={ss.secLbl}>Note sessione</div>
            <textarea style={{ ...ss.inp, resize:'vertical', lineHeight:'1.6', marginBottom:'10px' }}
              rows={3} placeholder="Come è andata? Carichi usati, sensazioni, imprevisti..."
              value={sessionNote} onChange={e => setSessionNote(e.target.value)} />
            <div style={{ ...ss.savBtn, background:C.surface, color:C.muted, border:`1px solid ${C.border}` }} onClick={saveNote}>
              Salva nota
            </div>
            {savedMsg && <div style={{ fontSize:'12px', color:C.greenLight, textAlign:'center', marginTop:'8px' }}>✓ Salvato!</div>}
          </div>
        )}

        {/* Cambia allenamento */}
        <div style={{ textAlign:'center', paddingTop:'8px' }}>
          <div style={{ fontSize:'11px', color:C.red, cursor:'pointer', padding:'8px', opacity:0.7 }} onClick={() => setShowChange(true)}>
            Cambia allenamento
          </div>
        </div>
      </div>
    </div>
  )
}

// ── METRICS DETAIL SCREEN ─────────────────────────────────────────
function MetricsDetail({ fitSessions, onBack, onGoToTest }) {
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

  if (!fitSessions.length) {
    return (
      <div>
        <div style={ss.hdr}>
          <div style={{ fontSize:'12px', color:C.muted, cursor:'pointer', marginBottom:'12px' }} onClick={onBack}>← Oggi</div>
          <div style={ss.title}>Metriche</div>
        </div>
        <div style={{ textAlign:'center', padding:'48px 20px', color:C.hint, fontSize:'13px' }}>
          Nessun test registrato ancora.
          <div style={{ marginTop:'16px' }}>
            <div style={{ ...ss.savBtn, maxWidth:'200px', margin:'0 auto' }} onClick={onGoToTest}>Registra primo test</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={ss.hdr}>
        <div style={{ fontSize:'12px', color:C.muted, cursor:'pointer', marginBottom:'12px' }} onClick={onBack}>← Oggi</div>
        <div style={ss.eyebrow}>Performance · {fitSessions.length} test registrati</div>
        <div style={ss.title}>Metriche</div>
        <div style={ss.subtitle}>dal {first?.session_date} · ultimo {last?.session_date}</div>
      </div>
      <div style={ss.body}>

        {/* Spaccata */}
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

        {/* Grafico metrica selezionata */}
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

        {/* Tutti i valori ultimo test */}
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

        {/* CTA nuovo test */}
        <div style={{ textAlign:'center', paddingTop:'4px' }}>
          <div style={{ fontSize:'11px', color:C.hint, cursor:'pointer', padding:'8px' }} onClick={onGoToTest}>+ Registra nuovo test</div>
        </div>

      </div>
    </div>
  )
}

// ── BENCHMARK CHART WIDGET ─────────────────────────────────────────
function BenchmarkWidget({ fitSessions, onOpenMetrics }) {
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
      type:'line',
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

// ── EXERCISES TABLE ────────────────────────────────────────────────
function ExercisesTable({ trainingLogs, fitSessions }) {
  const [selectedEx, setSelectedEx] = React.useState(null)
  const canvasRef = React.useRef(null)
  const chartRef  = React.useRef(null)

  // Group logs by exercise
  const byEx = {}
  trainingLogs.forEach(log => {
    if (!log.exercise_name) return
    if (!byEx[log.exercise_name]) byEx[log.exercise_name] = []
    byEx[log.exercise_name].push(log)
  })
  const exercises = Object.keys(byEx).sort()

  // Volume = sets * reps * weight (or reps if bodyweight)
  const calcVolume = (log) => {
    const s = log.sets_done || 1
    const r = log.reps_done || 0
    const w = log.weight_kg || 0
    return w > 0 ? s * r * w : s * r
  }

  React.useEffect(() => {
    if (!selectedEx || !canvasRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    const logs = (byEx[selectedEx] || []).slice().reverse()
    if (logs.length < 2) return
    chartRef.current = new Chart(canvasRef.current, {
      type:'bar',
      data:{
        labels: logs.map(l => l.log_date),
        datasets:[{
          label:'Volume',
          data: logs.map(l => calcVolume(l)),
          backgroundColor:'rgba(123,111,232,0.6)',
          borderColor:'#7B6FE8',
          borderWidth:1,
          borderRadius:4,
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false } },
        scales:{
          x:{ ticks:{ color:'#888', font:{ size:9 } }, grid:{ color:'#1E1E1E' } },
          y:{ ticks:{ color:'#888', font:{ size:9 } }, grid:{ color:'#1E1E1E' } },
        },
      },
    })
  }, [selectedEx, trainingLogs])

  if (exercises.length === 0) {
    return (
      <div style={{ ...ss.body, textAlign:'center', paddingTop:'48px' }}>
        <div style={{ fontSize:'14px', color:C.muted }}>Nessun log ancora.</div>
        <div style={{ fontSize:'12px', color:C.hint, marginTop:'8px' }}>Apri una sessione e registra i tuoi pesi.</div>
      </div>
    )
  }

  return (
    <div style={ss.body}>
      {selectedEx && (
        <div style={{ ...ss.card, marginBottom:'16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
            <div style={{ fontSize:'13px', fontWeight:'600', color:C.text }}>{selectedEx}</div>
            <div style={{ fontSize:'11px', color:C.hint, cursor:'pointer' }} onClick={() => setSelectedEx(null)}>✕</div>
          </div>
          {(byEx[selectedEx] || []).slice(0, 3).map((log, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:'11px', color:C.muted }}>{log.log_date}</div>
              <div style={{ display:'flex', gap:'8px' }}>
                {log.weight_kg && <div style={{ fontSize:'11px', color:C.violetLight, fontWeight:'600' }}>{log.weight_kg}kg</div>}
                {log.reps_done && <div style={{ fontSize:'11px', color:C.muted }}>{log.reps_done} reps</div>}
                {log.rpe_actual && <div style={{ fontSize:'11px', color:C.amberLight }}>RPE {log.rpe_actual}</div>}
              </div>
            </div>
          ))}
          {(byEx[selectedEx] || []).length >= 2 && (
            <div style={{ position:'relative', height:'120px', marginTop:'12px' }}><canvas ref={canvasRef} /></div>
          )}
        </div>
      )}

      {exercises.map(ex => {
        const logs = byEx[ex]
        const last = logs[0]
        const vol  = calcVolume(last)
        return (
          <div key={ex} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background: selectedEx === ex ? C.violetBg : C.surface, borderRadius:'12px', marginBottom:'6px', border:`1px solid ${selectedEx === ex ? C.violetBorder : C.border}`, cursor:'pointer' }}
            onClick={() => setSelectedEx(selectedEx === ex ? null : ex)}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'12px', fontWeight:'600', color:C.text }}>{ex}</div>
              <div style={{ fontSize:'10px', color:C.hint, marginTop:'2px' }}>{logs.length} sessioni</div>
            </div>
            <div style={{ textAlign:'right' }}>
              {last.weight_kg && <div style={{ fontSize:'13px', fontWeight:'700', color:C.violetLight }}>{last.weight_kg}kg</div>}
              {!last.weight_kg && last.reps_done && <div style={{ fontSize:'13px', fontWeight:'700', color:C.muted }}>{last.reps_done} reps</div>}
              <div style={{ fontSize:'9px', color:C.hint }}>vol: {vol}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── TEST FORM ──────────────────────────────────────────────────────
function TestForm({ fitSessions, onSaved }) {
  const [formDate,  setFormDate]  = React.useState(todayStr())
  const [formPeso,  setFormPeso]  = React.useState('')
  const [fv,        setFv]        = React.useState({})
  const [saving,    setSaving]    = React.useState(false)
  const [savedMsg,  setSavedMsg]  = React.useState(false)

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
    const ok = await saveFitnessSession(session)
    if (ok) { setSavedMsg(true); setFv({}); setFormPeso(''); onSaved(); setTimeout(() => setSavedMsg(false), 2500) }
    setSaving(false)
  }

  const inp = (test) => (
    <div key={test.id} style={{ marginBottom:'12px' }}>
      <div style={{ fontSize:'12px', fontWeight:'500', color:C.text, marginBottom:'2px' }}>{test.label}</div>
      <div style={{ fontSize:'10px', color:C.hint, marginBottom:'5px' }}>{test.desc} · {test.unit}</div>
      <input type="number" step="0.1" style={ss.inp} value={fv[test.id] || ''} onChange={e => sv(test.id, e.target.value)} placeholder={`— ${test.unit}`} />
    </div>
  )

  return (
    <div style={ss.body}>
      <div style={ss.card}>
        <div style={ss.secLbl}>Info sessione</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
          <div><div style={{ fontSize:'10px', color:C.hint, marginBottom:'5px' }}>Data</div><input type="date" style={ss.inp} value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
          <div><div style={{ fontSize:'10px', color:C.hint, marginBottom:'5px' }}>Peso (kg)</div><input type="number" step="0.1" style={ss.inp} value={formPeso} onChange={e => setFormPeso(e.target.value)} placeholder="es. 72" /></div>
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
        {saving ? 'Salvataggio...' : 'Salva test'}
      </div>
      {savedMsg && <div style={{ textAlign:'center', fontSize:'12px', color:C.greenLight, marginTop:'8px' }}>✓ Test salvato!</div>}
    </div>
  )
}

// ── MAIN ALLENAMENTO ───────────────────────────────────────────────
export default function AllenamentoSection({ trainingLogs, setTrainingLogs, fitSessions, setFitSessions, videos, onVideosChange }) {
  const [sub, setSub]                     = React.useState('oggi')
  const [selectedEntry, setSelectedEntry] = React.useState(null)
  const [showMetrics,   setShowMetrics]   = React.useState(false)
  const today      = todayStr()
  const todayEntry = getTodayCalEntry()

  const onLogsChanged = async () => { const logs = await loadTrainingLogs(); setTrainingLogs(logs) }
  const onFitSaved    = async () => { const sessions = await loadFitnessSessions(); setFitSessions(sessions) }

  // Metrics screen
  if (showMetrics) {
    return <MetricsDetail
      fitSessions={fitSessions}
      onBack={() => setShowMetrics(false)}
      onGoToTest={() => { setShowMetrics(false); setSub('test') }}
    />
  }

  if (selectedEntry) {
    return <SessionDetail
      entry={selectedEntry}
      onBack={() => setSelectedEntry(null)}
      trainingLogs={trainingLogs}
      onLogsChanged={onLogsChanged}
      videos={videos}
      onVideosChange={onVideosChange}
    />
  }

  // ── OGGI ──────────────────────────────────────────────────────────
  const renderOggi = () => (
    <div style={ss.body}>
      {/* Box sessione oggi */}
      {todayEntry ? (() => {
        const sc = SESSION_COLORS[todayEntry.session_type] || SESSION_COLORS.REST
        return (
          <div style={{ background: sc.bg, border:`1px solid ${sc.border}`, borderRadius:'16px', padding:'20px', marginBottom:'16px', cursor:'pointer' }}
            onClick={() => setSelectedEntry(todayEntry)}>
            <div style={{ fontSize:'9px', fontWeight:'600', letterSpacing:'.08em', textTransform:'uppercase', color: sc.text, marginBottom:'8px' }}>
              Oggi · Settimana {todayEntry.week}{todayEntry.scarico ? ' · SCARICO' : ''}
            </div>
            <div style={{ fontSize:'24px', fontWeight:'700', color:C.text }}>{sc.label}</div>
            {todayEntry.also && <div style={{ fontSize:'11px', color: sc.text, opacity:0.8, marginTop:'3px' }}>+ {SESSION_COLORS[todayEntry.also]?.label}</div>}
            <div style={{ marginTop:'14px', fontSize:'10px', fontWeight:'600', color: sc.text }}>Apri sessione →</div>
          </div>
        )
      })() : (
        <div style={{ ...ss.card, textAlign:'center', padding:'24px' }}>
          <div style={{ fontSize:'14px', color:C.muted }}>Nessun allenamento oggi nel piano</div>
        </div>
      )}

      {/* Mini calendario */}
      <div style={ss.card}>
        <div style={ss.secLbl}>Questa settimana</div>
        <div style={{ display:'flex', gap:'5px', overflowX:'auto', paddingBottom:'4px' }}>
          {TRAINING_PLAN.calendar.filter(e => e.day_date >= today).slice(0, 8).map((entry, i) => {
            const sc = SESSION_COLORS[entry.session_type] || SESSION_COLORS.REST
            const isToday = entry.day_date === today
            return (
              <div key={i} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor:'pointer' }}
                onClick={() => setSelectedEntry(entry)}>
                <div style={{ fontSize:'9px', fontWeight:'600', color: isToday ? C.text : C.hint, textTransform:'uppercase' }}>{fmtDayName(entry.day_date)}</div>
                <div style={{ width:'36px', height:'36px', borderRadius:'9px', background: isToday ? sc.bg : '#161616', border:`1px solid ${isToday ? sc.border : C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ fontSize:'7px', fontWeight:'700', color: sc.text, textAlign:'center', lineHeight:'1.3', padding:'2px' }}>
                    {entry.session_type === 'REST' ? '—' : sc.label.slice(0, 6)}
                  </div>
                </div>
                <div style={{ fontSize:'8px', color: isToday ? C.text : C.hint }}>{fmtDateShort(entry.day_date).split(' ')[0]}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Benchmark widget */}
      <BenchmarkWidget fitSessions={fitSessions} onOpenMetrics={() => setShowMetrics(true)} />

      {/* Nuovo test CTA */}
      <div style={{ textAlign:'center', marginTop:'-4px', marginBottom:'8px' }}>
        <div style={{ fontSize:'11px', color:C.hint, cursor:'pointer', padding:'8px' }} onClick={() => setSub('test')}>
          + Registra nuovo test
        </div>
      </div>
    </div>
  )

  // ── PIANO ─────────────────────────────────────────────────────────
  const renderPiano = () => (
    <div style={ss.body}>
      <div style={{ fontSize:'11px', color:C.muted, marginBottom:'16px', lineHeight:'1.5' }}>
        {TRAINING_PLAN.meta.goal} · 4 settimane · microcicli da 8 giorni
      </div>
      {[1, 2, 3, 4].map(w => {
        const entries = TRAINING_PLAN.calendar.filter(e => e.week === w)
        return (
          <div key={w} style={{ marginBottom:'20px' }}>
            <div style={{ fontSize:'11px', fontWeight:'700', color: w === 4 ? C.amber : C.violetLight, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'8px' }}>
              Settimana {w}{w === 4 ? ' — Scarico' : ''}
            </div>
            {entries.map((entry, i) => {
              const sc = SESSION_COLORS[entry.session_type] || SESSION_COLORS.REST
              const isToday = entry.day_date === today
              const isPast  = entry.day_date < today
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background: isToday ? sc.bg : C.surface, borderRadius:'10px', marginBottom:'5px', border:`1px solid ${isToday ? sc.border : C.border}`, cursor:'pointer', opacity: isPast ? 0.5 : 1 }}
                  onClick={() => setSelectedEntry(entry)}>
                  {/* Color dot */}
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: sc.text, flexShrink:0, opacity: entry.session_type === 'REST' ? 0.2 : 1 }} />
                  <div style={{ width:'38px', fontSize:'10px', color: isToday ? sc.text : C.muted, fontWeight: isToday ? '700' : '400', flexShrink:0 }}>
                    {fmtDateShort(entry.day_date)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'12px', fontWeight:'600', color: entry.session_type === 'REST' ? C.hint : C.text }}>{sc.label}</div>
                    {entry.also && <div style={{ fontSize:'10px', color:C.muted }}>+ {SESSION_COLORS[entry.also]?.label}</div>}
                  </div>
                  {isToday && <div style={{ fontSize:'9px', fontWeight:'700', color: sc.text, background:'rgba(0,0,0,0.3)', padding:'2px 7px', borderRadius:'999px' }}>OGGI</div>}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )

  return (
    <div>
      <div style={ss.hdr}>
        <div style={ss.eyebrow}>Piano · {TRAINING_PLAN.meta.goal}</div>
        <div style={ss.title}>Allenamento</div>
        <div style={ss.subtitle}>{todayEntry ? `oggi: ${SESSION_COLORS[todayEntry.session_type]?.label}` : 'nessun allenamento oggi'}</div>
      </div>
      <div style={ss.subBar}>
        {[{ id:'oggi', l:'Oggi' }, { id:'piano', l:'Piano' }, { id:'esercizi', l:'Esercizi' }, { id:'test', l:'Test' }].map(t => (
          <div key={t.id} style={ss.subTab(sub === t.id)} onClick={() => setSub(t.id)}>{t.l}</div>
        ))}
      </div>
      {sub === 'oggi'     && renderOggi()}
      {sub === 'piano'    && renderPiano()}
      {sub === 'esercizi' && <ExercisesTable trainingLogs={trainingLogs} fitSessions={fitSessions} />}
      {sub === 'test'     && <TestForm fitSessions={fitSessions} onSaved={onFitSaved} />}
    </div>
  )
}
