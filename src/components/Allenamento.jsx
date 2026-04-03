import React from 'react'
import { Chart, LineController, BarController, LineElement, BarElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'
Chart.register(LineController, BarController, LineElement, BarElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)
import {
  C, ss, SESSION_COLORS, ALL_TESTS, MOB_TESTS, STR_TESTS,
  USER_HEIGHT, USER_LEG, todayStr, fmtDate, fmtDateShort, fmtDayName,
} from '../constants'
import { TRAINING_PLAN, getTodayCalEntry } from '../data/trainingPlan'
import { saveTrainingLog, loadTrainingLogs, saveFitnessSession, loadFitnessSessions, saveSessionNote, loadSessionNotes, deleteSessionLogs, deleteSessionNote, deleteExerciseLogs, deleteAllTrainingData, saveRunningLog, loadRunningLogs, loadClimbingSessions, loadAscents, loadCrags } from '../lib/supabase'
import { IcoInfo, IcoChev, IcoChevL, IcoPlay } from './Icons'
import { Modal, CoachNoteModal, VideoButton, ChangeSessionDrawer } from './UI'
import PesiRow from './PesiRow'

// ── SESSION DETAIL ─────────────────────────────────────────────────
function SessionDetail({ entry, onBack, trainingLogs, onLogsChanged, videos, onVideosChange, sessionNotes, climbingSessions, crags, ascents }) {
  const [showCoach,    setShowCoach]    = React.useState(false)
  const [showWarmup,   setShowWarmup]   = React.useState(false)
  const [showCooldown, setShowCooldown] = React.useState(false)
  const [showChange,   setShowChange]   = React.useState(false)
  const [sessionNote,  setSessionNote]  = React.useState('')
  const [sessionRpe,   setSessionRpe]   = React.useState('')
  const [exData,       setExData]       = React.useState({})
  const [saving,       setSaving]       = React.useState(false)
  const [savedMsg,     setSavedMsg]     = React.useState(false)

  const [runDist,     setRunDist]     = React.useState('')
  const [runPace,     setRunPace]     = React.useState('')
  const [runHr,       setRunHr]       = React.useState('')
  const [runElev,     setRunElev]     = React.useState('')

  const [linkedSessionId, setLinkedSessionId] = React.useState('')

  const savedChange = sessionNotes?.find(n =>
    n.note_date === entry.day_date &&
    n.original_session &&
    n.original_session !== n.session_type
  )
  const [overrideType, setOverrideType] = React.useState(savedChange?.session_type || null)

  const handleExChange = (name, data) => setExData(p => ({ ...p, [name]: data }))

  const sessionType  = overrideType || entry.session_type
  const sc           = SESSION_COLORS[sessionType] || SESSION_COLORS.REST
  const coachNote    = TRAINING_PLAN.coach_notes.sessions[sessionType]
  const week         = entry.week
  const needsWarmup2 = ['PLACCA_VERTICALE','STRAPIOMBO','DAY_PROJECT','STRAPIOMBO_TRAZIONI_SETT4'].includes(sessionType)
  const warmupData   = needsWarmup2 ? TRAINING_PLAN.warmup_2 : TRAINING_PLAN.warmup_1

  const saveSession = async () => {
    if (saving || savedMsg) return
    setSaving(true)
    const promises = []

    Object.entries(exData).forEach(([name, d]) => {
      if (d.sets && Array.isArray(d.sets)) {
        d.sets.forEach((s, i) => {
          if (!s.reps && !s.kg) return
          promises.push(saveTrainingLog({
            log_date:      entry.day_date,
            session_type:  sessionType,
            exercise_name: name,
            sets_done:     i + 1,
            reps_done:     s.reps ? parseInt(s.reps) : null,
            weight_kg:     d.bodyweight ? null : (s.kg ? parseFloat(s.kg) : null),
            rpe_actual:    sessionRpe ? parseInt(sessionRpe) : (d.rpe ? parseInt(d.rpe) : null),
            created_at:    new Date().toISOString(),
          }))
        })
      }
    })

    const hasPesiData = Object.keys(exData).length > 0
    if (!hasPesiData) {
      promises.push(saveTrainingLog({
        log_date:      entry.day_date,
        session_type:  sessionType,
        exercise_name: null,
        sets_done:     null,
        reps_done:     null,
        weight_kg:     null,
        rpe_actual:    sessionRpe ? parseInt(sessionRpe) : null,
        created_at:    new Date().toISOString(),
      }))
    }

    if (sessionType === 'CORSA' && (runDist || runPace || runHr)) {
      promises.push(saveRunningLog({
        log_date:    entry.day_date,
        distance_km: runDist  ? parseFloat(runDist)  : null,
        pace_avg:    runPace  ? runPace.trim()        : null,
        hr_avg:      runHr    ? parseInt(runHr)       : null,
        elevation_m: runElev  ? parseInt(runElev)     : null,
        rpe:         sessionRpe ? parseInt(sessionRpe) : null,
        notes:       sessionNote.trim() || null,
        created_at:  new Date().toISOString(),
      }))
    }

    if (linkedSessionId) {
      promises.push(saveSessionNote({
        note_date:    entry.day_date,
        session_type: sessionType,
        note_text:    sessionNote.trim(),
        original_session: null,
        climbing_session_id: parseInt(linkedSessionId),
        created_at:   new Date().toISOString(),
      }))
    } else if (sessionNote.trim()) {
      promises.push(saveSessionNote({
        note_date:    entry.day_date,
        session_type: sessionType,
        note_text:    sessionNote,
        created_at:   new Date().toISOString(),
      }))
    }

    await Promise.all(promises)
    onLogsChanged()
    setSaving(false)
    setSavedMsg(true)
  }

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

  const [pesiActiveSet, setPesiActiveSet] = React.useState(0)
  const maxSets = Math.max(...TRAINING_PLAN.sessions.PESI.circuit_2.map(ex => {
    const wd = ex.weeks.find(w => w.week === week) || ex.weeks[0]
    return wd.sets || 2
  }))

  const renderPESI = () => (
    <div>
      <div style={ss.card}>
        <div style={ss.secLbl}>Circuito 1 — Mobilità / Attivazione</div>
        <div style={{ fontSize:'10px', color:C.hint, marginBottom:'10px' }}>Uguale per tutte le settimane</div>
        {TRAINING_PLAN.sessions.PESI.circuit_1.map((ex, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
            <div><div style={{ fontSize:'12px', color:C.text, fontWeight:'500' }}>{ex.name}</div></div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ fontSize:'11px', color:C.muted }}>{ex.sets && `${ex.sets}×`}{ex.duration || (ex.reps && `${ex.reps} reps`)}</div>
              <VideoButton exerciseName={ex.name} videos={videos} onVideosChange={onVideosChange} />
            </div>
          </div>
        ))}
      </div>
      <div style={ss.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', paddingBottom:'10px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:'10px', fontWeight:'600', color:C.muted, textTransform:'uppercase', letterSpacing:'.08em' }}>
            Circuito 2 · Settimana {week}
          </div>
          <div
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', borderRadius:'999px', cursor:'pointer', background:C.violetBg, border:`1px solid ${C.violetBorder}`, fontSize:'12px', fontWeight:'700', color:C.violetLight, userSelect:'none' }}
            onClick={() => setPesiActiveSet(s => (s + 1) % maxSets)}>
            🔄 {pesiActiveSet + 1}/{maxSets}
          </div>
        </div>
        <div style={{ fontSize:'10px', color:C.hint, marginBottom:'12px' }}>Recupero 20s tra esercizi · 3 min a fine giro</div>
        {TRAINING_PLAN.sessions.PESI.circuit_2.map((ex) => (
          <PesiRow key={ex.name} ex={ex} week={week} trainingLogs={trainingLogs} onChange={handleExChange} videos={videos} onVideosChange={onVideosChange} activeSet={pesiActiveSet} />
        ))}
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
    const inpStyle = { ...ss.inp, fontSize:'18px', fontWeight:'700', textAlign:'center', padding:'12px' }
    return (
      <div>
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

        <div style={ss.card}>
          <div style={ss.secLbl}>Registra uscita</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
            <div>
              <div style={{ fontSize:'10px', color:C.hint, textAlign:'center', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'.06em' }}>Distanza km</div>
              <input type="number" inputMode="decimal" step="0.1" style={inpStyle} placeholder="—" value={runDist} onChange={e => setRunDist(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize:'10px', color:C.hint, textAlign:'center', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'.06em' }}>Passo medio</div>
              <input type="text" inputMode="text" style={inpStyle} placeholder="5:30" value={runPace} onChange={e => setRunPace(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize:'10px', color:C.hint, textAlign:'center', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'.06em' }}>FC media bpm</div>
              <input type="number" inputMode="numeric" style={inpStyle} placeholder="—" value={runHr} onChange={e => setRunHr(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize:'10px', color:C.hint, textAlign:'center', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'.06em' }}>Dislivello m</div>
              <input type="number" inputMode="numeric" style={inpStyle} placeholder="—" value={runElev} onChange={e => setRunElev(e.target.value)} />
            </div>
          </div>
          {runDist && runPace && runHr && (
            <div style={{ fontSize:'10px', color:C.green, background:C.greenBg, border:`1px solid ${C.greenBorder}`, borderRadius:'8px', padding:'8px 12px', textAlign:'center' }}>
              Efficienza: {(parseFloat(runHr) / (1 / (parseFloat(runPace?.split(':')[0] || 0) + (parseFloat(runPace?.split(':')[1] || 0) / 60)))).toFixed(0)} bpm·min/km
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderROCCIA = (tipo) => {
    const sd = TRAINING_PLAN.sessions[tipo] || TRAINING_PLAN.sessions.STRAPIOMBO
    const wd = sd.weeks?.find(w => w.week === week) || sd.weeks?.[0] || { double_routes: 2 }

    const recentClimbing = [...(climbingSessions || [])]
      .sort((a, b) => b.session_date.localeCompare(a.session_date))
      .slice(0, 5)

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

        {recentClimbing.length > 0 && (
          <div style={ss.card}>
            <div style={ss.secLbl}>Collega sessione arrampicata</div>
            <div style={{ fontSize:'11px', color:C.muted, marginBottom:'10px' }}>Quale sessione hai fatto oggi?</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              <div
                style={{ padding:'10px 14px', borderRadius:'10px', cursor:'pointer', border:`1px solid ${C.border}`, background: !linkedSessionId ? C.surface : C.bg }}
                onClick={() => setLinkedSessionId('')}>
                <div style={{ fontSize:'11px', color: !linkedSessionId ? C.muted : C.hint }}>Nessun collegamento</div>
              </div>
              {recentClimbing.map(sess => {
                const crag = (crags || []).find(c => c.id === sess.crag_id)
                const sessAscents = (ascents || []).filter(a => a.session_id === sess.id)
                const GRADE_ORDER_LOCAL = ['4','4+','5','5+','6a','6a+','6b','6b+','6c','6c+','7a','7a+','7b','7b+','7c','7c+','8a','8a+','8b','8b+','8c','8c+','9a']
                const completed = sessAscents.filter(a => a.completed)
                const maxG = completed.length ? completed.reduce((m, a) => (GRADE_ORDER_LOCAL.indexOf(a.grade) > GRADE_ORDER_LOCAL.indexOf(m) ? a.grade : m), completed[0].grade) : null
                const isSelected = linkedSessionId === String(sess.id)
                return (
                  <div key={sess.id}
                    style={{ padding:'10px 14px', borderRadius:'10px', cursor:'pointer', border:`1px solid ${isSelected ? C.greenBorder : C.border}`, background: isSelected ? C.greenBg : C.bg }}
                    onClick={() => setLinkedSessionId(isSelected ? '' : String(sess.id))}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:'12px', fontWeight:'600', color: isSelected ? C.greenLight : C.text }}>{crag?.name || 'Falesia'}</div>
                        <div style={{ fontSize:'10px', color: isSelected ? C.green : C.hint, marginTop:'2px' }}>
                          {fmtDateShort(sess.session_date)} · {sessAscents.length} tiri{maxG ? ` · max ${maxG}` : ''}
                        </div>
                      </div>
                      {isSelected && <div style={{ fontSize:'14px', color:C.green }}>✓</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
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

          {entry.also === 'PESI' && sessionType !== 'PESI' && (
            <div style={{ marginTop:'4px' }}>
              <div style={{ fontSize:'11px', fontWeight:'600', color:C.muted, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'12px', paddingTop:'8px', borderTop:`1px solid ${C.border}` }}>
                + Pesi (sessione abbinata)
              </div>
              <div style={ss.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', paddingBottom:'10px', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:'10px', fontWeight:'600', color:C.muted, textTransform:'uppercase', letterSpacing:'.08em' }}>
                    Circuito 2 · Settimana {week}
                  </div>
                  <div
                    style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', borderRadius:'999px', cursor:'pointer', background:C.violetBg, border:`1px solid ${C.violetBorder}`, fontSize:'12px', fontWeight:'700', color:C.violetLight, userSelect:'none' }}
                    onClick={() => setPesiActiveSet(s => (s + 1) % maxSets)}>
                    🔄 {pesiActiveSet + 1}/{maxSets}
                  </div>
                </div>
                <div style={{ fontSize:'10px', color:C.hint, marginBottom:'12px' }}>Recupero 20s tra esercizi · 3 min a fine giro</div>
                {TRAINING_PLAN.sessions.PESI.circuit_2.map((ex) => (
                  <PesiRow key={`also_${ex.name}`} ex={ex} week={week} trainingLogs={trainingLogs} onChange={handleExChange} videos={videos} onVideosChange={onVideosChange} activeSet={pesiActiveSet} />
                ))}
              </div>
            </div>
          )}

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

          {sessionType !== 'REST' && (
            <div style={ss.card}>
              <div style={ss.secLbl}>Chiudi sessione</div>
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'11px', color:C.muted, marginBottom:'8px' }}>Com'è andata? RPE generale</div>
                <div style={{ display:'flex', gap:'6px' }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <div key={n}
                      style={{ flex:1, padding:'8px 0', textAlign:'center', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'600',
                        background: parseInt(sessionRpe) === n ? C.violet : C.bg,
                        color: parseInt(sessionRpe) === n ? '#fff' : C.hint,
                        border: `1px solid ${parseInt(sessionRpe) === n ? C.violetBorder : C.border}`,
                      }}
                      onClick={() => setSessionRpe(String(n))}>
                      {n}
                    </div>
                  ))}
                </div>
              </div>
              <textarea
                style={{ ...ss.inp, resize:'vertical', lineHeight:'1.6', marginBottom:'12px', fontSize:'14px' }}
                rows={3}
                placeholder="Note libere — sensazioni, imprevisti, cosa hai saltato..."
                value={sessionNote}
                onChange={e => setSessionNote(e.target.value)}
              />
              <div
                style={{ ...ss.savBtn, opacity: saving ? 0.6 : 1, background: savedMsg ? C.green : C.violet }}
                onClick={!saving && !savedMsg ? saveSession : undefined}>
                {saving ? 'Salvataggio...' : savedMsg ? '✓ Allenamento salvato!' : 'Salva allenamento'}
              </div>
            </div>
          )}

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

// ── STORICO ALLENAMENTI ────────────────────────────────────────────
function StoricoAllenamenti({ trainingLogs, sessionNotes, onDataChanged }) {
  const [expanded,     setExpanded]     = React.useState(null)
  const [noteExpanded, setNoteExpanded] = React.useState(null)
  const [confirmDel,   setConfirmDel]   = React.useState(null)
  const [deleting,     setDeleting]     = React.useState(false)
  const [showNuke,     setShowNuke]     = React.useState(false)
  const [nukeConfirm,  setNukeConfirm]  = React.useState('')

  const sessions = {}
  trainingLogs.forEach(log => {
    const key = `${log.log_date}__${log.session_type}`
    if (!sessions[key]) sessions[key] = { date: log.log_date, type: log.session_type, logs: [] }
    sessions[key].logs.push(log)
  })
  const sorted = Object.values(sessions).sort((a, b) => b.date.localeCompare(a.date))

  const handleDelete = async (date, type) => {
    setDeleting(true)
    await deleteSessionLogs(date, type)
    await deleteSessionNote(date, type)
    await onDataChanged()
    setDeleting(false); setConfirmDel(null); setExpanded(null)
  }

  const handleNuke = async () => {
    if (nukeConfirm !== 'ELIMINA') return
    setDeleting(true)
    await deleteAllTrainingData()
    await onDataChanged()
    setDeleting(false); setShowNuke(false); setNukeConfirm('')
  }

  if (sorted.length === 0) {
    return (
      <div style={{ ...ss.body, textAlign:'center', paddingTop:'48px' }}>
        <div style={{ fontSize:'14px', color:C.muted }}>Nessun allenamento salvato.</div>
        <div style={{ fontSize:'12px', color:C.hint, marginTop:'8px' }}>Apri una sessione, inserisci i carichi e clicca "Salva allenamento".</div>
      </div>
    )
  }

  return (
    <div style={ss.body}>
      {confirmDel && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
          onClick={() => setConfirmDel(null)}>
          <div style={{ background:C.surface, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'340px', border:`1px solid ${C.redBorder}` }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:'16px', fontWeight:'700', color:C.text, marginBottom:'8px' }}>Elimina sessione</div>
            <div style={{ fontSize:'13px', color:C.muted, marginBottom:'20px', lineHeight:'1.5' }}>
              Vuoi eliminare tutti i log di <strong style={{ color:C.text }}>{SESSION_COLORS[confirmDel.type]?.label}</strong> del {confirmDel.date}? Azione irreversibile.
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <div style={{ flex:1, padding:'12px', textAlign:'center', borderRadius:'10px', cursor:'pointer', background:C.bg, border:`1px solid ${C.border}`, fontSize:'13px', color:C.muted }}
                onClick={() => setConfirmDel(null)}>Annulla</div>
              <div style={{ flex:1, padding:'12px', textAlign:'center', borderRadius:'10px', cursor:'pointer', background:C.redBg, border:`1px solid ${C.redBorder}`, fontSize:'13px', fontWeight:'600', color:C.red, opacity: deleting ? 0.6 : 1 }}
                onClick={() => !deleting && handleDelete(confirmDel.date, confirmDel.type)}>
                {deleting ? '...' : 'Elimina'}
              </div>
            </div>
          </div>
        </div>
      )}

      {showNuke && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
          onClick={() => setShowNuke(false)}>
          <div style={{ background:C.surface, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'340px', border:`1px solid ${C.redBorder}` }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:'16px', fontWeight:'700', color:C.red, marginBottom:'8px' }}>⚠️ Elimina tutto</div>
            <div style={{ fontSize:'13px', color:C.muted, marginBottom:'16px', lineHeight:'1.5' }}>
              Stai per eliminare <strong style={{ color:C.text }}>tutti</strong> i log e le note. Scrivi <strong style={{ color:C.text }}>ELIMINA</strong> per confermare.
            </div>
            <input style={{ ...ss.inp, marginBottom:'12px', fontSize:'14px' }} placeholder="Scrivi ELIMINA"
              value={nukeConfirm} onChange={e => setNukeConfirm(e.target.value)} />
            <div style={{ display:'flex', gap:'8px' }}>
              <div style={{ flex:1, padding:'12px', textAlign:'center', borderRadius:'10px', cursor:'pointer', background:C.bg, border:`1px solid ${C.border}`, fontSize:'13px', color:C.muted }}
                onClick={() => { setShowNuke(false); setNukeConfirm('') }}>Annulla</div>
              <div style={{ flex:1, padding:'12px', textAlign:'center', borderRadius:'10px', cursor:'pointer',
                background: nukeConfirm === 'ELIMINA' ? C.redBg : C.surface,
                border: `1px solid ${nukeConfirm === 'ELIMINA' ? C.redBorder : C.border}`,
                fontSize:'13px', fontWeight:'600',
                color: nukeConfirm === 'ELIMINA' ? C.red : C.hint,
                opacity: deleting ? 0.6 : 1 }}
                onClick={() => !deleting && nukeConfirm === 'ELIMINA' && handleNuke()}>
                {deleting ? '...' : 'Conferma'}
              </div>
            </div>
          </div>
        </div>
      )}

      {sorted.map(sess => {
        const key      = `${sess.date}__${sess.type}`
        const sc       = SESSION_COLORS[sess.type] || SESSION_COLORS.REST
        const isOpen   = expanded === key
        const noteOpen = noteExpanded === key
        const note     = sessionNotes.find(n => n.note_date === sess.date && n.session_type === sess.type)
        const rpeLog   = sess.logs.find(l => l.rpe_actual)

        return (
          <div key={key} style={{ ...ss.card, padding:0, overflow:'hidden', marginBottom:'8px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', cursor:'pointer' }}
              onClick={() => setExpanded(isOpen ? null : key)}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: sc.text, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'13px', fontWeight:'600', color:C.text }}>{sc.label}</div>
                <div style={{ fontSize:'10px', color:C.muted, marginTop:'2px' }}>{sess.date}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                {rpeLog && (
                  <div style={{ fontSize:'10px', fontWeight:'600', padding:'2px 8px', borderRadius:'999px',
                    background: rpeLog.rpe_actual <= 6 ? C.greenBg : rpeLog.rpe_actual <= 8 ? C.amberBg : C.redBg,
                    color:      rpeLog.rpe_actual <= 6 ? C.greenLight : rpeLog.rpe_actual <= 8 ? C.amberLight : C.redLight,
                  }}>RPE {rpeLog.rpe_actual}</div>
                )}
                <div style={{ fontSize:'16px', color:C.hint }}>{isOpen ? '▲' : '▼'}</div>
              </div>
            </div>

            {isOpen && (
              <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 16px' }}>
                {(() => {
                  const byExercise = {}
                  sess.logs.forEach(log => {
                    if (!log.exercise_name) return
                    if (!byExercise[log.exercise_name]) byExercise[log.exercise_name] = []
                    byExercise[log.exercise_name].push(log)
                  })
                  const hasExercises = Object.keys(byExercise).length > 0
                  if (!hasExercises) {
                    return <div style={{ fontSize:'12px', color:C.hint, padding:'8px 0' }}>Sessione completata ✓</div>
                  }
                  return Object.entries(byExercise).map(([exName, exLogs]) => (
                    <div key={exName} style={{ padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                      <div style={{ fontSize:'12px', fontWeight:'600', color:C.textSoft, marginBottom:'5px' }}>{exName}</div>
                      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                        {exLogs.map((log, i) => (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:'4px', background:C.bg, padding:'4px 8px', borderRadius:'6px', border:`1px solid ${C.border}` }}>
                            <span style={{ fontSize:'9px', color:C.hint }}>G{log.sets_done || i+1}</span>
                            {log.weight_kg && <span style={{ fontSize:'12px', fontWeight:'700', color:C.violetLight }}>{log.weight_kg}kg</span>}
                            {log.reps_done && <span style={{ fontSize:'11px', color:C.muted }}>×{log.reps_done}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                })()}

                {note && (
                  <div style={{ marginTop:'10px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', padding:'6px 0' }}
                      onClick={() => setNoteExpanded(noteOpen ? null : key)}>
                      <div style={{ fontSize:'10px', fontWeight:'600', color:C.hint, textTransform:'uppercase', letterSpacing:'.06em' }}>📝 Nota</div>
                      <div style={{ fontSize:'12px', color:C.hint }}>{noteOpen ? '▲' : '▼'}</div>
                    </div>
                    {noteOpen && (
                      <div style={{ fontSize:'12px', color:C.muted, lineHeight:'1.6', padding:'8px', background:C.bg, borderRadius:'8px', border:`1px solid ${C.border}` }}>
                        {note.note_text}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop:'12px', textAlign:'right' }}>
                  <div style={{ fontSize:'11px', color:C.red, cursor:'pointer', opacity:0.7 }}
                    onClick={() => setConfirmDel({ date: sess.date, type: sess.type })}>
                    Elimina sessione
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <div style={{ textAlign:'center', marginTop:'16px', paddingTop:'16px', borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontSize:'11px', color:C.hint, cursor:'pointer', padding:'8px' }} onClick={() => setShowNuke(true)}>
          ⚠️ Elimina tutti i dati
        </div>
      </div>
    </div>
  )
}

// ── EXERCISES TABLE ────────────────────────────────────────────────
function ExercisesTable({ trainingLogs, onDataChanged }) {
  const [selectedEx, setSelectedEx] = React.useState(null)
  const [confirmDel, setConfirmDel] = React.useState(null)
  const [deleting,   setDeleting]   = React.useState(false)
  const canvasRef = React.useRef(null)
  const chartRef  = React.useRef(null)

  const byEx = {}
  ;[...trainingLogs].reverse().forEach(log => {
    if (!log.exercise_name) return
    if (!byEx[log.exercise_name]) byEx[log.exercise_name] = []
    byEx[log.exercise_name].push(log)
  })
  const exercises = Object.keys(byEx).sort()

  const aggregateByDate = (logs) => {
    const byDate = {}
    logs.forEach(log => {
      const d = log.log_date
      if (!byDate[d]) byDate[d] = { date: d, totalVolume: 0, maxWeight: 0, sets: 0 }
      const r = log.reps_done || 0
      const w = log.weight_kg || 0
      byDate[d].totalVolume += w > 0 ? r * w : r
      byDate[d].maxWeight = Math.max(byDate[d].maxWeight, w)
      byDate[d].sets++
    })
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }

  React.useEffect(() => {
    if (!selectedEx || !canvasRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    const logs = byEx[selectedEx] || []
    const aggregated = aggregateByDate(logs)
    if (aggregated.length < 2) return
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: aggregated.map(d => d.date),
        datasets: [{
          data: aggregated.map(d => d.maxWeight || d.totalVolume),
          borderColor: '#7B6FE8', backgroundColor: 'rgba(123,111,232,0.1)',
          pointBackgroundColor: '#7B6FE8', tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#888', font: { size: 9 } }, grid: { color: '#1E1E1E' } },
          y: { ticks: { color: '#888', font: { size: 9 } }, grid: { color: '#1E1E1E' } },
        },
      },
    })
  }, [selectedEx, trainingLogs])

  if (exercises.length === 0) {
    return (
      <div style={{ ...ss.body, textAlign:'center', paddingTop:'48px' }}>
        <div style={{ fontSize:'14px', color:C.muted }}>Nessun log ancora.</div>
        <div style={{ fontSize:'12px', color:C.hint, marginTop:'8px' }}>Salva il primo allenamento per vedere i dati qui.</div>
      </div>
    )
  }

  return (
    <div style={ss.body}>
      {confirmDel && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
          onClick={() => setConfirmDel(null)}>
          <div style={{ background:C.surface, borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'340px', border:`1px solid ${C.redBorder}` }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:'16px', fontWeight:'700', color:C.text, marginBottom:'8px' }}>Elimina esercizio</div>
            <div style={{ fontSize:'13px', color:C.muted, marginBottom:'20px', lineHeight:'1.5' }}>
              Vuoi eliminare tutti i log di <strong style={{ color:C.text }}>{confirmDel}</strong>? Azione irreversibile.
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <div style={{ flex:1, padding:'12px', textAlign:'center', borderRadius:'10px', cursor:'pointer', background:C.bg, border:`1px solid ${C.border}`, fontSize:'13px', color:C.muted }}
                onClick={() => setConfirmDel(null)}>Annulla</div>
              <div style={{ flex:1, padding:'12px', textAlign:'center', borderRadius:'10px', cursor:'pointer', background:C.redBg, border:`1px solid ${C.redBorder}`, fontSize:'13px', fontWeight:'600', color:C.red, opacity: deleting ? 0.6 : 1 }}
                onClick={async () => {
                  if (deleting) return
                  setDeleting(true)
                  await deleteExerciseLogs(confirmDel)
                  await onDataChanged()
                  setDeleting(false); setConfirmDel(null); setSelectedEx(null)
                }}>
                {deleting ? '...' : 'Elimina'}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEx && (
        <div style={{ ...ss.card, marginBottom:'16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
            <div style={{ fontSize:'13px', fontWeight:'600', color:C.text }}>{selectedEx}</div>
            <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
              <div style={{ fontSize:'11px', color:C.red, cursor:'pointer', opacity:0.7 }} onClick={() => setConfirmDel(selectedEx)}>Elimina</div>
              <div style={{ fontSize:'11px', color:C.hint, cursor:'pointer', padding:'4px 8px' }} onClick={() => setSelectedEx(null)}>✕</div>
            </div>
          </div>
          {(() => {
            const byDate = {}
            ;(byEx[selectedEx] || []).forEach(log => {
              if (!byDate[log.log_date]) byDate[log.log_date] = []
              byDate[log.log_date].push(log)
            })
            return Object.entries(byDate).map(([date, logs]) => (
              <div key={date} style={{ padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:'10px', color:C.hint, marginBottom:'5px' }}>{date}</div>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {logs.map((log, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'4px', background:C.bg, padding:'4px 8px', borderRadius:'6px', border:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:'9px', color:C.hint }}>G{log.sets_done || i+1}</span>
                      {log.weight_kg && <span style={{ fontSize:'12px', fontWeight:'700', color:C.violetLight }}>{log.weight_kg}kg</span>}
                      {log.reps_done && <span style={{ fontSize:'11px', color:C.muted }}>×{log.reps_done}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
          {(byEx[selectedEx] || []).length >= 2 && (
            <div style={{ position:'relative', height:'120px', marginTop:'12px' }}><canvas ref={canvasRef} /></div>
          )}
        </div>
      )}

      {exercises.map(ex => {
        const logs = byEx[ex]
        const aggregated = aggregateByDate(logs)
        const lastAgg = aggregated[aggregated.length - 1]
        const lastLog = logs[0]
        return (
          <div key={ex}
            style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px',
              background: selectedEx === ex ? C.violetBg : C.surface,
              borderRadius:'12px', marginBottom:'6px',
              border:`1px solid ${selectedEx === ex ? C.violetBorder : C.border}`,
              cursor:'pointer' }}
            onClick={() => setSelectedEx(selectedEx === ex ? null : ex)}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'12px', fontWeight:'600', color:C.text }}>{ex}</div>
              <div style={{ fontSize:'10px', color:C.hint, marginTop:'2px' }}>{aggregated.length} sessioni</div>
            </div>
            <div style={{ textAlign:'right' }}>
              {lastLog.weight_kg
                ? <div style={{ fontSize:'13px', fontWeight:'700', color:C.violetLight }}>{lastLog.weight_kg}kg</div>
                : lastLog.reps_done
                ? <div style={{ fontSize:'13px', fontWeight:'700', color:C.muted }}>{lastLog.reps_done} reps</div>
                : null
              }
              {lastAgg && <div style={{ fontSize:'9px', color:C.hint }}>vol {Math.round(lastAgg.totalVolume)}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── CORSA SECTION ──────────────────────────────────────────────────
function CorsaSection({ runningLogs, onRefresh }) {
  const canvasPaceRef = React.useRef(null)
  const canvasKmRef   = React.useRef(null)
  const chartPaceRef  = React.useRef(null)
  const chartKmRef    = React.useRef(null)

  const sorted = [...runningLogs].sort((a, b) => a.log_date.localeCompare(b.log_date))
  const withPaceHr = sorted.filter(r => r.pace_avg && r.hr_avg)

  const weeklyKm = React.useMemo(() => {
    const weeks = {}
    sorted.forEach(r => {
      if (!r.distance_km) return
      const d = new Date(r.log_date + 'T12:00:00')
      const mon = new Date(d); mon.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))
      const key = mon.toISOString().split('T')[0]
      if (!weeks[key]) weeks[key] = 0
      weeks[key] += parseFloat(r.distance_km)
    })
    return Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0])).map(([w, km]) => ({ w, km: parseFloat(km.toFixed(1)) }))
  }, [runningLogs])

  const paceToSec = (pace) => {
    if (!pace) return null
    const parts = pace.split(':')
    if (parts.length !== 2) return null
    return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }

  React.useEffect(() => {
    if (canvasPaceRef.current && withPaceHr.length >= 2) {
      if (chartPaceRef.current) chartPaceRef.current.destroy()
      chartPaceRef.current = new Chart(canvasPaceRef.current, {
        type: 'line',
        data: {
          labels: withPaceHr.map(r => fmtDateShort(r.log_date)),
          datasets: [
            { label: 'Passo (sec/km)', data: withPaceHr.map(r => paceToSec(r.pace_avg)), borderColor: C.orange, backgroundColor: C.orangeBg, tension: 0.35, fill: false, pointRadius: 4, borderWidth: 2, yAxisID: 'y' },
            { label: 'FC media (bpm)', data: withPaceHr.map(r => r.hr_avg), borderColor: C.red, backgroundColor: C.redBg, tension: 0.35, fill: false, pointRadius: 4, borderWidth: 2, yAxisID: 'y2' },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: true, labels: { color: '#888', font: { size: 9 }, boxWidth: 10 } } },
          scales: {
            x: { ticks: { color: '#888', font: { size: 9 } }, grid: { color: '#1E1E1E' } },
            y: { position: 'left', ticks: { color: C.orange, font: { size: 9 }, callback: v => { const m = Math.floor(v/60); return `${m}:${String(v%60).padStart(2,'0')}` } }, grid: { color: '#1E1E1E' } },
            y2: { position: 'right', ticks: { color: C.red, font: { size: 9 } }, grid: { display: false } },
          },
        },
      })
    }
    if (canvasKmRef.current && weeklyKm.length >= 2) {
      if (chartKmRef.current) chartKmRef.current.destroy()
      chartKmRef.current = new Chart(canvasKmRef.current, {
        type: 'line',
        data: {
          labels: weeklyKm.map(w => fmtDateShort(w.w)),
          datasets: [{ data: weeklyKm.map(w => w.km), borderColor: C.violet, backgroundColor: 'rgba(123,111,232,0.1)', tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, pointBackgroundColor: C.violet }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#888', font: { size: 9 } }, grid: { color: '#1E1E1E' } }, y: { ticks: { color: '#888', font: { size: 9 } }, grid: { color: '#1E1E1E' } } } },
      })
    }
    return () => {
      if (chartPaceRef.current) chartPaceRef.current.destroy()
      if (chartKmRef.current) chartKmRef.current.destroy()
    }
  }, [runningLogs])

  if (sorted.length === 0) {
    return (
      <div style={{ ...ss.body, textAlign: 'center', paddingTop: '48px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏃</div>
        <div style={{ fontSize: '14px', color: C.muted }}>Nessuna uscita ancora.</div>
        <div style={{ fontSize: '12px', color: C.hint, marginTop: '8px' }}>Registra la prima dalla schermata della sessione CORSA.</div>
      </div>
    )
  }

  const totalKm = sorted.reduce((s, r) => s + (parseFloat(r.distance_km) || 0), 0)
  const avgHr   = sorted.filter(r => r.hr_avg).reduce((s, r, _, a) => s + r.hr_avg / a.length, 0)

  return (
    <div style={ss.body}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {[
          { l: 'Km totali', v: totalKm.toFixed(1), c: C.violet },
          { l: 'FC media',  v: avgHr ? Math.round(avgHr) + ' bpm' : '—', c: C.red },
          { l: 'Uscite',    v: sorted.length, c: C.orange },
        ].map(it => (
          <div key={it.l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: it.c }}>{it.v}</div>
            <div style={{ fontSize: '9px', color: C.hint, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: '3px' }}>{it.l}</div>
          </div>
        ))}
      </div>
      {withPaceHr.length >= 2 && (
        <div style={ss.card}>
          <div style={ss.secLbl}>Passo Medio vs FC — correlazione</div>
          <div style={{ position: 'relative', height: '160px' }}><canvas ref={canvasPaceRef} /></div>
          <div style={{ fontSize: '10px', color: C.hint, marginTop: '8px' }}>Passo che cala con FC stabile = miglioramento aerobico 📈</div>
        </div>
      )}
      {weeklyKm.length >= 2 && (
        <div style={ss.card}>
          <div style={ss.secLbl}>Volume km settimanale</div>
          <div style={{ position: 'relative', height: '130px' }}><canvas ref={canvasKmRef} /></div>
        </div>
      )}
      <div style={ss.card}>
        <div style={ss.secLbl}>Storico uscite</div>
        {[...sorted].reverse().map((r, i) => (
          <div key={r.id || i} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: C.text }}>{fmtDateShort(r.log_date)}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {r.distance_km && <div style={{ fontSize: '11px', fontWeight: '700', color: C.violetLight }}>{r.distance_km} km</div>}
                {r.pace_avg    && <div style={{ fontSize: '11px', color: C.orange }}>⏱ {r.pace_avg}/km</div>}
                {r.hr_avg      && <div style={{ fontSize: '11px', color: C.red }}>♥ {r.hr_avg} bpm</div>}
                {r.elevation_m && <div style={{ fontSize: '11px', color: C.muted }}>↑ {r.elevation_m}m</div>}
                {r.rpe && (
                  <div style={{ fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '999px',
                    background: r.rpe <= 6 ? C.greenBg : r.rpe <= 8 ? C.amberBg : C.redBg,
                    color: r.rpe <= 6 ? C.greenLight : r.rpe <= 8 ? C.amberLight : C.redLight }}>
                    RPE {r.rpe}
                  </div>
                )}
              </div>
            </div>
            {r.notes && <div style={{ fontSize: '11px', color: C.hint, marginTop: '4px', fontStyle: 'italic' }}>{r.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── TEST FORM ──────────────────────────────────────────────────────
function TestForm({ fitSessions, onSaved }) {
  const [formDate, setFormDate] = React.useState(todayStr())
  const [formPeso, setFormPeso] = React.useState('')
  const [fv,       setFv]       = React.useState({})
  const [saving,   setSaving]   = React.useState(false)
  const [savedMsg, setSavedMsg] = React.useState(false)

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
export default function AllenamentoSection({ initialSub, onSubChange, trainingLogs, setTrainingLogs, fitSessions, setFitSessions, videos, onVideosChange }) {
  const [sub, setSub]                     = React.useState(initialSub || 'oggi')
  const [selectedEntry, setSelectedEntry] = React.useState(null)
  const [showMetrics,   setShowMetrics]   = React.useState(false)
  const [sessionNotes,  setSessionNotes]  = React.useState([])
  const [runningLogs,   setRunningLogs]   = React.useState([])
  const [climbingSessions, setClimbingSessions] = React.useState([])
  const [crags,         setCrags]         = React.useState([])
  const [ascents,       setAscents]       = React.useState([])
  const today      = todayStr()
  const todayEntry = getTodayCalEntry()

  React.useEffect(() => {
    if (initialSub && initialSub !== sub) setSub(initialSub)
  }, [initialSub])

  const changeSub = (s) => { setSub(s); onSubChange?.(s) }

  const onLogsChanged = async () => {
    const logs  = await loadTrainingLogs()
    const notes = await loadSessionNotes()
    setTrainingLogs(logs)
    setSessionNotes(notes)
  }
  const onFitSaved = async () => { const sessions = await loadFitnessSessions(); setFitSessions(sessions) }

  React.useEffect(() => {
    loadSessionNotes().then(setSessionNotes)
    loadRunningLogs().then(setRunningLogs)
    loadClimbingSessions().then(setClimbingSessions)
    loadCrags().then(setCrags)
    loadAscents().then(setAscents)
  }, [])

  if (showMetrics) {
    return <MetricsDetail
      fitSessions={fitSessions}
      onBack={() => setShowMetrics(false)}
      onGoToTest={() => { setShowMetrics(false); changeSub('test') }}
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
      sessionNotes={sessionNotes}
      climbingSessions={climbingSessions}
      crags={crags}
      ascents={ascents}
    />
  }

  const renderOggi = () => {
    const todayChange = sessionNotes.find(n =>
      n.note_date === today && n.original_session && n.original_session !== n.session_type
    )
    const todayDisplayType = todayChange?.session_type || todayEntry?.session_type

    return (
      <div style={ss.body}>
        {todayEntry ? (() => {
          const sc      = SESSION_COLORS[todayDisplayType] || SESSION_COLORS.REST
          const scOrig  = SESSION_COLORS[todayEntry.session_type] || SESSION_COLORS.REST
          const isChanged = !!todayChange
          return (
            <div style={{ background: sc.bg, border:`1px solid ${isChanged ? C.amberBorder : sc.border}`, borderRadius:'16px', padding:'20px', marginBottom:'16px', cursor:'pointer' }}
              onClick={() => setSelectedEntry(todayEntry)}>
              <div style={{ fontSize:'9px', fontWeight:'600', letterSpacing:'.08em', textTransform:'uppercase', color: sc.text, marginBottom:'8px', display:'flex', alignItems:'center', gap:'6px' }}>
                Oggi · Settimana {todayEntry.week}{todayEntry.scarico ? ' · SCARICO' : ''}
                {isChanged && <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:C.amber, display:'inline-block' }} />}
              </div>
              <div style={{ fontSize:'24px', fontWeight:'700', color:C.text }}>{sc.label}</div>
              {isChanged && <div style={{ fontSize:'10px', color:C.amber, marginTop:'3px', opacity:0.8 }}>modificato · pianificato: {scOrig.label}</div>}
              {!isChanged && todayEntry.also && <div style={{ fontSize:'11px', color: sc.text, opacity:0.8, marginTop:'3px' }}>+ {SESSION_COLORS[todayEntry.also]?.label}</div>}
              <div style={{ marginTop:'14px', fontSize:'10px', fontWeight:'600', color: sc.text }}>Apri sessione →</div>
            </div>
          )
        })() : (
          <div style={{ ...ss.card, textAlign:'center', padding:'24px' }}>
            <div style={{ fontSize:'14px', color:C.muted }}>Nessun allenamento oggi nel piano</div>
          </div>
        )}

        <div style={ss.card}>
          <div style={ss.secLbl}>Questa settimana</div>
          <div style={{ display:'flex', gap:'5px', overflowX:'auto', paddingBottom:'4px' }}>
            {TRAINING_PLAN.calendar.filter(e => e.day_date >= today).slice(0, 8).map((entry, i) => {
              const changed = sessionNotes.find(n =>
                n.note_date === entry.day_date && n.original_session && n.original_session !== n.session_type
              )
              const displayType = changed?.session_type || entry.session_type
              const sc      = SESSION_COLORS[displayType] || SESSION_COLORS.REST
              const isToday = entry.day_date === today
              return (
                <div key={i} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor:'pointer' }}
                  onClick={() => setSelectedEntry(entry)}>
                  <div style={{ fontSize:'9px', fontWeight:'600', color: isToday ? C.text : C.hint, textTransform:'uppercase' }}>{fmtDayName(entry.day_date)}</div>
                  <div style={{ position:'relative', width:'36px', height:'36px' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'9px', background: isToday ? sc.bg : '#161616', border:`1px solid ${isToday ? sc.border : C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <div style={{ fontSize:'7px', fontWeight:'700', color: sc.text, textAlign:'center', lineHeight:'1.3', padding:'2px' }}>
                        {displayType === 'REST' ? '—' : sc.label.slice(0, 6)}
                      </div>
                    </div>
                    {changed && <div style={{ position:'absolute', top:'-2px', right:'-2px', width:'8px', height:'8px', borderRadius:'50%', background:C.amber, border:`1px solid ${C.bg}` }} />}
                  </div>
                  <div style={{ fontSize:'8px', color: isToday ? C.text : C.hint }}>{fmtDateShort(entry.day_date).split(' ')[0]}</div>
                </div>
              )
            })}
          </div>
        </div>

        <BenchmarkWidget fitSessions={fitSessions} onOpenMetrics={() => setShowMetrics(true)} />

        <div style={{ textAlign:'center', marginTop:'-4px', marginBottom:'8px' }}>
          <div style={{ fontSize:'11px', color:C.hint, cursor:'pointer', padding:'8px' }} onClick={() => changeSub('test')}>
            + Registra nuovo test
          </div>
        </div>
      </div>
    )
  }

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
              const changedNote = sessionNotes.find(n =>
                n.note_date === entry.day_date && n.original_session && n.original_session !== n.session_type
              )
              const displayType = changedNote ? changedNote.session_type : entry.session_type
              const sc      = SESSION_COLORS[displayType] || SESSION_COLORS.REST
              const scOrig  = SESSION_COLORS[entry.session_type] || SESSION_COLORS.REST
              const isToday = entry.day_date === today
              const isPast  = entry.day_date < today
              const isChanged = !!changedNote
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background: isToday ? sc.bg : C.surface, borderRadius:'10px', marginBottom:'5px', border:`1px solid ${isToday ? sc.border : C.border}`, cursor:'pointer', opacity: isPast ? 0.5 : 1 }}
                  onClick={() => setSelectedEntry(entry)}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: isChanged ? C.amber : sc.text, flexShrink:0, opacity: displayType === 'REST' ? 0.2 : 1 }} />
                  <div style={{ width:'38px', fontSize:'10px', color: isToday ? sc.text : C.muted, fontWeight: isToday ? '700' : '400', flexShrink:0 }}>
                    {fmtDateShort(entry.day_date)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'12px', fontWeight:'600', color: displayType === 'REST' ? C.hint : C.text }}>
                      {sc.label}
                      {isChanged && <span style={{ fontSize:'9px', color:C.amber, marginLeft:'6px', fontWeight:'400' }}>modificato</span>}
                    </div>
                    {isChanged && <div style={{ fontSize:'10px', color:C.hint }}>pianificato: {scOrig.label}</div>}
                    {!isChanged && entry.also && <div style={{ fontSize:'10px', color:C.muted }}>+ {SESSION_COLORS[entry.also]?.label}</div>}
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
    <div style={{ paddingBottom: '160px' }}>
      <div style={ss.hdr}>
        <div style={ss.eyebrow}>Piano · {TRAINING_PLAN.meta.goal}</div>
        <div style={ss.title}>Allenamento</div>
        <div style={ss.subtitle}>{todayEntry ? `oggi: ${SESSION_COLORS[todayEntry.session_type]?.label}` : 'nessun allenamento oggi'}</div>
      </div>
      {sub === 'oggi'     && renderOggi()}
      {sub === 'piano'    && renderPiano()}
      {sub === 'storico'  && <StoricoAllenamenti trainingLogs={trainingLogs} sessionNotes={sessionNotes} onDataChanged={onLogsChanged} />}
      {sub === 'esercizi' && <ExercisesTable trainingLogs={trainingLogs} onDataChanged={onLogsChanged} />}
      {sub === 'corsa'    && <CorsaSection runningLogs={runningLogs} onRefresh={() => loadRunningLogs().then(setRunningLogs)} />}
      {sub === 'test'     && <TestForm fitSessions={fitSessions} onSaved={onFitSaved} />}
    </div>
  )
}
