import React from 'react'
import { DAYS, INIT_OPTS } from './constants'
import {
  syncPlanToSupabase, loadPlanFromSupabase,
  syncFoodOptionsToSupabase, loadFoodOptionsFromSupabase,
  loadFitnessSessions, loadTrainingLogs, loadExerciseVideos,
  loadSessionNotes, loadHrvLogs, getUser, onAuthChange,
  loadHealthLogs, loadHealthLogToday, loadAscents, loadClimbingSessions,
  loadActivePlan, loadTrainingCalendar,
} from './lib/supabase'
import { db } from './lib/supabase'

import HomeSection        from './components/Home'
import DietaSection       from './components/Dieta'
import AllenamentoSection from './components/Allenamento'
import ScalateSection     from './components/Scalate'
import MetricheSection    from './components/Corpo'
import LoginScreen        from './components/Login'
import BottomNav          from './components/BottomNav'

const SUB = {
  home:        [],
  allenamento: [
    { id: 'oggi',      l: 'Oggi' },
    { id: 'piano',     l: 'Piano' },
    { id: 'storico',   l: 'Storico' },
    { id: 'esercizi',  l: 'Esercizi' },
    { id: 'corsa',     l: 'Corsa' },
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
    { id: 'opzioni',   l: 'Opzioni' },
  ],
  dati: [
    { id: 'biometria',  l: 'Biometria' },
    { id: 'hrv',       l: 'HRV' },
    { id: 'testfisici', l: 'Test fisici' },
    { id: 'insights',  l: 'Insights' },
  ],
}

function SubNav({ tabs, active, onChange }) {
  if (tabs.length === 0) return null
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 rounded-b-3xl bg-[#1c1b1b]/88 backdrop-blur-2xl border-b border-outline-variant/15 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div
        className="subnav-scroll flex flex-nowrap items-center justify-start gap-1 min-h-[52px] w-full max-w-lg mx-auto px-3 py-2 overflow-x-auto overscroll-x-contain touch-pan-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        <style>{`.subnav-scroll::-webkit-scrollbar { display: none; }`}</style>
        {tabs.map(t => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`flex-shrink-0 rounded-xl px-3.5 py-2.5 transition-all duration-200 active:scale-[0.97] ${
                isActive
                  ? 'bg-primary/12 text-primary shadow-[0_0_20px_rgba(198,191,255,0.12)]'
                  : 'text-on-surface-variant/75 hover:text-on-surface-variant'
              }`}>
              <span className="font-label text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">
                {t.l}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default function App() {
  const [user,       setUser]       = React.useState(undefined)
  const [macro,      setMacroRaw]   = React.useState('home')
  const [sub,        setSub]        = React.useState(null)

  const [fitSessions,  setFitSessions]  = React.useState([])
  const [trainingLogs, setTrainingLogs] = React.useState([])
  const [sessionNotes, setSessionNotes] = React.useState([])
  const [videos,       setVideos]       = React.useState({})
  const [hrvLogs,      setHrvLogs]      = React.useState([])
  const [healthLogs,   setHealthLogs]   = React.useState([])
  const [healthLogToday, setHealthLogToday] = React.useState(null)
  const [ascents,      setAscents]      = React.useState([])
  const [climbingSessions, setClimbingSessions] = React.useState([])
  const [activePlan,   setActivePlan]   = React.useState(null)
  const [trainingCalendar, setTrainingCalendar] = React.useState([])

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
    loadHealthLogs().then(setHealthLogs)
    loadHealthLogToday().then(setHealthLogToday)
    loadAscents().then(setAscents)
    loadClimbingSessions().then(setClimbingSessions)
    loadActivePlan().then(setActivePlan)
    loadTrainingCalendar().then(setTrainingCalendar)
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
    syncPlanTimer.current = setTimeout(() => { syncPlanToSupabase(weeklyPlan) }, 1500)
  }, [weeklyPlan, user])

  const syncOptsTimer = React.useRef(null)
  React.useEffect(() => {
    if (!user) return
    clearTimeout(syncOptsTimer.current)
    syncOptsTimer.current = setTimeout(() => { syncFoodOptionsToSupabase(foodOptions) }, 1500)
  }, [foodOptions, user])

  const setMacro = (m) => { setMacroRaw(m); setSub(SUB[m]?.[0]?.id || null) }
  const goToDatiTab = (tabId) => {
    setMacroRaw('dati')
    setSub(tabId)
  }

  const refreshWellnessData = () => {
    loadHrvLogs().then(setHrvLogs)
    loadHealthLogs().then(setHealthLogs)
    loadHealthLogToday().then(setHealthLogToday)
  }
  const activeSub = sub || SUB[macro]?.[0]?.id || null
  const handleVideosChange = (name, url) => setVideos(p => ({ ...p, [name]: url }))
  const handleLogout = async () => { await db.auth.signOut(); setUser(null) }

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center overflow-hidden">
        <div className="logo-loader">
          <div className="text-6xl font-headline font-extrabold tracking-tighter text-primary uppercase">
            LIFE
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onLogin={() => {}} />
  }

  const subTabs = SUB[macro] || []

  return (
    <div className="min-h-screen bg-background">
      {subTabs.length > 0 && <SubNav tabs={subTabs} active={activeSub} onChange={setSub} />}

      <main className={subTabs.length > 0 ? 'pt-[calc(64px+env(safe-area-inset-top,0px))]' : ''}>
        {macro === 'home' && (
          <div key="home" className="page-enter">
            <HomeSection
              weeklyPlan={weeklyPlan}
              fitSessions={fitSessions}
              setTab={setMacro}
              setSub={setSub}
              sessionNotes={sessionNotes}
              hrvLogs={hrvLogs}
              healthLogs={healthLogs}
              healthLogToday={healthLogToday}
              onHrvSaved={refreshWellnessData}
              activePlan={activePlan}
              trainingCalendar={trainingCalendar}
            />
          </div>
        )}
        {macro === 'allenamento' && (
          <div key="allenamento" className="page-enter">
            <AllenamentoSection initialSub={activeSub} onSubChange={setSub} trainingLogs={trainingLogs} setTrainingLogs={setTrainingLogs} fitSessions={fitSessions} setFitSessions={setFitSessions} videos={videos} onVideosChange={handleVideosChange} onOpenFitnessTests={() => goToDatiTab('testfisici')} activePlan={activePlan} trainingCalendar={trainingCalendar} />
          </div>
        )}
        {macro === 'scalate' && (
          <div key="scalate" className="page-enter">
            <ScalateSection initialSub={activeSub} onSubChange={setSub} />
          </div>
        )}
        {macro === 'dieta' && (
          <div key="dieta" className="page-enter">
            <DietaSection initialSub={activeSub} onSubChange={setSub} weeklyPlan={weeklyPlan} setWeeklyPlan={setWeeklyPlan} foodOptions={foodOptions} setFoodOptions={setFoodOptions} />
          </div>
        )}
        {macro === 'dati' && (
          <div key="dati" className="page-enter">
            <MetricheSection
              initialSub={activeSub}
              onSubChange={setSub}
              fitSessions={fitSessions}
              setFitSessions={setFitSessions}
              hrvLogs={hrvLogs}
              healthLogs={healthLogs}
              healthLogToday={healthLogToday}
              trainingLogs={trainingLogs}
              ascents={ascents}
              climbingSessions={climbingSessions}
              onHrvSaved={refreshWellnessData}
            />
          </div>
        )}
      </main>

      <BottomNav active={macro} onChange={setMacro} />
    </div>
  )
}
