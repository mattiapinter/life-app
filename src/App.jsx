import React from 'react'
import { C, ss, DAYS, INIT_OPTS } from './constants'
import {
  syncPlanToSupabase, loadPlanFromSupabase,
  syncFoodOptionsToSupabase, loadFoodOptionsFromSupabase,
  loadFitnessSessions, loadTrainingLogs, loadExerciseVideos,
  loadSessionNotes, loadHrvLogs, saveHrvLog, getUser, onAuthChange,
} from './lib/supabase'
import { db } from './lib/supabase'

import HomeSection        from './components/Home'
import DietaSection       from './components/Dieta'
import AllenamentoSection from './components/Allenamento'
import ScalateSection     from './components/Scalate'
import CorpoSection       from './components/Corpo'
import LoginScreen        from './components/Login'
import { IcoHome, IcoDiet, IcoTrain, IcoClimb } from './components/Icons'

const IcoMenu = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <line x1="3" y1="6"  x2="17" y2="6"  stroke={C.muted} strokeWidth="1.6" strokeLinecap="round" />
    <line x1="3" y1="10" x2="17" y2="10" stroke={C.muted} strokeWidth="1.6" strokeLinecap="round" />
    <line x1="3" y1="14" x2="17" y2="14" stroke={C.muted} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const MACRO = [
  { id: 'home',        label: 'Home',        emoji: '🏠' },
  { id: 'allenamento', label: 'Allenamento', emoji: '💪' },
  { id: 'scalate',     label: 'Scalate',     emoji: '🧗' },
  { id: 'dieta',       label: 'Dieta',       emoji: '🥗' },
]

const SUB = {
  home:        [],
  allenamento: [
    { id: 'oggi',      l: 'Oggi' },
    { id: 'piano',     l: 'Piano' },
    { id: 'storico',   l: 'Storico' },
    { id: 'esercizi',  l: 'Esercizi' },
    { id: 'corsa',     l: 'Corsa' },
    { id: 'test',      l: 'Test' },
  ],
  scalate: [
    { id: 'falesie',   l: 'Falesie' },
    { id: 'tiri',      l: 'Tiri' },
    { id: 'progetti',  l: 'Progetti' },
    { id: 'stats',     l: 'Stats' },
  ],
  dieta: [
    { id: 'piano',     l: 'Piano' },
    { id: 'spesa',     l: 'Spesa' },
    { id: 'misure',    l: 'Misure' },
    { id: 'opzioni',   l: 'Opzioni' },
  ],
}

