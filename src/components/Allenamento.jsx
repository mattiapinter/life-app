import React from 'react'
import { Chart, LineController, BarController, LineElement, BarElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'
Chart.register(LineController, BarController, LineElement, BarElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)
import {
  C, ss, SESSION_COLORS, drawer,
  todayStr, fmtDate, fmtDateShort, fmtDayName,
} from '../constants'
import { TRAINING_PLAN } from '../data/trainingPlan'
import { saveTrainingLog, loadTrainingLogs, saveSessionNote, loadSessionNotes, deleteSessionLogs, deleteSessionNote, deleteExerciseLogs, deleteAllTrainingData, saveRunningLog, loadRunningLogs, loadClimbingSessions, loadAscents, loadCrags } from '../lib/supabase'
import { IcoInfo, IcoChev, IcoChevL, IcoPlay } from './Icons'
import { Modal, CoachNoteModal, VideoButton, ChangeSessionDrawer } from './UI'
import PesiRow from './PesiRow'

// ── TIMER UTILITIES ────────────────────────────────────────────────
function parseDuration(str) {
  if (!str) return 30
  const s = String(str).toLowerCase().trim()
  if (s.includes('/')) return Math.max(10, parseInt(s) || 30)
  const minM = s.match(/(\d+)\s*min/)
  if (minM) return parseInt(minM[1]) * 60
  const secM = s.match(/(\d+)\s*s\b/)
  if (secM) return parseInt(secM[1])
  const numM = s.match(/(\d+)/)
  if (numM) {
    const n = parseInt(numM[1])
    if (s.includes('rep') || s.includes('rip')) return Math.max(30, n * 3)
    return n > 0 ? n : 30
  }
  return 30
}

function isPerSide(str) {
  return String(str || '').toLowerCase().includes('lato')
}

function buildTimerSteps(exercises) {
  const steps = []
  for (const ex of exercises) {
    const name = ex.name || ex.grip || ''
    const durStr = ex.duration || ex.reps || ex.protocol || ''
    const duration = parseDuration(durStr)
    if (isPerSide(durStr)) {
      steps.push({ name, detail: durStr, side: 'Lato sinistro', duration })
      steps.push({ name, detail: durStr, side: 'Lato destro', duration })
    } else {
      steps.push({ name, detail: durStr, duration })
    }
  }
  return steps.filter(s => s.name && s.duration > 0)
}

// Module-level AudioContext — created once during user gesture, reused for all beeps
let _audioCtx = null

function unlockAudio() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    // Play silent buffer to unblock iOS autoplay policy
    const buf = _audioCtx.createBuffer(1, 1, 22050)
    const src = _audioCtx.createBufferSource()
    src.buffer = buf; src.connect(_audioCtx.destination); src.start(0)
    _audioCtx.resume()
  } catch {}
}

function playBeep(freq = 880, dur = 0.4) {
  try {
    if (!_audioCtx) return
    _audioCtx.resume().then(() => {
      const osc = _audioCtx.createOscillator()
      const gain = _audioCtx.createGain()
      osc.connect(gain); gain.connect(_audioCtx.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, _audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + dur)
      osc.start(_audioCtx.currentTime); osc.stop(_audioCtx.currentTime + dur)
    })
  } catch {}
}

