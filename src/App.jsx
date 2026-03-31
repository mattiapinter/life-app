import React from 'react'
import { C, ss, DAYS, INIT_OPTS, todayIdx } from './constants'
import {
  syncPlanToSupabase, loadPlanFromSupabase,
  syncFoodOptionsToSupabase, loadFoodOptionsFromSupabase,
  loadFitnessSessions, loadTrainingLogs, loadExerciseVideos, saveExerciseVideo,
  loadSessionNotes,
} from './lib/supabase'

import HomeSection        from './components/Home'
import DietaSection       from './components/Dieta'
import AllenamentoSection from './components/Allenamento'
import ScalateSection     from './components/Scalate'
import CorpoSection       from './components/Corpo'
import { IcoHome, IcoDiet, IcoTrain, IcoClimb } from './components/Icons'

const IcoCorpo = ({ a }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="5" r="2" stroke={a ? C.violet : C.hint} strokeWidth="1.4" />
    <path d="M7 9h6l1 7H6l1-7z" stroke={a ? C.violet : C.hint} strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M8 9l-2 3M12 9l2 3" stroke={a ? C.violet : C.hint} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const IcoMenu = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <line x1="3" y1="6"  x2="17" y2="6"  stroke={C.muted} strokeWidth="1.6" strokeLinecap="round" />
    <line x1="3" y1="10" x2="17" y2="10" stroke={C.muted} strokeWidth="1.6" strokeLinecap="round" />
    <line x1="3" y1="14" x2="17" y2="14" stroke={C.muted} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const SECTIONS = [
  { id: 'home',        label: 'Home',        emoji: '🏠' },
  { id: 'corpo',       label: 'Corpo',       emoji: '📏' },
  { id: 'allenamento', label: 'Allenamento', emoji: '💪' },
  { id: 'scalate',     label: 'Scalate',     emoji: '🧗' },
  { id: 'dieta',       label: 'Dieta',       emoji: '🥗' },
]

function SidebarDrawer({ open, onClose, tab, setTab }) {
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
      <div style={{ position:'fixed', top:0, left:0, bottom:0, width:'260px', zIndex:101, background:C.surface, borderRight:`1px solid ${C.border}`, transform: open ? 'translateX(0)' : 'translateX(-100%)', transition:'transform .28s cubic-bezier(.4,0,.2,1)', display:'flex', flexDirection:'column' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div style={{ padding:'52px 20px 16px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:'11px', fontWeight:'700', color:C.violet, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'4px' }}>LIFE</div>
          <div style={{ fontSize:'13px', color:C.muted }}>il tuo spazio personale</div>
        </div>
        <div style={{ flex:1, padding:'8px 0', overflowY:'auto' }}>
          {SECTIONS.map(sec => {
            const isActive = tab === sec.id
            return (
              <div key={sec.id} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 20px', cursor:'pointer', background: isActive ? C.violetBg : 'transparent', borderRight: isActive ? `3px solid ${C.violet}` : '3px solid transparent' }} onClick={() => { setTab(sec.id); onClose() }}>
                <div style={{ fontSize:'18px', lineHeight:1 }}>{sec.emoji}</div>
                <div style={{ fontSize:'14px', fontWeight: isActive ? '700' : '400', color: isActive ? C.violetLight : C.textSoft }}>{sec.label}</div>
                {isActive && <div style={{ marginLeft:'auto', width:'6px', height:'6px', borderRadius:'50%', background:C.violet }} />}
              </div>
            )
          })}
        </div>
        <div style={{ padding:'16px 20px', borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:'10px', color:C.hint, lineHeight:'1.6' }}>
            Mattia Brigadoi · <span style={{ color:C.violetLight }}>79.7 kg</span>
          </div>
        </div>
      </div>
    </>
  )
}

export default function App() {
  const [tab,        setTab]        = React.useState('home')
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [syncing,    setSyncing]    = React.useState(false)

  const [fitSessions,  setFitSessions]  = React.useState([])
  const [trainingLogs, setTrainingLogs] = React.useState([])
  const [sessionNotes, setSessionNotes] = React.useState([])
  const [videos,       setVideos]       = React.useState({})

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
    loadPlanFromSupabase().then(plan => { if (plan) { setWeeklyPlan(plan); localStorage.setItem('life_plan', JSON.stringify(plan)) } })
    loadFoodOptionsFromSupabase().then(opts => { if (opts) { setFoodOptions(opts); localStorage.setItem('life_options', JSON.stringify(opts)) } })
    loadFitnessSessions().then(setFitSessions)
    loadTrainingLogs().then(setTrainingLogs)
    loadSessionNotes().then(setSessionNotes)
    loadExerciseVideos().then(rows => {
      const map = {}; rows.forEach(r => { map[r.exercise_name] = r.video_url }); setVideos(map)
    })
  }, [])

  React.useEffect(() => { localStorage.setItem('life_options', JSON.stringify(foodOptions)) }, [foodOptions])
  React.useEffect(() => { localStorage.setItem('life_plan',    JSON.stringify(weeklyPlan))  }, [weeklyPlan])

  const syncPlanTimer = React.useRef(null)
  React.useEffect(() => {
    clearTimeout(syncPlanTimer.current)
    syncPlanTimer.current = setTimeout(() => { setSyncing(true); syncPlanToSupabase(weeklyPlan).finally(() => setSyncing(false)) }, 1500)
  }, [weeklyPlan])

  const syncOptsTimer = React.useRef(null)
  React.useEffect(() => {
    clearTimeout(syncOptsTimer.current)
    syncOptsTimer.current = setTimeout(() => { syncFoodOptionsToSupabase(foodOptions) }, 1500)
  }, [foodOptions])

  const handleVideosChange = (exerciseName, url) => setVideos(p => ({ ...p, [exerciseName]: url }))

  const bottomNav = [
    { id:'home',        Icon:IcoHome,  l:'home' },
    { id:'allenamento', Icon:IcoTrain, l:'training' },
    { id:'scalate',     Icon:IcoClimb, l:'scalate' },
    { id:'dieta',       Icon:IcoDiet,  l:'dieta' },
  ]

  return (
    <div style={ss.app}>
      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} tab={tab} setTab={setTab} />
      <div style={ss.main}>

        {/* Hamburger fisso in alto a sinistra */}
        <div style={{ position:'fixed', top:12, left:12, zIndex:50, padding:'7px', cursor:'pointer', background:C.surface, borderRadius:'10px', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setDrawerOpen(true)}>
          <IcoMenu />
        </div>

        {tab === 'home'        && <HomeSection weeklyPlan={weeklyPlan} fitSessions={fitSessions} setTab={setTab} sessionNotes={sessionNotes} />}
        {tab === 'corpo'       && <CorpoSection />}
        {tab === 'dieta'       && <DietaSection weeklyPlan={weeklyPlan} setWeeklyPlan={setWeeklyPlan} foodOptions={foodOptions} setFoodOptions={setFoodOptions} syncing={syncing} />}
        {tab === 'allenamento' && <AllenamentoSection trainingLogs={trainingLogs} setTrainingLogs={setTrainingLogs} fitSessions={fitSessions} setFitSessions={setFitSessions} videos={videos} onVideosChange={handleVideosChange} />}
        {tab === 'scalate'     && <ScalateSection />}

        <nav style={ss.bnav}>
          <div style={ss.bnavInner}>
            {bottomNav.map(({ id, l, Icon }) => (
              <div key={id} style={ss.bnavItem(tab === id)} onClick={() => setTab(id)}>
                <Icon a={tab === id} />
                <div style={ss.bnavLabel(tab === id)}>{l}</div>
              </div>
            ))}
          </div>
        </nav>

      </div>
    </div>
  )
}