function SidebarDrawer({ open, onClose, macro, setMacro, onLogout }) {
  const startX = React.useRef(null)
  const handleTouchStart = (e) => { startX.current = e.touches[0].clientX }
  const handleTouchEnd   = (e) => {
    if (startX.current === null) return
    if (startX.current - e.changedTouches[0].clientX > 60) onClose()
    startX.current = null
  }

  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition:'opacity .25s', backdropFilter: open ? 'blur(2px)' : 'none' }} onClick={onClose} />
      <div style={{ position:'fixed', top:0, left:0, bottom:0, width:'260px', zIndex:101, background:C.surface, borderRight:`1px solid ${C.border}`, transform: open ? 'translateX(0)' : 'translateX(-100%)', transition:'transform .28s cubic-bezier(.4,0,.2,1)', display:'flex', flexDirection:'column' }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

        {/* FIX: padding-top usa safe area per non sovrapporsi alla Dynamic Island */}
        <div style={{ padding:'calc(env(safe-area-inset-top, 44px) + 12px) 20px 16px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:'11px', fontWeight:'700', color:C.violet, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'4px' }}>LIFE</div>
          <div style={{ fontSize:'13px', color:C.muted }}>Pinter</div>
        </div>

        <div style={{ flex:1, padding:'8px 0', overflowY:'auto' }}>
          {MACRO.map(sec => {
            const isActive = macro === sec.id
            return (
              <div key={sec.id}
                style={{ display:'flex', alignItems:'center', gap:'14px', padding:'16px 20px', cursor:'pointer', background: isActive ? C.violetBg : 'transparent', borderRight: isActive ? `3px solid ${C.violet}` : '3px solid transparent' }}
                onClick={() => { setMacro(sec.id); onClose() }}>
                <div style={{ fontSize:'20px', lineHeight:1 }}>{sec.emoji}</div>
                <div style={{ fontSize:'14px', fontWeight: isActive ? '700' : '400', color: isActive ? C.violetLight : C.textSoft }}>{sec.label}</div>
                {isActive && <div style={{ marginLeft:'auto', width:'6px', height:'6px', borderRadius:'50%', background:C.violet }} />}
              </div>
            )
          })}
        </div>

        <div style={{ padding:'16px 20px', borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:'11px', color:C.red, cursor:'pointer', opacity:0.7 }} onClick={onLogout}>
            Esci →
          </div>
        </div>
      </div>
    </>
  )
}

function BottomNav({ macro, sub, setSub }) {
  const subTabs = SUB[macro] || []
  if (subTabs.length === 0) return null
  return (
    <nav style={ss.bnav}>
      <div style={{ ...ss.bnavInner, justifyContent: subTabs.length <= 3 ? 'center' : 'space-around', gap: subTabs.length <= 3 ? '32px' : '0' }}>
        {subTabs.map(t => (
          <div key={t.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', padding:'4px 12px', cursor:'pointer' }} onClick={() => setSub(t.id)}>
            <div style={{ fontSize:'11px', fontWeight: sub === t.id ? '700' : '500', color: sub === t.id ? C.violetLight : C.hint, letterSpacing:'.02em', borderBottom: sub === t.id ? `2px solid ${C.violet}` : '2px solid transparent', paddingBottom:'2px' }}>
              {t.l}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}

export default function App() {
  const [user,       setUser]       = React.useState(undefined)
  const [macro,      setMacroRaw]   = React.useState('home')
  const [sub,        setSub]        = React.useState(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [syncing,    setSyncing]    = React.useState(false)

  const [fitSessions,  setFitSessions]  = React.useState([])
  const [trainingLogs, setTrainingLogs] = React.useState([])
  const [sessionNotes, setSessionNotes] = React.useState([])
  const [videos,       setVideos]       = React.useState({})
  const [hrvLogs,      setHrvLogs]      = React.useState([])

  const [foodOptions, setFoodOptions] = React.useState(() => {
    if (localStorage.getItem('life_v') !== '2') {
      localStorage.removeItem('life_options'); localStorage.removeItem('life_plan')
      localStorage.removeItem('life_cart'); localStorage.setItem('life_v', '2')
    }
    try { const s = localStorage.getItem('life_options'); if (s) { const p = JSON.parse(s); if (p.normal && p.ski) return p } } catch(e) {}
    return INIT_OPTS
  })

  const [weeklyPlan, setWeeklyPlan] = React.useState(() => {
    try { const s = localStorage.getItem('life_plan'); if (s) return JSON.parse(s) } catch(e) {}
    const p = {}; DAYS.forEach(d => { p[d] = { isSkiDay: false, meals: {} } }); return p
  })

  React.useEffect(() => {
    const { data: { subscription } } = onAuthChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!user) return
    loadPlanFromSupabase().then(plan => { if (plan) { setWeeklyPlan(plan); localStorage.setItem('life_plan', JSON.stringify(plan)) } })
    loadFoodOptionsFromSupabase().then(opts => { if (opts) { setFoodOptions(opts); localStorage.setItem('life_options', JSON.stringify(opts)) } })
    loadFitnessSessions().then(setFitSessions)
    loadTrainingLogs().then(setTrainingLogs)
    loadSessionNotes().then(setSessionNotes)
    loadHrvLogs().then(setHrvLogs)
    loadExerciseVideos().then(rows => {
      const map = {}; rows.forEach(r => { map[r.exercise_name] = r.video_url }); setVideos(map)
    })
  }, [user])

  React.useEffect(() => { localStorage.setItem('life_options', JSON.stringify(foodOptions)) }, [foodOptions])
  React.useEffect(() => { localStorage.setItem('life_plan',    JSON.stringify(weeklyPlan))  }, [weeklyPlan])

  const syncPlanTimer = React.useRef(null)
  React.useEffect(() => {
    if (!user) return
    clearTimeout(syncPlanTimer.current)
    syncPlanTimer.current = setTimeout(() => { setSyncing(true); syncPlanToSupabase(weeklyPlan).finally(() => setSyncing(false)) }, 1500)
  }, [weeklyPlan, user])

  const syncOptsTimer = React.useRef(null)
  React.useEffect(() => {
    if (!user) return
    clearTimeout(syncOptsTimer.current)
    syncOptsTimer.current = setTimeout(() => { syncFoodOptionsToSupabase(foodOptions) }, 1500)
  }, [foodOptions, user])

  const setMacro = (m) => { setMacroRaw(m); setSub(SUB[m]?.[0]?.id || null) }
  const activeSub = sub || SUB[macro]?.[0]?.id || null
  const handleVideosChange = (name, url) => setVideos(p => ({ ...p, [name]: url }))
  const handleLogout = async () => { await db.auth.signOut(); setUser(null) }

  if (user === undefined) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:'11px', fontWeight:'700', color:C.violet, textTransform:'uppercase', letterSpacing:'.15em' }}>LIFE</div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onLogin={() => {}} />
  }

  return (
    <div style={ss.app}>
      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} macro={macro} setMacro={setMacro} onLogout={handleLogout} />
      <div style={ss.main}>

        {/* FIX: burger posizionato sotto la Dynamic Island usando safe-area-inset-top */}
        <div style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 44px) + 8px)',
          left: '12px',
          zIndex: 50,
          padding: '7px',
          cursor: 'pointer',
          background: C.surface,
          borderRadius: '10px',
          border: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
          onClick={() => setDrawerOpen(true)}>
          <IcoMenu />
        </div>

        {macro === 'home' && (
          <HomeSection weeklyPlan={weeklyPlan} fitSessions={fitSessions} setTab={setMacro} setSub={setSub} sessionNotes={sessionNotes} hrvLogs={hrvLogs} onHrvSaved={() => loadHrvLogs().then(setHrvLogs)} />
        )}
        {macro === 'allenamento' && (
          <AllenamentoSection initialSub={activeSub} onSubChange={setSub} trainingLogs={trainingLogs} setTrainingLogs={setTrainingLogs} fitSessions={fitSessions} setFitSessions={setFitSessions} videos={videos} onVideosChange={handleVideosChange} />
        )}
        {macro === 'scalate' && (
          <ScalateSection initialSub={activeSub} onSubChange={setSub} />
        )}
        {macro === 'dieta' && (
          <DietaSection initialSub={activeSub} onSubChange={setSub} weeklyPlan={weeklyPlan} setWeeklyPlan={setWeeklyPlan} foodOptions={foodOptions} setFoodOptions={setFoodOptions} syncing={syncing} />
        )}

        <BottomNav macro={macro} sub={activeSub} setSub={setSub} />
      </div>
    </div>
  )
}