// ── WARMUP/COOLDOWN TIMER ─────────────────────────────────────────
function WarmupTimer({ steps, title, onClose }) {
  const [stepIdx,      setStepIdx]      = React.useState(0)
  const [timeLeft,     setTimeLeft]     = React.useState(steps[0]?.duration || 30)
  const [paused,       setPaused]       = React.useState(false)
  const [transitioning,setTransitioning]= React.useState(false)
  const [transCount,   setTransCount]   = React.useState(3)
  const [done,         setDone]         = React.useState(false)
  const [elapsed,      setElapsed]      = React.useState(0)
  const startRef = React.useRef(Date.now())

  const cur = steps[stepIdx]

  // Main countdown
  React.useEffect(() => {
    if (paused || transitioning || done) return
    if (timeLeft <= 0) {
      playBeep()
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      if (stepIdx + 1 >= steps.length) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
        setDone(true)
        return
      }
      setTransitioning(true); setTransCount(3)
      return
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, paused, transitioning, done])

  // Transition countdown
  React.useEffect(() => {
    if (!transitioning) return
    if (transCount <= 0) {
      const next = stepIdx + 1
      setStepIdx(next); setTimeLeft(steps[next].duration); setTransitioning(false)
      return
    }
    const id = setTimeout(() => setTransCount(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [transitioning, transCount])

  const handleSkip = () => {
    playBeep(660, 0.15)
    const next = stepIdx + 1
    if (next >= steps.length) {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      setDone(true); return
    }
    setTransitioning(false); setStepIdx(next); setTimeLeft(steps[next].duration)
  }

  const R = 72, CIRC = 2 * Math.PI * R
  const dashOffset = CIRC * (1 - timeLeft / (cur?.duration || 1))
  const fmtTime = s => s >= 60 ? `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` : String(s)
  const fmtElapsed = s => { const m=Math.floor(s/60),sec=s%60; return m>0?`${m} min${sec>0?' '+sec+'s':''}`:`${sec}s` }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'#131313', display:'flex', flexDirection:'column',
      paddingTop:'env(safe-area-inset-top,0px)', paddingBottom:'env(safe-area-inset-bottom,0px)', boxSizing:'border-box' }}>
      {done ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px', textAlign:'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize:'80px', color:'#4ae176', marginBottom:'20px' }}>check_circle</span>
          <div style={{ fontSize:'22px', fontWeight:'800', color:'#e5e2e1', marginBottom:'8px', lineHeight:'1.2' }}>{title} completato</div>
          <div style={{ fontSize:'13px', color:'#928f9f', marginBottom:'48px' }}>Durata: {fmtElapsed(elapsed)}</div>
          <button type="button" onClick={onClose}
            style={{ padding:'15px 48px', borderRadius:'14px', background:'linear-gradient(135deg,#c6bfff 0%,#8c81fb 100%)', color:'#160066', fontSize:'15px', fontWeight:'800', border:'none', cursor:'pointer' }}>
            Chiudi
          </button>
        </div>
      ) : (
        <>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', flexShrink:0 }}>
            <button type="button" onClick={onClose}
              style={{ width:'40px', height:'40px', borderRadius:'50%', background:'#201f1f', border:'1px solid #474553', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize:'20px', color:'#c8c4d5' }}>close</span>
            </button>
            <div style={{ fontSize:'13px', fontWeight:'700', color:'#c8c4d5' }}>{stepIdx+1} di {steps.length}</div>
            <div style={{ width:'40px' }} />
          </div>

          <div style={{ height:'3px', background:'#353534', margin:'0 20px', borderRadius:'99px', flexShrink:0 }}>
            <div style={{ height:'100%', background:'#c6bfff', borderRadius:'99px', width:`${(stepIdx/steps.length)*100}%`, transition:'width 0.6s ease' }} />
          </div>

          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 32px' }}>
            <div style={{ fontSize:'26px', fontWeight:'800', color:'#e5e2e1', textAlign:'center', lineHeight:'1.2', marginBottom: cur?.side ? '6px' : '8px' }}>
              {cur?.name}
            </div>
            {cur?.side && (
              <div style={{ fontSize:'13px', fontWeight:'700', color:'#c6bfff', letterSpacing:'.05em', textTransform:'uppercase', marginBottom:'6px' }}>{cur.side}</div>
            )}
            {cur?.detail && (
              <div style={{ fontSize:'13px', color:'#928f9f', marginBottom:'40px' }}>{cur.detail}</div>
            )}

            <div style={{ position:'relative', width:'180px', height:'180px', marginBottom:'40px' }}>
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r={R} fill="none" stroke="#353534" strokeWidth="9" />
                <circle cx="90" cy="90" r={R} fill="none" stroke="#c6bfff" strokeWidth="9"
                  strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={dashOffset}
                  style={{ transformOrigin:'90px 90px', transform:'rotate(-90deg)', transition: timeLeft>0 ? 'stroke-dashoffset 1s linear' : 'none' }} />
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{ fontSize:'44px', fontWeight:'800', color:'#e5e2e1', lineHeight:'1', fontFamily:"'Manrope',sans-serif" }}>{fmtTime(timeLeft)}</div>
                {timeLeft < 60 && <div style={{ fontSize:'12px', color:'#928f9f', marginTop:'4px' }}>sec</div>}
              </div>
            </div>

            <div style={{ display:'flex', gap:'12px' }}>
              <button type="button" onClick={() => setPaused(p => !p)}
                style={{ display:'flex', alignItems:'center', gap:'8px', padding:'13px 24px', borderRadius:'999px', background:'#201f1f', border:'1px solid #474553', fontSize:'14px', fontWeight:'700', color:'#e5e2e1', cursor:'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'20px' }}>{paused ? 'play_arrow' : 'pause'}</span>
                {paused ? 'Riprendi' : 'Pausa'}
              </button>
              <button type="button" onClick={handleSkip}
                style={{ display:'flex', alignItems:'center', gap:'8px', padding:'13px 24px', borderRadius:'999px', background:'#201f1f', border:'1px solid #474553', fontSize:'14px', fontWeight:'700', color:'#e5e2e1', cursor:'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'20px' }}>skip_next</span>
                Salta
              </button>
            </div>
            <button type="button" onClick={onClose}
              style={{ marginTop:'24px', fontSize:'13px', fontWeight:'600', color:'#928f9f', background:'none', border:'none', cursor:'pointer', letterSpacing:'.04em' }}>
              Termina
            </button>
          </div>

          {transitioning && (
            <div style={{ position:'absolute', inset:0, background:'rgba(19,19,19,0.96)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:1 }}>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'#928f9f', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:'20px' }}>Prossimo</div>
              <div style={{ fontSize:'24px', fontWeight:'800', color:'#e5e2e1', textAlign:'center', marginBottom: steps[stepIdx+1]?.side ? '8px' : '32px', padding:'0 32px' }}>
                {steps[stepIdx+1]?.name}
              </div>
              {steps[stepIdx+1]?.side && (
                <div style={{ fontSize:'13px', fontWeight:'700', color:'#c6bfff', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'32px' }}>
                  {steps[stepIdx+1].side}
                </div>
              )}
              <div style={{ fontSize:'72px', fontWeight:'800', color:'#c6bfff', lineHeight:'1', fontFamily:"'Manrope',sans-serif" }}>{transCount}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function getCoachNoteText(sessionType) {
  const raw = TRAINING_PLAN.coach_notes.sessions[sessionType]
  return raw && String(raw).trim() ? String(raw).trim() : null
}

function getLastSameTypeSession(trainingLogs, sessionType, todayIso) {
  const candidates = (trainingLogs || []).filter(
    l => l.session_type === sessionType && l.log_date && l.log_date < todayIso
  )
  if (!candidates.length) return null
  const dates = [...new Set(candidates.map(l => l.log_date))].sort((a, b) => b.localeCompare(a))
  const d = dates[0]
  const logs = candidates.filter(l => l.log_date === d)
  const rpeLog = logs.find(l => l.rpe_actual != null)
  const rpe = rpeLog?.rpe_actual ?? rpeLog?.rpe
  const byName = {}
  logs.forEach(l => {
    if (!l.exercise_name) return
    const prev = byName[l.exercise_name]
    if (!prev || (l.sets_done || 0) > (prev.sets_done || 0)) byName[l.exercise_name] = l
  })
  const parts = Object.keys(byName).map(name => {
    const l = byName[name]
    const w = l.weight_kg
    const r = l.reps_done
    if (w != null && r != null) return `${name} ${w}kg x${r}`
    if (r != null) return `${name} x${r}`
    if (w != null) return `${name} ${w}kg`
    return name
  })
  return { date: d, rpe, parts }
}

function OggiCoachNoteCard({ note }) {
  const [expanded, setExpanded] = React.useState(false)
  return (
    <div style={ss.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: C.violetLight }}>school</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: C.text }}>Nota coach</span>
      </div>
      <p
        style={{
          fontSize: 13,
          color: C.textSoft,
          lineHeight: 1.75,
          ...(!expanded
            ? {
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : {}),
        }}>
        {note}
      </p>
      <button
        type="button"
        style={{
          marginTop: 10,
          fontSize: 11,
          fontWeight: 600,
          color: C.primary,
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
          textAlign: 'left',
        }}
        onClick={() => setExpanded(x => !x)}>
        {expanded ? 'Mostra meno' : 'Leggi tutto'}
      </button>
    </div>
  )
}

function OggiUltimaVoltaCard({ snapshot }) {
  return (
    <div style={ss.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: C.hint }}>history</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: C.text }}>Ultima volta</span>
      </div>
      {snapshot ? (
        <>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Ultima volta: {fmtDateShort(snapshot.date)}</div>
          {snapshot.rpe != null && (
            <div style={{ fontSize: 12, color: C.text, marginBottom: 8 }}>RPE: {snapshot.rpe}</div>
          )}
          {snapshot.parts.length > 0 && (
            <div style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.6 }}>{snapshot.parts.join(' | ')}</div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>
          Prima volta con questa sessione. Registra i carichi oggi per avere un riferimento la prossima volta.
        </div>
      )}
    </div>
  )
}

// ── SESSION DETAIL ─────────────────────────────────────────────────
function SessionDetail({ entry, onBack, trainingLogs, onLogsChanged, videos, onVideosChange, sessionNotes, climbingSessions, crags, ascents }) {
  const [showCoach,    setShowCoach]    = React.useState(false)
  const [showWarmup,   setShowWarmup]   = React.useState(false)
  const [showCooldown, setShowCooldown] = React.useState(false)
  const [timerProps,   setTimerProps]   = React.useState(null)
  const [useWarmup2,   setUseWarmup2]   = React.useState(
    () => ['PLACCA_VERTICALE','STRAPIOMBO','DAY_PROJECT','STRAPIOMBO_TRAZIONI_SETT4'].includes(entry.session_type)
  )
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
  const isChanged    = !!savedChange

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
      {timerProps && <WarmupTimer steps={timerProps.steps} title={timerProps.title} onClose={() => setTimerProps(null)} />}
      {showCoach && <CoachNoteModal sessionType={sessionType} sessionLabel={sc.label} accentColor={sc.text} note={coachNote} onClose={() => setShowCoach(false)} />}
      {showChange && <ChangeSessionDrawer currentEntry={entry} onClose={() => setShowChange(false)} onChanged={(type) => setOverrideType(type)} />}

      <div className="px-6 pb-6" style={{ paddingTop: '16px' }}>
        <div className="flex items-center justify-between mb-2">
          <button type="button" onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container border border-outline-variant/30 active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>arrow_back</span>
          </button>
          {sessionType !== 'REST' && (
            <button type="button" onClick={() => setShowCoach(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container border border-outline-variant/30 active:scale-95 transition-transform">
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: sc.text }}>info</span>
            </button>
          )}
        </div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: sc.text }}>
          Settimana {week}{entry.scarico ? ' · Scarico' : ''}
        </p>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight mb-3" style={{ color: sc.text }}>
          {sc.label}
        </h1>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant/20 text-on-surface-variant">
            {fmtDateShort(entry.day_date)}
          </span>
          {entry.also && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full border text-on-surface-variant"
              style={{ borderColor: sc.border, background: sc.bg }}>
              + {SESSION_COLORS[entry.also]?.label}
            </span>
          )}
          {entry.scarico && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
              Settimana scarico
            </span>
          )}
          {isChanged && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>
              Modificato
            </span>
          )}
        </div>
        <div className="mt-5 h-px w-16 rounded-full" style={{ background: sc.text, opacity: 0.6 }} />
      </div>

      <div style={ss.body}>
        {/* Riscaldamento — prima card nel corpo, collassabile */}
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low overflow-hidden mb-5">
          <button type="button" onClick={() => setShowWarmup(v => !v)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              {showWarmup ? 'expand_less' : 'expand_more'}
            </span>
            <span className="material-symbols-outlined text-xl" style={{ color: sc.text }}>heat</span>
            <span className="flex-1 text-sm font-bold uppercase tracking-widest text-on-surface">Riscaldamento</span>
            {!needsWarmup2 && (
              <div className="flex gap-1 text-[10px]" onClick={e => e.stopPropagation()}>
                <span
                  className={`px-2 py-1 rounded-full font-bold cursor-pointer ${!useWarmup2 ? 'bg-primary/20 text-primary' : 'text-on-surface-variant'}`}
                  onClick={() => setUseWarmup2(false)}>Casa</span>
                <span
                  className={`px-2 py-1 rounded-full font-bold cursor-pointer ${useWarmup2 ? 'bg-primary/20 text-primary' : 'text-on-surface-variant'}`}
                  onClick={() => setUseWarmup2(true)}>Falesia</span>
              </div>
            )}
          </button>
          {showWarmup && (
            <div className="px-4 pb-4 pt-1 border-t border-outline-variant/10">
              {useWarmup2 ? (
                <>
                  <div style={{ fontSize:'11px', fontWeight:'600', color:C.hint, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'10px', marginTop:'8px' }}>Falesia (23 min)</div>
                  {TRAINING_PLAN.warmup_2.exercises.map((ex, i) => <WarmupRow key={i} ex={ex} />)}
                </>
              ) : (
                <>
                  <div style={{ fontSize:'11px', fontWeight:'600', color:C.hint, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'10px', marginTop:'8px' }}>Casa / Palestra (20 min)</div>
                  {TRAINING_PLAN.warmup_1.exercises.map((ex, i) => <WarmupRow key={i} ex={ex} />)}
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
              <button type="button"
                onClick={() => {
                  const exs = useWarmup2
                    ? TRAINING_PLAN.warmup_2.exercises
                    : [...TRAINING_PLAN.warmup_1.exercises, ...TRAINING_PLAN.warmup_1.trave.map(t => ({ name: t.grip, duration: t.protocol }))]
                  unlockAudio(); setTimerProps({ steps: buildTimerSteps(exs), title: 'Riscaldamento' })
                }}
                className="w-full mt-4 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider active:scale-[0.98] transition-transform"
                style={{ background:'linear-gradient(135deg,#c6bfff 0%,#8c81fb 100%)', color:'#160066', boxShadow:'0 4px 16px rgba(198,191,255,0.2)', border:'none', cursor:'pointer' }}>
                Avvia riscaldamento
              </button>
            </div>
          )}
        </div>
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
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low overflow-hidden mb-5">
              <button type="button" onClick={() => setShowCooldown(v => !v)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                <span className="material-symbols-outlined text-on-surface-variant text-xl">
                  {showCooldown ? 'expand_less' : 'expand_more'}
                </span>
                <span className="material-symbols-outlined text-xl" style={{ color: sc.text }}>spa</span>
                <span className="flex-1 text-sm font-bold uppercase tracking-widest text-on-surface">Defaticamento</span>
              </button>
              {showCooldown && (
                <div className="px-4 pb-4 pt-1 border-t border-outline-variant/10">
                  <div style={{ fontSize:'11px', fontWeight:'600', color:C.hint, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'10px', marginTop:'8px' }}>15 min</div>
                  {TRAINING_PLAN.cooldown.exercises.map((ex, i) => <WarmupRow key={i} ex={ex} />)}
                  <button type="button"
                    onClick={() => { unlockAudio(); setTimerProps({ steps: buildTimerSteps(TRAINING_PLAN.cooldown.exercises), title: 'Defaticamento' }) }}
                    className="w-full mt-4 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider active:scale-[0.98] transition-transform"
                    style={{ background:'linear-gradient(135deg,#c6bfff 0%,#8c81fb 100%)', color:'#160066', boxShadow:'0 4px 16px rgba(198,191,255,0.2)', border:'none', cursor:'pointer' }}>
                    Avvia defaticamento
                  </button>
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
        <div style={drawer.centerOverlay(undefined, 'rgba(0,0,0,0.85)')} onClick={() => setConfirmDel(null)}>
          <div style={{ ...drawer.centerCard, maxWidth: '340px', background:C.surface, borderRadius:'16px', padding:'24px', border:`1px solid ${C.redBorder}` }}
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
        <div style={drawer.centerOverlay(undefined, 'rgba(0,0,0,0.9)')} onClick={() => setShowNuke(false)}>
          <div style={{ ...drawer.centerCard, maxWidth: '340px', background:C.surface, borderRadius:'16px', padding:'24px', border:`1px solid ${C.redBorder}` }}
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

                {note && (() => {
                  const text = note.note_text || ''
                  const isLong = text.length > 120
                  const preview = isLong ? text.slice(0, 120).trimEnd() + '...' : text
                  return (
                    <div style={{ marginTop:'10px', padding:'10px', background:C.bg, borderRadius:'8px', border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.primary}` }}>
                      <div style={{ fontSize:'9px', fontWeight:'700', color:C.primary, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'5px' }}>Nota sessione</div>
                      <div style={{ fontSize:'12px', color:C.muted, lineHeight:'1.6' }}>
                        {noteOpen ? text : preview}
                      </div>
                      {isLong && (
                        <div style={{ fontSize:'10px', fontWeight:'700', color:C.primary, marginTop:'6px', cursor:'pointer' }}
                          onClick={(e) => { e.stopPropagation(); setNoteExpanded(noteOpen ? null : key) }}>
                          {noteOpen ? 'Mostra meno ▲' : 'Leggi di più ▼'}
                        </div>
                      )}
                    </div>
                  )
                })()}

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
        <div style={drawer.centerOverlay(undefined, 'rgba(0,0,0,0.85)')} onClick={() => setConfirmDel(null)}>
          <div style={{ ...drawer.centerCard, maxWidth: '340px', background:C.surface, borderRadius:'16px', padding:'24px', border:`1px solid ${C.redBorder}` }}
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

// ── PAST SESSION DETAIL ───────────────────────────────────────────
function PastSessionDetail({ entry, trainingLogs, sessionNotes, onBack, onOpenFull }) {
  const [noteExpanded, setNoteExpanded] = React.useState(false)

  const sessionType = entry.session_type
  const sc = SESSION_COLORS[sessionType] || SESSION_COLORS.REST

  const logs = (trainingLogs || []).filter(
    l => l.log_date === entry.day_date && l.session_type === entry.session_type
  )
  const note = (sessionNotes || []).find(n => n.note_date === entry.day_date)
  const hasLogs = logs.length > 0

  const rpeLog = logs.find(l => l.rpe_actual != null)
  const rpe = rpeLog?.rpe_actual ?? null

  const byExercise = {}
  logs.forEach(l => {
    if (!l.exercise_name) return
    if (!byExercise[l.exercise_name]) byExercise[l.exercise_name] = []
    byExercise[l.exercise_name].push(l)
  })
  const hasExercises = Object.keys(byExercise).length > 0

  return (
    <div>
      <div className="px-6 pb-6" style={{ paddingTop: '16px' }}>
        <div className="flex items-center mb-2">
          <button type="button" onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container border border-outline-variant/30 active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>arrow_back</span>
          </button>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: sc.text }}>
          Settimana {entry.week}{entry.scarico ? ' · Scarico' : ''}
        </p>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight mb-3" style={{ color: sc.text }}>
          {sc.label}
        </h1>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant/20 text-on-surface-variant">
            {fmtDateShort(entry.day_date)}
          </span>
          {entry.also && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full border text-on-surface-variant"
              style={{ borderColor: sc.border, background: sc.bg }}>
              + {SESSION_COLORS[entry.also]?.label}
            </span>
          )}
          {entry.scarico && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
              Settimana scarico
            </span>
          )}
        </div>
        <div className="mt-5 h-px w-16 rounded-full" style={{ background: sc.text, opacity: 0.6 }} />
      </div>

      <div style={ss.body}>
        {hasLogs ? (
          <div style={ss.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: C.green }}>check_circle</span>
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.12em', textTransform: 'uppercase', color: C.text }}>Log salvato</span>
              {rpe != null && (
                <div style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '999px',
                  background: rpe <= 6 ? C.greenBg : rpe <= 8 ? C.amberBg : C.redBg,
                  color:      rpe <= 6 ? C.greenLight : rpe <= 8 ? C.amberLight : C.redLight }}>
                  RPE {rpe}
                </div>
              )}
            </div>

            {hasExercises ? (
              Object.entries(byExercise).map(([exName, exLogs]) => (
                <div key={exName} style={{ padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: C.textSoft, marginBottom: '6px' }}>{exName}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {exLogs.map((l, i) => {
                      const setParts = []
                      if (l.weight_kg != null) setParts.push(`${l.weight_kg}kg`)
                      if (l.reps_done != null) setParts.push(`${l.reps_done} reps`)
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: C.bg, padding: '4px 8px', borderRadius: '6px', border: `1px solid ${C.border}` }}>
                          <span style={{ fontSize: '9px', color: C.hint }}>G{l.sets_done || i + 1}</span>
                          {l.weight_kg != null && <span style={{ fontSize: '12px', fontWeight: '700', color: C.violetLight }}>{l.weight_kg}kg</span>}
                          {l.reps_done != null && <span style={{ fontSize: '11px', color: C.muted }}>×{l.reps_done}</span>}
                          {setParts.length === 0 && <span style={{ fontSize: '11px', color: C.hint }}>completato</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '12px', color: C.hint }}>Sessione completata.</div>
            )}
          </div>
        ) : (
          <div style={{ ...ss.card, textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '14px', color: C.muted }}>Nessun dato registrato per questa sessione.</div>
          </div>
        )}

        {note?.note_text && (() => {
          const text = note.note_text
          const isLong = text.length > 100
          return (
            <div style={{ ...ss.card, borderLeft: `3px solid ${C.primary}` }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: C.primary, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>Nota sessione</div>
              <div style={{ fontSize: '13px', color: C.textSoft, lineHeight: '1.65' }}>
                {isLong && !noteExpanded ? text.slice(0, 100).trimEnd() + '...' : text}
              </div>
              {isLong && (
                <button type="button"
                  style={{ marginTop: '8px', fontSize: '11px', fontWeight: '600', color: C.primary, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                  onClick={() => setNoteExpanded(x => !x)}>
                  {noteExpanded ? 'Mostra meno' : 'Leggi tutto'}
                </button>
              )}
            </div>
          )
        })()}

        <div
          style={{
            ...ss.savBtn,
            ...(hasLogs ? { background: C.surface, border: `1px solid ${C.border}`, color: C.muted, boxShadow: 'none' } : {}),
          }}
          onClick={onOpenFull}>
          {hasLogs ? 'Modifica o aggiungi dati' : 'Registra questa sessione'}
        </div>
      </div>
    </div>
  )
}

// ── OGGI WARMUP CARD ──────────────────────────────────────────────
function OggiWarmupCard({ videos, onVideosChange }) {
  const [open,      setOpen]      = React.useState(false)
  const [palestra,  setPalestra]  = React.useState(true)
  const [timerProps,setTimerProps]= React.useState(null)

  const WarmupRow = ({ ex }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', fontWeight: '500', color: C.text }}>{ex.name}</div>
        {ex.note && <div style={{ fontSize: '10px', color: C.hint, marginTop: '1px' }}>{ex.note}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: C.muted }}>
            {ex.sets && `${ex.sets}×`}{ex.duration || (ex.reps && (typeof ex.reps === 'number' ? `${ex.reps} reps` : ex.reps))}
          </div>
          {ex.load && <div style={{ fontSize: '10px', color: C.violet }}>{ex.load}</div>}
          {ex.protocol && <div style={{ fontSize: '10px', color: C.violet }}>{ex.protocol}</div>}
        </div>
        <VideoButton exerciseName={ex.name} videos={videos} onVideosChange={onVideosChange} />
      </div>
    </div>
  )

  return (
    <>
    {timerProps && <WarmupTimer steps={timerProps.steps} title={timerProps.title} onClose={() => setTimerProps(null)} />}
    <div style={ss.card}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setOpen(x => !x)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: C.amber }}>heat</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: C.text }}>Riscaldamento</span>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: C.hint, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>expand_more</span>
      </div>
      {open && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {[{ l: 'Palestra / Casa', v: true }, { l: 'Falesia', v: false }].map(opt => (
              <button
                key={String(opt.v)}
                type="button"
                style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: palestra === opt.v ? C.violetBg : C.bg,
                  border: `1px solid ${palestra === opt.v ? C.violetBorder : C.border}`,
                  color: palestra === opt.v ? C.violetLight : C.hint }}
                onClick={() => setPalestra(opt.v)}
              >
                {opt.l}
              </button>
            ))}
          </div>
          {palestra ? (
            <>
              {TRAINING_PLAN.warmup_1.exercises.map((ex, i) => <WarmupRow key={i} ex={ex} />)}
              <div style={{ fontSize: 11, fontWeight: 600, color: C.hint, textTransform: 'uppercase', letterSpacing: '.08em', margin: '12px 0 8px' }}>Trave (10 min)</div>
              {TRAINING_PLAN.warmup_1.trave.map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: C.text }}>{t.grip}</div>
                    <div style={{ fontSize: 10, color: C.hint, marginTop: 1 }}>{t.exercise}</div>
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: C.violet }}>{t.protocol}</div>
                      <div style={{ fontSize: 10, color: C.hint }}>{t.load}</div>
                    </div>
                    <VideoButton exerciseName={t.grip} videos={videos} onVideosChange={onVideosChange} />
                  </div>
                </div>
              ))}
            </>
          ) : (
            TRAINING_PLAN.warmup_2.exercises.map((ex, i) => <WarmupRow key={i} ex={ex} />)
          )}
          <button type="button"
            onClick={() => {
              const exs = palestra
                ? [...TRAINING_PLAN.warmup_1.exercises, ...TRAINING_PLAN.warmup_1.trave.map(t => ({ name: t.grip, duration: t.protocol }))]
                : TRAINING_PLAN.warmup_2.exercises
              unlockAudio(); setTimerProps({ steps: buildTimerSteps(exs), title: 'Riscaldamento' })
            }}
            className="w-full mt-4 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider active:scale-[0.98] transition-transform"
            style={{ background:'linear-gradient(135deg,#c6bfff 0%,#8c81fb 100%)', color:'#160066', boxShadow:'0 4px 16px rgba(198,191,255,0.2)', border:'none', cursor:'pointer' }}>
            Avvia riscaldamento
          </button>
        </div>
      )}
    </div>
  </>
  )
}

// ── OGGI COOLDOWN CARD ─────────────────────────────────────────────
function OggiCooldownCard({ videos, onVideosChange }) {
  const [open,      setOpen]      = React.useState(false)
  const [timerProps,setTimerProps]= React.useState(null)

  const WarmupRow = ({ ex }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'12px', fontWeight:'500', color:C.text }}>{ex.name}</div>
        {ex.note && <div style={{ fontSize:'10px', color:C.hint, marginTop:'1px' }}>{ex.note}</div>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginLeft:'8px' }}>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:'11px', color:C.muted }}>{ex.duration}</div>
        </div>
        <VideoButton exerciseName={ex.name} videos={videos} onVideosChange={onVideosChange} />
      </div>
    </div>
  )

  return (
  <>
    {timerProps && <WarmupTimer steps={timerProps.steps} title={timerProps.title} onClose={() => setTimerProps(null)} />}
    <div style={ss.card}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setOpen(x => !x)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: C.violetLight }}>spa</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: C.text }}>Defaticamento</span>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: C.hint, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>expand_more</span>
      </div>
      {open && (
        <div style={{ marginTop: 12 }}>
          {TRAINING_PLAN.cooldown.exercises.map((ex, i) => <WarmupRow key={i} ex={ex} />)}
          <button type="button"
            onClick={() => { unlockAudio(); setTimerProps({ steps: buildTimerSteps(TRAINING_PLAN.cooldown.exercises), title: 'Defaticamento' }) }}
            className="w-full mt-4 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider active:scale-[0.98] transition-transform"
            style={{ background:'linear-gradient(135deg,#c6bfff 0%,#8c81fb 100%)', color:'#160066', boxShadow:'0 4px 16px rgba(198,191,255,0.2)', border:'none', cursor:'pointer' }}>
            Avvia defaticamento
          </button>
        </div>
      )}
    </div>
  </>
  )
}

// ── MAIN ALLENAMENTO ───────────────────────────────────────────────
export default function AllenamentoSection({ initialSub, onSubChange, trainingLogs, setTrainingLogs, fitSessions, setFitSessions, videos, onVideosChange, onOpenFitnessTests, activePlan, trainingCalendar = [] }) {
  const [sub, setSub]                     = React.useState(initialSub || 'oggi')
  const [selectedEntry, setSelectedEntry] = React.useState(null)
  const [pastEntry,     setPastEntry]     = React.useState(null)
  const [sessionNotes,  setSessionNotes]  = React.useState([])
  const [runningLogs,   setRunningLogs]   = React.useState([])
  const [climbingSessions, setClimbingSessions] = React.useState([])
  const [crags,         setCrags]         = React.useState([])
  const [ascents,       setAscents]       = React.useState([])
  const today      = todayStr()
  const todayEntry = trainingCalendar.find(e => e.day_date === today) || null

  React.useEffect(() => {
    if (initialSub && initialSub !== sub) {
      setSelectedEntry(null)
      setPastEntry(null)
      setSub(initialSub)
    }
  }, [initialSub])

  const changeSub = (s) => {
    setSelectedEntry(null)
    setPastEntry(null)
    setSub(s)
    onSubChange?.(s)
  }

  const onLogsChanged = async () => {
    const logs  = await loadTrainingLogs()
    const notes = await loadSessionNotes()
    setTrainingLogs(logs)
    setSessionNotes(notes)
  }
  React.useEffect(() => {
    loadSessionNotes().then(setSessionNotes)
    loadRunningLogs().then(setRunningLogs)
    loadClimbingSessions().then(setClimbingSessions)
    loadCrags().then(setCrags)
    loadAscents().then(setAscents)
  }, [])

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

  if (pastEntry) {
    return <PastSessionDetail
      entry={pastEntry}
      trainingLogs={trainingLogs}
      sessionNotes={sessionNotes}
      onBack={() => setPastEntry(null)}
      onOpenFull={() => { setSelectedEntry(pastEntry); setPastEntry(null) }}
    />
  }

  const renderOggi = () => {
    const todayChange = sessionNotes.find(n =>
      n.note_date === today && n.original_session && n.original_session !== n.session_type
    )
    const todayDisplayType = todayChange?.session_type || todayEntry?.session_type
    const coachNoteOggi = todayEntry ? getCoachNoteText(todayDisplayType) : null
    const lastSnapOggi = todayEntry
      ? getLastSameTypeSession(trainingLogs, todayDisplayType, today)
      : null

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
          {trainingCalendar.length === 0 ? (
            <div style={{ display:'flex', gap:'5px', paddingBottom:'4px' }}>
              {[0,1,2,3,4,5,6].map(i => (
                <div key={i} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                  <div style={{ width:'28px', height:'8px', borderRadius:'4px', background:C.border, opacity:0.5 }} />
                  <div style={{ width:'36px', height:'36px', borderRadius:'9px', background:C.border, opacity:0.3 }} />
                  <div style={{ width:'20px', height:'7px', borderRadius:'4px', background:C.border, opacity:0.5 }} />
                </div>
              ))}
            </div>
          ) : (
          <div style={{ display:'flex', gap:'5px', overflowX:'auto', paddingBottom:'4px' }}>
            {trainingCalendar.filter(e => e.day_date >= today).slice(0, 8).map((entry, i) => {
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
          )}
        </div>

        {coachNoteOggi && <OggiCoachNoteCard note={coachNoteOggi} />}

        <OggiUltimaVoltaCard snapshot={lastSnapOggi} />
        <OggiWarmupCard videos={videos} onVideosChange={onVideosChange} />
        <OggiCooldownCard videos={videos} onVideosChange={onVideosChange} />
      </div>
    )
  }

  const renderPiano = () => {
    if (trainingCalendar.length === 0) {
      return (
        <div style={ss.body}>
          <div style={{ fontSize:'13px', color:C.muted, textAlign:'center', padding:'32px 0' }}>
            Caricamento piano in corso...
          </div>
        </div>
      )
    }
    const planWeeks = [...new Set(trainingCalendar.map(e => e.week))].sort((a, b) => a - b)
    return (
    <div style={ss.body}>
      <div style={{ fontSize:'11px', color:C.muted, marginBottom:'16px', lineHeight:'1.5' }}>
        {TRAINING_PLAN.meta.goal} · {planWeeks.length} {planWeeks.length === 1 ? 'settimana' : 'settimane'}
      </div>
      {planWeeks.map(w => {
        const entries = trainingCalendar.filter(e => e.week === w)
        return (
          <div key={w} style={{ marginBottom:'20px' }}>
            <div style={{ fontSize:'11px', fontWeight:'700', color: entries[0]?.scarico ? C.amber : C.violetLight, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'8px' }}>
              Settimana {w}{entries[0]?.scarico ? ' — Scarico' : ''}
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
                  onClick={() => isPast ? setPastEntry(entry) : setSelectedEntry(entry)}>
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
  }

  return (
    <div style={{ paddingBottom: '160px', maxWidth: '448px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={ss.hdr}>
        <div style={ss.eyebrow}>Piano · {TRAINING_PLAN.meta.goal}</div>
        <div style={ss.title}>Allenamento</div>
        <div style={ss.subtitle}>{todayEntry ? `Allenamento oggi: ${SESSION_COLORS[todayEntry.session_type]?.label}` : 'Nessun allenamento oggi'}</div>
      </div>
      {sub === 'oggi'     && renderOggi()}
      {sub === 'piano'    && renderPiano()}
      {sub === 'storico'  && <StoricoAllenamenti trainingLogs={trainingLogs} sessionNotes={sessionNotes} onDataChanged={onLogsChanged} />}
      {sub === 'esercizi' && <ExercisesTable trainingLogs={trainingLogs} onDataChanged={onLogsChanged} />}
      {sub === 'corsa'    && <CorsaSection runningLogs={runningLogs} onRefresh={() => loadRunningLogs().then(setRunningLogs)} />}
    </div>
  )
}
