import React from 'react'
import { C, drawer } from '../constants'
import { VideoButton } from './UI'

const EXERCISE_TRANSLATIONS = {
  'Goblet squat': 'goblet squat',
  'Panca piana bilanciere': 'bench press',
  'Stacco da terra': 'deadlift',
  'Rematore manubri': 'dumbbell row',
  'Crunch libretto': 'crunch',
  'Arch body': 'back extension',
}

const gifCache = {}

// ── PESI ROW ──────────────────────────────────────────────────────
export default function PesiRow({ ex, week, trainingLogs, onChange, videos, onVideosChange, activeSet }) {
  const wd      = ex.weeks.find(w => w.week === week) || ex.weeks[0]
  const numSets = wd.sets || 2

  const lastLog = trainingLogs
    .filter(l => l.exercise_name === ex.name && l.session_type === 'PESI' && l.weight_kg)
    .sort((a, b) => b.log_date?.localeCompare(a.log_date) || 0)[0]

  const lastBwLog = trainingLogs
    .filter(l => l.exercise_name === ex.name && l.session_type === 'PESI' && l.reps_done)
    .sort((a, b) => b.log_date?.localeCompare(a.log_date) || 0)[0]

  const [sets, setSets] = React.useState(
    Array.from({ length: numSets }, () => ({ kg: '', reps: '' }))
  )
  const [flashedSets, setFlashedSets] = React.useState(new Set())

  const [gifOpen,    setGifOpen]    = React.useState(false)
  const [gifUrl,     setGifUrl]     = React.useState(undefined)
  const [gifLoading, setGifLoading] = React.useState(false)

  const handleOpenGif = async () => {
    setGifOpen(true)
    if (gifCache[ex.name] !== undefined) {
      setGifUrl(gifCache[ex.name])
      return
    }
    setGifLoading(true)
    try {
      const term = EXERCISE_TRANSLATIONS[ex.name] || ex.name
      const res  = await fetch(
        `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(term)}?limit=1&offset=0`,
        {
          headers: {
            'X-RapidAPI-Key':  '0dc17f377fmsh90efb2a3f5212aap1fd15ajsndbec488a65aa',
            'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
          },
        }
      )
      const data = await res.json()
      const url  = Array.isArray(data) && data[0]?.gifUrl ? data[0].gifUrl : null
      gifCache[ex.name] = url
      setGifUrl(url)
    } catch {
      gifCache[ex.name] = null
      setGifUrl(null)
    }
    setGifLoading(false)
  }

  const triggerFlash = (indices) => {
    setFlashedSets(new Set(indices))
    setTimeout(() => setFlashedSets(new Set()), 600)
  }

  const handleChange = (field, val) => {
    setSets(prev => {
      const next = prev.map((s, i) => i === activeSet ? { ...s, [field]: val } : s)
      onChange(ex.name, { sets: next, bodyweight: ex.bodyweight, rpe: wd.rpe })
      return next
    })
  }

  const handleBlur = (field) => {
    setSets(prev => {
      const val = prev[activeSet][field]
      if (!val) return prev
      const toFlash = []
      const next = prev.map((s, i) => {
        if (i > activeSet && !s[field]) {
          toFlash.push(i)
          return { ...s, [field]: val }
        }
        return s
      })
      if (toFlash.length > 0) triggerFlash(toFlash)
      onChange(ex.name, { sets: next, bodyweight: ex.bodyweight, rpe: wd.rpe })
      return next
    })
  }

  const current = sets[Math.min(activeSet, numSets - 1)]

  const dots = sets.map((s, i) => {
    const done   = ex.bodyweight ? !!s.reps : (!!s.kg && !!s.reps)
    const active = activeSet === i
    return (
      <div key={i} style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: active ? C.violet : done ? C.green : C.border,
        transition: 'background 0.3s ease',
      }} />
    )
  })

  const baseInputStyle = {
    width: '100%', background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: '10px', padding: '12px', fontSize: '20px', fontWeight: '600',
    color: C.text, outline: 'none', textAlign: 'center',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
  }

  const inputStyle = () => {
    if (flashedSets.has(activeSet)) {
      return { ...baseInputStyle, borderColor: C.green, boxShadow: `0 0 0 2px ${C.greenBorder}` }
    }
    return baseInputStyle
  }

  const existingVideo = videos?.[ex.name]

  return (
    <div style={{ marginBottom: '18px', paddingBottom: '18px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{ fontSize: '13px', fontWeight: '600', color: C.text, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}
              onClick={handleOpenGif}
            >
              {ex.name}
            </div>
            <VideoButton exerciseName={ex.name} videos={videos} onVideosChange={onVideosChange} />
          </div>
          <div style={{ fontSize: '10px', color: C.hint, marginTop: '3px' }}>
            Tempo {ex.tempo} · {numSets} × {wd.reps} reps{wd.rpe ? ` · RPE ${wd.rpe}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px', flexShrink: 0 }}>
          {!ex.bodyweight && lastLog && (
            <div style={{ fontSize: '10px', fontWeight: '700', color: C.violet, background: C.violetBg, padding: '2px 7px', borderRadius: '6px', border: `1px solid ${C.violetBorder}`, whiteSpace: 'nowrap' }}>
              {lastLog.weight_kg}kg
            </div>
          )}
          {ex.bodyweight && lastBwLog && (
            <div style={{ fontSize: '10px', fontWeight: '700', color: C.green, background: C.greenBg, padding: '2px 7px', borderRadius: '6px', border: `1px solid ${C.greenBorder}`, whiteSpace: 'nowrap' }}>
              {lastBwLog.reps_done}r
            </div>
          )}
          {dots}
        </div>
      </div>

      {ex.bodyweight ? (
        <div>
          <div style={{ fontSize: '10px', color: C.hint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px', textAlign: 'center' }}>Reps</div>
          <input type="number" inputMode="numeric" pattern="[0-9]*"
            style={inputStyle()} placeholder="—" value={current.reps}
            onChange={e => handleChange('reps', e.target.value)}
            onBlur={() => handleBlur('reps')} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '10px', color: C.hint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px', textAlign: 'center' }}>Peso kg</div>
            <input type="number" inputMode="decimal" pattern="[0-9]*"
              style={inputStyle()} placeholder={lastLog ? `${lastLog.weight_kg}` : '—'}
              value={current.kg}
              onChange={e => handleChange('kg', e.target.value)}
              onBlur={() => handleBlur('kg')} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: C.hint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px', textAlign: 'center' }}>Reps</div>
            <input type="number" inputMode="numeric" pattern="[0-9]*"
              style={inputStyle()} placeholder={lastLog ? `${lastLog.reps_done}` : '—'}
              value={current.reps}
              onChange={e => handleChange('reps', e.target.value)}
              onBlur={() => handleBlur('reps')} />
          </div>
        </div>
      )}

      {flashedSets.size > 0 && (
        <div style={{ marginTop: '6px', fontSize: '10px', color: C.greenLight, textAlign: 'center' }}>
          Copiato ai set {Array.from(flashedSets).map(i => i + 1).join(', ')}
        </div>
      )}

      {gifOpen && (
        <div
          style={{ ...drawer.overlay(), backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => setGifOpen(false)}
        >
          <div className="drawer-enter" style={{ ...drawer.sheet }} onClick={e => e.stopPropagation()}>
            <div style={{ ...drawer.sheetHeader }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: C.text }}>{ex.name}</span>
              <div
                style={{ cursor: 'pointer', padding: '6px', borderRadius: '8px', background: C.bg, border: `1px solid ${C.border}` }}
                onClick={() => setGifOpen(false)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.hint, display: 'block' }}>close</span>
              </div>
            </div>
            <div style={{ ...drawer.sheetScroll }}>
              {gifLoading ? (
                <div style={{ height: '260px', borderRadius: '12px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', color: C.hint }}>Caricamento...</span>
                </div>
              ) : gifUrl ? (
                <img src={gifUrl} alt={ex.name}
                  style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: '12px', display: 'block', background: '#1a1a1a' }} />
              ) : (
                <div style={{ height: '260px', borderRadius: '12px', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', color: C.hint }}>fitness_center</span>
                  <span style={{ fontSize: '11px', color: C.hint }}>Nessuna immagine disponibile</span>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '16px' }}>
                {ex.tempo && (
                  <span style={{ fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '999px', background: C.surface, border: `1px solid ${C.border}`, color: C.textSoft }}>
                    Tempo {ex.tempo}
                  </span>
                )}
                <span style={{ fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '999px', background: C.surface, border: `1px solid ${C.border}`, color: C.textSoft }}>
                  {numSets} × {wd.reps} reps
                </span>
                {wd.rpe && (
                  <span style={{ fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '999px', background: C.violetBg, border: `1px solid ${C.violetBorder}`, color: C.violetLight }}>
                    RPE {wd.rpe}
                  </span>
                )}
              </div>

              {existingVideo && (
                <button
                  type="button"
                  style={{ marginTop: '16px', width: '100%', padding: '12px', borderRadius: '12px', background: C.primaryBgSolid, border: `1px solid ${C.primaryBorder}`, color: C.primaryLight, fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => window.open(existingVideo, '_blank')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>play_arrow</span>
                  Guarda video
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
