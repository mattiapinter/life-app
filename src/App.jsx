import React from 'react'
import { DAYS, INIT_OPTS } from './constants'
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
    { id: 'opzioni',   l: 'Opzioni' },
  ],
  metriche: []
}

function SubNav({ tabs, active, onChange }) {
  if (tabs.length === 0) return null
  return (
    <nav className="fixed top-0 w-full z-40 bg-background/60 backdrop-blur-xl border-b border-outline-variant/10"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center h-14 px-2 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`.flex::-webkit-scrollbar { display: none; }`}</style>
        {tabs.map(t => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className="flex flex-col items-center gap-1 px-3 py-2 transition-all flex-shrink-0">
              <span
                className={`text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${
                  isActive ? 'text-primary' : 'text-on-surface-variant'
                }`}>
                {t.l}
              </span>
              {isActive && (
                <div
                  className="tab-indicator rounded-full bg-primary"
                  style={{ width: '6px', height: '6px', boxShadow: '0 0 8px rgba(198, 191, 255, 0.7)' }}
                />
              )}
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

  const subTabs = macro === 'scalate' ? [] : (SUB[macro] || [])

  return (
    <div className="min-h-screen bg-background">
      {subTabs.length > 0 && <SubNav tabs={subTabs} active={activeSub} onChange={setSub} />}

      <main className={subTabs.length > 0 ? 'pt-14' : ''}>
        {macro === 'home' && (
          <div key="home" className="page-enter">
            <HomeSection weeklyPlan={weeklyPlan} fitSessions={fitSessions} setTab={setMacro} setSub={setSub} sessionNotes={sessionNotes} hrvLogs={hrvLogs} onHrvSaved={() => loadHrvLogs().then(setHrvLogs)} />
          </div>
        )}
        {macro === 'allenamento' && (
          <div key="allenamento" className="page-enter">
            <AllenamentoSection initialSub={activeSub} onSubChange={setSub} trainingLogs={trainingLogs} setTrainingLogs={setTrainingLogs} fitSessions={fitSessions} setFitSessions={setFitSessions} videos={videos} onVideosChange={handleVideosChange} />
          </div>
        )}
        {macro === 'scalate' && (
          <div key="scalate" className="page-enter">
            <ScalateSection initialSub={activeSub} onSubChange={setSub} />
          </div>
        )}
        {macro === 'dieta' && (
          <div key="dieta" className="page-enter">
            <DietaSection initialSub={activeSub} onSubChange={setSub} weeklyPlan={weeklyPlan} setWeeklyPlan={setWeeklyPlan} foodOptions={foodOptions} setFoodOptions={setFoodOptions} syncing={syncing} />
          </div>
        )}
        {macro === 'metriche' && (
          <div key="metriche" className="page-enter">
            <MetricheSection />
          </div>
        )}
      </main>

      <BottomNav active={macro} onChange={setMacro} />
    </div>
  )
}
