import React from 'react'
import { C, ss, DAYS, INIT_OPTS, todayIdx } from './constants'
import {
  syncPlanToSupabase, loadPlanFromSupabase,
  syncFoodOptionsToSupabase, loadFoodOptionsFromSupabase,
  loadFitnessSessions, loadTrainingLogs, loadExerciseVideos, saveExerciseVideo,
  loadSessionNotes,
} from './lib/supabase'

import HomeSection       from './components/Home'
import DietaSection      from './components/Dieta'
import AllenamentoSection from './components/Allenamento'
import ScalateSection    from './components/Scalate'
import { IcoHome, IcoDiet, IcoTrain, IcoClimb } from './components/Icons'

export default function App() {
  const [tab, setTab]     = React.useState('home')
  const [syncing, setSyncing] = React.useState(false)

  const [fitSessions,   setFitSessions]   = React.useState([])
  const [trainingLogs,  setTrainingLogs]  = React.useState([])
  const [sessionNotes,  setSessionNotes]  = React.useState([])
  const [videos,        setVideos]        = React.useState({}) // { exerciseName: url }

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

  // Load from Supabase on mount
  React.useEffect(() => {
    loadPlanFromSupabase().then(plan => {
      if (plan) { setWeeklyPlan(plan); localStorage.setItem('life_plan', JSON.stringify(plan)) }
    })
    loadFoodOptionsFromSupabase().then(opts => {
      if (opts) { setFoodOptions(opts); localStorage.setItem('life_options', JSON.stringify(opts)) }
    })
    loadFitnessSessions().then(setFitSessions)
    loadTrainingLogs().then(setTrainingLogs)
    loadSessionNotes().then(setSessionNotes)
    loadExerciseVideos().then(rows => {
      const map = {}
      rows.forEach(r => { map[r.exercise_name] = r.video_url })
      setVideos(map)
    })
  }, [])

  // Sync localStorage
  React.useEffect(() => { localStorage.setItem('life_options', JSON.stringify(foodOptions)) }, [foodOptions])
  React.useEffect(() => { localStorage.setItem('life_plan',    JSON.stringify(weeklyPlan))  }, [weeklyPlan])

  // Sync Supabase debounced
  const syncPlanTimer = React.useRef(null)
  React.useEffect(() => {
    clearTimeout(syncPlanTimer.current)
    syncPlanTimer.current = setTimeout(() => {
      setSyncing(true)
      syncPlanToSupabase(weeklyPlan).finally(() => setSyncing(false))
    }, 1500)
  }, [weeklyPlan])

  const syncOptsTimer = React.useRef(null)
  React.useEffect(() => {
    clearTimeout(syncOptsTimer.current)
    syncOptsTimer.current = setTimeout(() => { syncFoodOptionsToSupabase(foodOptions) }, 1500)
  }, [foodOptions])

  // Video change handler
  const handleVideosChange = (exerciseName, url) => {
    setVideos(p => ({ ...p, [exerciseName]: url }))
  }

  const nav = [
    { id:'home',        l:'home',      Icon: IcoHome  },
    { id:'dieta',       l:'dieta',     Icon: IcoDiet  },
    { id:'allenamento', l:'training',  Icon: IcoTrain },
    { id:'scalate',     l:'scalate',   Icon: IcoClimb },
  ]

  return (
    <div style={ss.app}>
      <div style={ss.main}>

        {tab === 'home' && (
          <HomeSection weeklyPlan={weeklyPlan} fitSessions={fitSessions} setTab={setTab} sessionNotes={sessionNotes} />
        )}
        {tab === 'dieta' && (
          <DietaSection
            weeklyPlan={weeklyPlan} setWeeklyPlan={setWeeklyPlan}
            foodOptions={foodOptions} setFoodOptions={setFoodOptions}
            syncing={syncing}
          />
        )}
        {tab === 'allenamento' && (
          <AllenamentoSection
            trainingLogs={trainingLogs} setTrainingLogs={setTrainingLogs}
            fitSessions={fitSessions}   setFitSessions={setFitSessions}
            videos={videos} onVideosChange={handleVideosChange}
          />
        )}
        {tab === 'scalate' && (
          <ScalateSection />
        )}

        {/* Bottom nav */}
        <nav style={ss.bnav}>
          <div style={ss.bnavInner}>
            {nav.map(({ id, l, Icon }) => (
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
