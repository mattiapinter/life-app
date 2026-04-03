import { createClient } from '@supabase/supabase-js'

// FIX: chiavi spostate in variabili d'ambiente — non più hardcoded nel sorgente
// In locale: crea .env con VITE_SUPABASE_URL e VITE_SUPABASE_KEY
// Su GitHub Actions: aggiungi le due vars nelle Repository Variables (Settings → Secrets and variables → Actions → Variables)
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL
const SUPA_KEY = import.meta.env.VITE_SUPABASE_KEY

if (!SUPA_URL || !SUPA_KEY) {
  console.error('⚠️ Mancano VITE_SUPABASE_URL o VITE_SUPABASE_KEY nel file .env')
}

export const db = createClient(SUPA_URL, SUPA_KEY)

// ── AUTH ───────────────────────────────────────────────────────────
export const getUser = async () => {
  const { data: { user } } = await db.auth.getUser()
  return user
}
export const onAuthChange = (cb) => db.auth.onAuthStateChange(cb)

const uid = async () => {
  const { data: { user } } = await db.auth.getUser()
  return user?.id || null
}

// ── WEEKLY PLAN ────────────────────────────────────────────────────
const getWeekStart = () => {
  const d = new Date(); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff); return d.toISOString().split('T')[0]
}

export const syncPlanToSupabase = async (weeklyPlan) => {
  const userId = await uid(); if (!userId) return
  const ws = getWeekStart()
  const rows = Object.entries(weeklyPlan).map(([day, data]) => ({
    week_start: ws, day_of_week: day, user_id: userId,
    is_endurance_day: data.isSkiDay || false,
    meals: data.meals || {},
    updated_at: new Date().toISOString(),
  }))
  try { await db.from('weekly_plan').upsert(rows, { onConflict: 'week_start,day_of_week,user_id' }) } catch(e) {}
}

export const loadPlanFromSupabase = async () => {
  const userId = await uid(); if (!userId) return null
  const ws = getWeekStart()
  try {
    const { data, error } = await db.from('weekly_plan').select('*').eq('week_start', ws).eq('user_id', userId)
    if (error || !data || data.length === 0) return null
    const plan = {}
    data.forEach(row => { plan[row.day_of_week] = { isSkiDay: row.is_endurance_day, meals: row.meals || {} } })
    return plan
  } catch(e) { return null }
}

