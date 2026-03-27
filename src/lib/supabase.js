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

// ── DELETE ─────────────────────────────────────────────────────────
export const deleteSessionLogs = async (date, sessionType) => {
  try {
    const { error } = await db.from('training_logs')
      .delete()
      .eq('log_date', date)
      .eq('session_type', sessionType)
    if (error) throw error; return true
  } catch(e) { return false }
}

export const deleteExerciseLogs = async (exerciseName) => {
  try {
    const { error } = await db.from('training_logs').delete().eq('exercise_name', exerciseName)
    if (error) throw error; return true
  } catch(e) { return false }
}

export const deleteTrainingLog = async (id) => {
  try {
    const { error } = await db.from('training_logs').delete().eq('id', id)
    if (error) throw error; return true
  } catch(e) { return false }
}

export const deleteSessionNote = async (date, sessionType) => {
  try {
    const { error } = await db.from('session_notes')
      .delete()
      .eq('note_date', date)
      .eq('session_type', sessionType)
    if (error) throw error; return true
  } catch(e) { return false }
}

export const deleteAllTrainingData = async () => {
  try {
    await db.from('training_logs').delete().neq('id', 0)
    await db.from('session_notes').delete().neq('id', 0)
    return true
  } catch(e) { return false }
}

// ── CRAGS ──────────────────────────────────────────────────────────
export const loadCrags = async () => {
  try {
    const { data, error } = await db.from('crags').select('*').order('name')
    if (error) throw error
    return data || []
  } catch(e) { return [] }
}

export const saveCrag = async (crag) => {
  try {
    if (crag.id) {
      const { error } = await db.from('crags').update({
        name: crag.name, region: crag.region, rock_type: crag.rock_type,
        notes: crag.notes, lat: crag.lat, lng: crag.lng,
      }).eq('id', crag.id)
      if (error) throw error
      return crag.id
    } else {
      const { data, error } = await db.from('crags').insert([{
        name: crag.name, region: crag.region, rock_type: crag.rock_type,
        notes: crag.notes, lat: crag.lat, lng: crag.lng,
      }]).select('id').single()
      if (error) throw error
      return data?.id
    }
  } catch(e) { return null }
}

export const deleteCrag = async (id) => {
  try {
    const { error } = await db.from('crags').delete().eq('id', id)
    if (error) throw error
    return true
  } catch(e) { return false }
}

// ── CLIMBING SESSIONS ──────────────────────────────────────────────
export const loadClimbingSessions = async () => {
  try {
    const { data, error } = await db.from('climbing_sessions').select('*').order('session_date', { ascending: false })
    if (error) throw error
    return data || []
  } catch(e) { return [] }
}

export const saveClimbingSession = async (session) => {
  try {
    if (session.id) {
      const { error } = await db.from('climbing_sessions').update({
        session_date: session.session_date, crag_id: session.crag_id,
        type: session.type || 'falesia', notes: session.notes,
      }).eq('id', session.id)
      if (error) throw error
      return session.id
    } else {
      const { data, error } = await db.from('climbing_sessions').insert([{
        session_date: session.session_date, crag_id: session.crag_id,
        type: session.type || 'falesia', notes: session.notes,
      }]).select('id').single()
      if (error) throw error
      return data?.id
    }
  } catch(e) { return null }
}

export const deleteClimbingSession = async (id) => {
  try {
    await db.from('ascents').delete().eq('session_id', id)
    const { error } = await db.from('climbing_sessions').delete().eq('id', id)
    if (error) throw error
    return true
  } catch(e) { return false }
}

// ── ASCENTS ────────────────────────────────────────────────────────
export const loadAscents = async () => {
  try {
    const { data, error } = await db.from('ascents').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch(e) { return [] }
}

export const saveAscent = async (ascent) => {
  try {
    const { data, error } = await db.from('ascents').insert([ascent]).select('id').single()
    if (error) throw error
    return data?.id
  } catch(e) { return null }
}

export const deleteAscent = async (id) => {
  try {
    const { error } = await db.from('ascents').delete().eq('id', id)
    if (error) throw error
    return true
  } catch(e) { return false }
}

// ── PROJECTS ───────────────────────────────────────────────────────
export const loadProjects = async () => {
  try {
    const { data, error } = await db.from('projects').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch(e) { return [] }
}

export const saveProject = async (project) => {
  try {
    const { data, error } = await db.from('projects').insert([project]).select('id').single()
    if (error) throw error
    return data?.id
  } catch(e) { return null }
}

export const updateProject = async (id, updates) => {
  try {
    const { error } = await db.from('projects').update(updates).eq('id', id)
    if (error) throw error
    return true
  } catch(e) { return false }
}

// ── PROJECT ATTEMPTS ───────────────────────────────────────────────
export const loadProjectAttempts = async () => {
  try {
    const { data, error } = await db.from('project_attempts').select('*').order('attempt_date', { ascending: true })
    if (error) throw error
    return data || []
  } catch(e) { return [] }
}

export const saveProjectAttempt = async (attempt) => {
  try {
    const { data, error } = await db.from('project_attempts').insert([attempt]).select('id').single()
    if (error) throw error
    return data?.id
  } catch(e) { return null }
}
