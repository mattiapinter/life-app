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

// ── PESI ROW ──────────────────────────────────────────────────────
// FIX: aggiunto feedback visivo (flash bordo verde) quando il valore
// viene propagato agli altri set al momento del blur.
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

  // FIX: tiene traccia dei set che hanno appena ricevuto un valore propagato
  // per mostrare il flash verde per 600ms
  const [flashedSets, setFlashedSets] = React.useState(new Set())

  const [gifOpen,    setGifOpen]    = React.useState(false)
  const [gifUrl,     setGifUrl]     = React.useState(undefined)
  const [gifLoading, setGifLoading] = React.useState(false)
  const gifCacheRef = React.useRef({})

  const handleOpenGif = async () => {
    setGifOpen(true)
    if (gifCacheRef.current[ex.name] !== undefined) {
      setGifUrl(gifCacheRef.current[ex.name])
      return
    }
    setGifLoading(true)
    try {
      const term = EXERCISE_TRANSLATIONS[ex.name] || ex.name
      const res  = await fetch(`https://wger.de/api/v2/exercise/?format=json&language=2&limit=5&offset=0&term=${encodeURIComponent(term)}`)
      const data = await res.json()
      const url  = data.results?.[0]?.images?.[0]?.image ?? null
      gifCacheRef.current[ex.name] = url
      setGifUrl(url)
    } catch {
      gifCacheRef.current[ex.name] = null
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

      // Trova i set che verranno aggiornati per il flash
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
        // FIX: piccola animazione pulse sui dot propagati
        transition: 'background 0.3s ease',
      }} />
    )
  })

  const baseInputStyle = {
    width: '100%',
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: '10px',
    padding: '12px',
    fontSize: '20px',
    fontWeight: '600',
    color: C.text,
    outline: 'none',
    textAlign: 'center',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
  }

  // Stile input con flash verde se il set corrente ha appena ricevuto propagazione
  const inputStyle = (field) => {
    const isFlashing = flashedSets.has(activeSet)
    if (isFlashing) {
      return {
        ...baseInputStyle,
        borderColor: C.green,
        boxShadow: `0 0 0 2px ${C.greenBorder}`,
      }
    }
    return baseInputStyle
  }

  return (
    <div style={{ marginBottom: '18px', paddingBottom: '18px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: C.text, cursor: 'pointer' }} onClick={handleOpenGif}>{ex.name}</div>
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
          <input
            type="number" inputMode="numeric" pattern="[0-9]*"
            style={inputStyle('reps')}
            placeholder="—"
            value={current.reps}
            onChange={e => handleChange('reps', e.target.value)}
            onBlur={() => handleBlur('reps')}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '10px', color: C.hint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px', textAlign: 'center' }}>Peso kg</div>
            <input
              type="number" inputMode="decimal" pattern="[0-9]*"
              style={inputStyle('kg')}
              placeholder={lastLog ? `${lastLog.weight_kg}` : '—'}
              value={current.kg}
              onChange={e => handleChange('kg', e.target.value)}
              onBlur={() => handleBlur('kg')}
            />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: C.hint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px', textAlign: 'center' }}>Reps</div>
            <input
              type="number" inputMode="numeric" pattern="[0-9]*"
              style={inputStyle('reps')}
              placeholder={lastLog ? `${lastLog.reps_done}` : '—'}
              value={current.reps}
              onChange={e => handleChange('reps', e.target.value)}
              onBlur={() => handleBlur('reps')}
            />
          </div>
        </div>
      )}

      {/* FIX: banner di conferma propagazione — appare sotto l'input per 600ms */}
      {flashedSets.size > 0 && (
        <div style={{
          marginTop: '6px',
          fontSize: '10px',
          color: C.greenLight,
          textAlign: 'center',
          opacity: 1,
          transition: 'opacity 0.3s ease',
        }}>
          Copiato ai set {Array.from(flashedSets).map(i => i + 1).join(', ')}
        </div>
      )}

      {gifOpen && (
        <div
          style={{ ...drawer.overlay(), backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => setGifOpen(false)}
        >
          <div
            className="drawer-enter"
            style={{ ...drawer.sheet }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ ...drawer.sheetHeader, justifyContent: 'flex-end' }}>
              <div
                style={{ cursor: 'pointer', padding: '6px', borderRadius: '8px', background: C.bg, border: `1px solid ${C.border}` }}
                onClick={() => setGifOpen(false)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.hint, display: 'block' }}>close</span>
              </div>
            </div>
            <div style={{ ...drawer.sheetScroll }}>
              {gifLoading ? (
                <div style={{ height: '260px', borderRadius: '12px', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', color: C.hint }}>Caricamento...</span>
                </div>
              ) : gifUrl ? (
                <img
                  src={gifUrl}
                  alt={ex.name}
                  style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: '12px', display: 'block' }}
                />
              ) : (
                <div style={{ height: '260px', borderRadius: '12px', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', color: C.hint }}>fitness_center</span>
                  <span style={{ fontSize: '11px', color: C.hint }}>Nessuna immagine disponibile</span>
                </div>
              )}
              <div style={{ marginTop: '16px', fontSize: '17px', fontWeight: '700', color: C.text }}>{ex.name}</div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: C.hint, lineHeight: '1.7' }}>
                Tempo {ex.tempo} · {numSets} × {wd.reps} reps{wd.rpe ? ` · RPE ${wd.rpe}` : ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