// ── FOOD OPTIONS ───────────────────────────────────────────────────
const flattenFoodOptions = (foodOptions, userId) => {
  const rows = []
  ;['normal','ski'].forEach(mode => {
    Object.entries(foodOptions[mode] || {}).forEach(([meal, cats]) => {
      Object.entries(cats || {}).forEach(([category, options]) => {
        rows.push({ mode, meal, category, options: options || '', user_id: userId, updated_at: new Date().toISOString() })
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
  const userId = await uid(); if (!userId) return
  const rows = flattenFoodOptions(foodOptions, userId)
  try { await db.from('food_options').upsert(rows, { onConflict: 'mode,meal,category,user_id' }) } catch(e) {}
}

export const loadFoodOptionsFromSupabase = async () => {
  const userId = await uid(); if (!userId) return null
  try {
    const { data, error } = await db.from('food_options').select('*').eq('user_id', userId)
    if (error || !data || data.length === 0) return null
    return unflattenFoodOptions(data)
  } catch(e) { return null }
}

// ── FITNESS SESSIONS ───────────────────────────────────────────────
export const saveFitnessSession = async (session) => {
  const userId = await uid(); if (!userId) return false
  try { const { error } = await db.from('fitness_sessions').insert([{ ...session, user_id: userId }]); if (error) throw error; return true }
  catch(e) { return false }
}
export const loadFitnessSessions = async () => {
  const userId = await uid(); if (!userId) return []
  try { const { data, error } = await db.from('fitness_sessions').select('*').eq('user_id', userId).order('session_date', { ascending: true }); if (error) throw error; return data || [] }
  catch(e) { return [] }
}

// ── TRAINING LOGS ──────────────────────────────────────────────────
export const saveTrainingLog = async (log) => {
  const userId = await uid(); if (!userId) return false
  try { const { error } = await db.from('training_logs').insert([{ ...log, user_id: userId }]); if (error) throw error; return true }
  catch(e) { return false }
}
export const loadTrainingLogs = async () => {
  const userId = await uid(); if (!userId) return []
  try { const { data, error } = await db.from('training_logs').select('*').eq('user_id', userId).order('log_date', { ascending: false }); if (error) throw error; return data || [] }
  catch(e) { return [] }
}

// ── SESSION NOTES ──────────────────────────────────────────────────
export const saveSessionNote = async (note) => {
  const userId = await uid(); if (!userId) return false
  try { const { error } = await db.from('session_notes').upsert([{ ...note, user_id: userId }], { onConflict: 'note_date,session_type,user_id' }); if (error) throw error; return true }
  catch(e) { return false }
}
export const loadSessionNotes = async () => {
  const userId = await uid(); if (!userId) return []
  try { const { data, error } = await db.from('session_notes').select('*').eq('user_id', userId).order('note_date', { ascending: false }); if (error) throw error; return data || [] }
  catch(e) { return [] }
}

// ── EXERCISE VIDEOS ────────────────────────────────────────────────
export const saveExerciseVideo = async (exerciseName, videoUrl) => {
  const userId = await uid(); if (!userId) return false
  try {
    const { error } = await db.from('exercise_videos').upsert(
      [{ exercise_name: exerciseName, video_url: videoUrl, user_id: userId, updated_at: new Date().toISOString() }],
      { onConflict: 'exercise_name,user_id' }
    )
    if (error) throw error; return true
  } catch(e) { return false }
}
export const loadExerciseVideos = async () => {
  const userId = await uid(); if (!userId) return []
  try { const { data, error } = await db.from('exercise_videos').select('*').eq('user_id', userId); if (error) throw error; return data || [] }
  catch(e) { return [] }
}

// ── DELETE ─────────────────────────────────────────────────────────
export const deleteSessionLogs = async (date, sessionType) => {
  const userId = await uid(); if (!userId) return false
  try { const { error } = await db.from('training_logs').delete().eq('log_date', date).eq('session_type', sessionType).eq('user_id', userId); if (error) throw error; return true }
  catch(e) { return false }
}
export const deleteExerciseLogs = async (exerciseName) => {
  const userId = await uid(); if (!userId) return false
  try { const { error } = await db.from('training_logs').delete().eq('exercise_name', exerciseName).eq('user_id', userId); if (error) throw error; return true }
  catch(e) { return false }
}
export const deleteSessionNote = async (date, sessionType) => {
  const userId = await uid(); if (!userId) return false
  try { const { error } = await db.from('session_notes').delete().eq('note_date', date).eq('session_type', sessionType).eq('user_id', userId); if (error) throw error; return true }
  catch(e) { return false }
}
export const deleteAllTrainingData = async () => {
  const userId = await uid(); if (!userId) return false
  try {
    await db.from('training_logs').delete().eq('user_id', userId)
    await db.from('session_notes').delete().eq('user_id', userId)
    return true
  } catch(e) { return false }
}

// ── CRAGS ──────────────────────────────────────────────────────────
export const loadCrags = async () => {
  const userId = await uid(); if (!userId) return []
  try { const { data, error } = await db.from('crags').select('*').eq('user_id', userId).order('name'); if (error) throw error; return data || [] }
  catch(e) { return [] }
}
export const saveCrag = async (crag) => {
  const userId = await uid(); if (!userId) return null
  try {
    if (crag.id) {
      const { error } = await db.from('crags').update({
        name: crag.name, region: crag.region, rock_type: crag.rock_type,
        notes: crag.notes, lat: crag.lat, lng: crag.lng,
        grade_min: crag.grade_min, grade_max: crag.grade_max,
        approach_min: crag.approach_min, styles: crag.styles, gps_url: crag.gps_url,
      }).eq('id', crag.id).eq('user_id', userId)
      if (error) throw error; return crag.id
    } else {
      const { data, error } = await db.from('crags').insert([{
        name: crag.name, region: crag.region, rock_type: crag.rock_type,
        notes: crag.notes, lat: crag.lat, lng: crag.lng,
        grade_min: crag.grade_min, grade_max: crag.grade_max,
        approach_min: crag.approach_min, styles: crag.styles, user_id: userId,
      }]).select('id').single()
      if (error) throw error; return data?.id
    }
  } catch(e) { return null }
}
export const deleteCrag = async (id) => {
  const userId = await uid(); if (!userId) return false
  try { const { error } = await db.from('crags').delete().eq('id', id).eq('user_id', userId); if (error) throw error; return true }
  catch(e) { return false }
}

// ── CLIMBING SESSIONS ──────────────────────────────────────────────
export const loadClimbingSessions = async () => {
  const userId = await uid(); if (!userId) return []
  try { const { data, error } = await db.from('climbing_sessions').select('*').eq('user_id', userId).order('session_date', { ascending: false }); if (error) throw error; return data || [] }
  catch(e) { return [] }
}
export const saveClimbingSession = async (session) => {
  const userId = await uid(); if (!userId) return null
  try {
    if (session.id) {
      const { error } = await db.from('climbing_sessions').update({
        session_date: session.session_date, crag_id: session.crag_id,
        type: session.type || 'falesia', notes: session.notes,
      }).eq('id', session.id).eq('user_id', userId)
      if (error) throw error; return session.id
    } else {
      const { data, error } = await db.from('climbing_sessions').insert([{
        session_date: session.session_date, crag_id: session.crag_id,
        type: session.type || 'falesia', notes: session.notes, user_id: userId,
      }]).select('id').single()
      if (error) throw error; return data?.id
    }
  } catch(e) { return null }
}
export const deleteClimbingSession = async (id) => {
  const userId = await uid(); if (!userId) return false
  try {
    await db.from('ascents').delete().eq('session_id', id).eq('user_id', userId)
    const { error } = await db.from('climbing_sessions').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error; return true
  } catch(e) { return false }
}

// ── ASCENTS ────────────────────────────────────────────────────────
export const loadAscents = async () => {
  const userId = await uid(); if (!userId) return []
  try { const { data, error } = await db.from('ascents').select('*').eq('user_id', userId).order('created_at', { ascending: false }); if (error) throw error; return data || [] }
  catch(e) { return [] }
}
export const saveAscent = async (ascent) => {
  const userId = await uid(); if (!userId) return null
  try { const { data, error } = await db.from('ascents').insert([{ ...ascent, user_id: userId }]).select('id').single(); if (error) throw error; return data?.id }
  catch(e) { return null }
}
export const deleteAscent = async (id) => {
  const userId = await uid(); if (!userId) return false
  try { const { error } = await db.from('ascents').delete().eq('id', id).eq('user_id', userId); if (error) throw error; return true }
  catch(e) { return false }
}

// ── PROJECTS ───────────────────────────────────────────────────────
export const loadProjects = async () => {
  const userId = await uid(); if (!userId) return []
  try { const { data, error } = await db.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }); if (error) throw error; return data || [] }
  catch(e) { return [] }
}
export const saveProject = async (project) => {
  const userId = await uid(); if (!userId) return null
  try { const { data, error } = await db.from('projects').insert([{ ...project, user_id: userId }]).select('id').single(); if (error) throw error; return data?.id }
  catch(e) { return null }
}
export const updateProject = async (id, updates) => {
  const userId = await uid(); if (!userId) return false
  try { const { error } = await db.from('projects').update(updates).eq('id', id).eq('user_id', userId); if (error) throw error; return true }
  catch(e) { return false }
}

// ── PROJECT ATTEMPTS ───────────────────────────────────────────────
export const loadProjectAttempts = async () => {
  const userId = await uid(); if (!userId) return []
  try { const { data, error } = await db.from('project_attempts').select('*').eq('user_id', userId).order('attempt_date', { ascending: true }); if (error) throw error; return data || [] }
  catch(e) { return [] }
}
export const saveProjectAttempt = async (attempt) => {
  const userId = await uid(); if (!userId) return null
  try { const { data, error } = await db.from('project_attempts').insert([{ ...attempt, user_id: userId }]).select('id').single(); if (error) throw error; return data?.id }
  catch(e) { return null }
}

// ── RUNNING LOGS ───────────────────────────────────────────────────
export const saveRunningLog = async (log) => {
  const userId = await uid(); if (!userId) return false
  try { const { error } = await db.from('running_logs').insert([{ ...log, user_id: userId }]); if (error) throw error; return true }
  catch(e) { return false }
}
export const loadRunningLogs = async () => {
  const userId = await uid(); if (!userId) return []
  try { const { data, error } = await db.from('running_logs').select('*').eq('user_id', userId).order('log_date', { ascending: true }); if (error) throw error; return data || [] }
  catch(e) { return [] }
}
export const deleteRunningLog = async (id) => {
  const userId = await uid(); if (!userId) return false
  try { const { error } = await db.from('running_logs').delete().eq('id', id).eq('user_id', userId); if (error) throw error; return true }
  catch(e) { return false }
}

// ── HRV LOGS ──────────────────────────────────────────────────────
export const saveHrvLog = async (log) => {
  const userId = await uid(); if (!userId) return false
  try {
    const { error } = await db.from('hrv_logs').upsert([{ ...log, user_id: userId }], { onConflict: 'log_date,user_id' })
    if (error) throw error; return true
  } catch(e) { return false }
}
export const loadHrvLogs = async () => {
  const userId = await uid(); if (!userId) return []
  try { const { data, error } = await db.from('hrv_logs').select('*').eq('user_id', userId).order('log_date', { ascending: true }); if (error) throw error; return data || [] }
  catch(e) { return [] }
}

// ── BODY MEASUREMENTS ──────────────────────────────────────────────
export const saveBodyMeasurement = async (entry) => {
  const userId = await uid(); if (!userId) return false
  try { const { error } = await db.from('body_measurements').insert([{ ...entry, user_id: userId }]); if (error) throw error; return true }
  catch(e) { return false }
}
export const loadBodyMeasurements = async () => {
  const userId = await uid(); if (!userId) return []
  try { const { data, error } = await db.from('body_measurements').select('*').eq('user_id', userId).order('measured_at', { ascending: true }); if (error) throw error; return data || [] }
  catch(e) { return [] }
}
export const deleteBodyMeasurement = async (id) => {
  const userId = await uid(); if (!userId) return false
  try { const { error } = await db.from('body_measurements').delete().eq('id', id).eq('user_id', userId); if (error) throw error; return true }
  catch(e) { return false }
}

// ── USER PROFILE ────────────────────────────────────────────────────
export const loadUserProfile = async () => {
  const userId = await uid(); if (!userId) return null
  try {
    const { data, error } = await db.from('user_profiles').select('*').eq('user_id', userId).maybeSingle()
    if (error) throw error
    if (!data) {
      const { data: newProfile, error: insertError } = await db.from('user_profiles')
        .insert([{ user_id: userId, height_cm: 185, neck_cm: 38.0 }])
        .select()
        .single()
      if (insertError) throw insertError
      return newProfile
    }
    return data
  } catch(e) { return null }
}
export const saveUserProfile = async (profile) => {
  const userId = await uid(); if (!userId) return false
  try {
    const { error } = await db.from('user_profiles').upsert([{
      user_id: userId,
      height_cm: profile.height_cm,
      neck_cm: profile.neck_cm,
      updated_at: new Date().toISOString()
    }], { onConflict: 'user_id' })
    if (error) throw error; return true
  } catch(e) { return false }
}
