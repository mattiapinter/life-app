import { createClient } from '@supabase/supabase-js'

const SUPA_URL = 'https://hqibitypbemsxlooeqfo.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxaWJpdHlwYmVtc3hsb29lcWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDE4NDUsImV4cCI6MjA4OTkxNzg0NX0.1b-CAVcjFezX1d52DgFlIoXPsYOi-hZgVXr5ppJ8_4k'

export const db = createClient(SUPA_URL, SUPA_KEY)

// ── WEEKLY PLAN ────────────────────────────────────────────────────
const getWeekStart = () => {
  const d = new Date(); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff); return d.toISOString().split('T')[0]
}

export const syncPlanToSupabase = async (weeklyPlan) => {
  const ws = getWeekStart()
  const rows = Object.entries(weeklyPlan).map(([day, data]) => ({
    week_start: ws, day_of_week: day,
    is_endurance_day: data.isSkiDay || false,
    meals: data.meals || {},
    updated_at: new Date().toISOString(),
  }))
  try { await db.from('weekly_plan').upsert(rows, { onConflict: 'week_start,day_of_week' }) } catch(e) {}
}

export const loadPlanFromSupabase = async () => {
  const ws = getWeekStart()
  try {
    const { data, error } = await db.from('weekly_plan').select('*').eq('week_start', ws)
    if (error || !data || data.length === 0) return null
    const plan = {}
    data.forEach(row => { plan[row.day_of_week] = { isSkiDay: row.is_endurance_day, meals: row.meals || {} } })
    return plan
  } catch(e) { return null }
}

// ── FOOD OPTIONS ───────────────────────────────────────────────────
const flattenFoodOptions = (foodOptions) => {
  const rows = []
  ;['normal','ski'].forEach(mode => {
    Object.entries(foodOptions[mode] || {}).forEach(([meal, cats]) => {
      Object.entries(cats || {}).forEach(([category, options]) => {
        rows.push({ mode, meal, category, options: options || '', updated_at: new Date().toISOString() })
      })
    })
  })
  return rows
}

const unflattenFoodOptions = (rows) => {
  const opts = { normal: {}, ski: {} }
  ;['normal','ski'].forEach(mode => {
    ;['Colazione','Spuntino','Pranzo','Merenda','Cena'].forEach(meal => {
      opts[mode][meal] = { Carboidrati:'', Proteine:'', Grassi:'' }
    })
  })
  rows.forEach(row => {
    if (opts[row.mode]?.[row.meal]) opts[row.mode][row.meal][row.category] = row.options || ''
  })
  return opts
}

export const syncFoodOptionsToSupabase = async (foodOptions) => {
  const rows = flattenFoodOptions(foodOptions)
  try { await db.from('food_options').upsert(rows, { onConflict: 'mode,meal,category' }) } catch(e) {}
}

export const loadFoodOptionsFromSupabase = async () => {
  try {
    const { data, error } = await db.from('food_options').select('*')
    if (error || !data || data.length === 0) return null
    return unflattenFoodOptions(data)
  } catch(e) { return null }
}

// ── FITNESS SESSIONS ───────────────────────────────────────────────
export const saveFitnessSession = async (session) => {
  try { const { error } = await db.from('fitness_sessions').insert([session]); if (error) throw error; return true }
  catch(e) { return false }
}
export const loadFitnessSessions = async () => {
  try { const { data, error } = await db.from('fitness_sessions').select('*').order('session_date', { ascending: true }); if (error) throw error; return data || [] }
  catch(e) { return [] }
}

// ── TRAINING LOGS ──────────────────────────────────────────────────
export const saveTrainingLog = async (log) => {
  try { const { error } = await db.from('training_logs').insert([log]); if (error) throw error; return true }
  catch(e) { return false }
}
export const loadTrainingLogs = async () => {
  try { const { data, error } = await db.from('training_logs').select('*').order('log_date', { ascending: false }); if (error) throw error; return data || [] }
  catch(e) { return [] }
}

// ── SESSION NOTES ──────────────────────────────────────────────────
export const saveSessionNote = async (note) => {
  try { const { error } = await db.from('session_notes').upsert([note], { onConflict: 'note_date,session_type' }); if (error) throw error; return true }
  catch(e) { return false }
}
export const loadSessionNotes = async () => {
  try { const { data, error } = await db.from('session_notes').select('*').order('note_date', { ascending: false }); if (error) throw error; return data || [] }
  catch(e) { return [] }
}

// ── EXERCISE VIDEOS ────────────────────────────────────────────────
export const saveExerciseVideo = async (exerciseName, videoUrl) => {
  try {
    const { error } = await db.from('exercise_videos').upsert(
      [{ exercise_name: exerciseName, video_url: videoUrl, updated_at: new Date().toISOString() }],
      { onConflict: 'exercise_name' }
    )
    if (error) throw error; return true
  } catch(e) { return false }
}
export const loadExerciseVideos = async () => {
  try { const { data, error } = await db.from('exercise_videos').select('*'); if (error) throw error; return data || [] }
  catch(e) { return [] }
}
