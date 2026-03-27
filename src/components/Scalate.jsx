import React from 'react'
import { C, ss, todayStr, fmtDateShort } from '../constants'
import {
  loadCrags, saveCrag, deleteCrag,
  loadClimbingSessions, saveClimbingSession, deleteClimbingSession,
  loadAscents, saveAscent, deleteAscent,
  loadProjects, saveProject, updateProject,
  loadProjectAttempts, saveProjectAttempt,
} from '../lib/supabase'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

const GRADES = [
  '4','4+','5','5+','6a','6a+','6b','6b+','6c','6c+',
  '7a','7a+','7b','7b+','7c','7c+',
  '8a','8a+','8b','8b+','8c','8c+','9a','9a+','9b','9b+','9c',
]

const GRADE_ORDER = Object.fromEntries(GRADES.map((g, i) => [g, i]))

const STYLES = [
  { id: 'a_vista',     label: 'A vista',     color: C.amber,  short: 'AV' },
  { id: 'flash',       label: 'Flash',       color: C.green,  short: 'FL' },
  { id: 'redpoint',    label: 'Redpoint',    color: C.violet, short: 'RP' },
  { id: 'ripetizione', label: 'Ripetizione', color: C.blue,   short: 'RI' },
  { id: 'top_rope',    label: 'Top rope',    color: C.muted,  short: 'TR' },
]

const STYLE_MAP = Object.fromEntries(STYLES.map(s => [s.id, s]))
const IS_FIRST_ASCENT = ['a_vista', 'flash', 'redpoint']

// ── MAPBOX COMPONENT ──────────────────────────────────────────────
function MapboxMap({ crags, selectedCragId, onCragClick, onMapClick, interactive = true, height = '260px', centerCrag = null }) {
  const mapRef = React.useRef(null)
  const mapInstance = React.useRef(null)
  const markersRef = React.useRef([])
  const [mapLoaded, setMapLoaded] = React.useState(false)

  React.useEffect(() => {
    if (mapInstance.current || !mapRef.current) return

    const script = document.getElementById('mapbox-script')
    const css = document.getElementById('mapbox-css')

    const initMap = () => {
      if (!window.mapboxgl) return
      window.mapboxgl.accessToken = MAPBOX_TOKEN

      const center = centerCrag
        ? [centerCrag.lng, centerCrag.lat]
        : crags.length > 0
          ? [crags.reduce((s, c) => s + (c.lng || 12), 0) / crags.length, crags.reduce((s, c) => s + (c.lat || 46), 0) / crags.length]
          : [11.0, 46.1] // Trentino default

      const zoom = centerCrag ? 13 : crags.length > 1 ? 8 : crags.length === 1 ? 12 : 9

      mapInstance.current = new window.mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center,
        zoom,
        interactive,
      })

      mapInstance.current.on('load', () => {
        setMapLoaded(true)
        if (onMapClick && interactive) {
          mapInstance.current.on('click', (e) => {
            const { lng, lat } = e.lngLat
            onMapClick(lat, lng)
          })
          mapInstance.current.getCanvas().style.cursor = 'crosshair'
        }
      })
    }

    if (!script) {
      const cssEl = document.createElement('link')
      cssEl.id = 'mapbox-css'
      cssEl.rel = 'stylesheet'
      cssEl.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css'
      document.head.appendChild(cssEl)

      const scriptEl = document.createElement('script')
      scriptEl.id = 'mapbox-script'
      scriptEl.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js'
      scriptEl.onload = initMap
      document.head.appendChild(scriptEl)
    } else if (window.mapboxgl) {
      initMap()
    } else {
      script.addEventListener('load', initMap)
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
        setMapLoaded(false)
      }
    }
  }, [])

  // Update markers when crags change
  React.useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    crags.forEach(crag => {
      if (!crag.lat || !crag.lng) return
      const isSelected = crag.id === selectedCragId
      const el = document.createElement('div')
      el.style.cssText = `
        width: ${isSelected ? '16px' : '12px'};
        height: ${isSelected ? '16px' : '12px'};
        border-radius: 50%;
        background: ${isSelected ? C.green : C.violet};
        border: 2px solid ${isSelected ? C.greenLight : C.violetLight};
        cursor: pointer;
        box-shadow: 0 0 ${isSelected ? '12px' : '6px'} ${isSelected ? C.green : C.violet}88;
        transition: all 0.2s;
      `
      if (onCragClick) el.addEventListener('click', (e) => { e.stopPropagation(); onCragClick(crag) })

      const popup = new window.mapboxgl.Popup({ offset: 16, closeButton: false, className: 'mapbox-dark-popup' })
        .setHTML(`<div style="background:#1C1C1C;border:1px solid #2A2A2A;padding:8px 12px;border-radius:8px;font-family:'DM Sans',sans-serif;color:#F0F0F0;font-size:12px;font-weight:600;white-space:nowrap">${crag.name}${crag.region ? `<span style="color:#777;font-weight:400;margin-left:6px">${crag.region}</span>` : ''}</div>`)

      const marker = new window.mapboxgl.Marker({ element: el })
        .setLngLat([crag.lng, crag.lat])
        .setPopup(popup)
        .addTo(mapInstance.current)

      markersRef.current.push(marker)
    })
  }, [crags, selectedCragId, mapLoaded])

  return (
    <div style={{ position: 'relative', height, borderRadius: '12px', overflow: 'hidden', background: '#1a1a2e' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {!mapLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#161616', fontSize: '12px', color: C.hint }}>
          Caricamento mappa...
        </div>
      )}
      {onMapClick && mapLoaded && (
        <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', border: `1px solid ${C.border}`, borderRadius: '999px', padding: '5px 12px', fontSize: '10px', color: C.muted, pointerEvents: 'none' }}>
          Tocca la mappa per posizionare il pin
        </div>
      )}
    </div>
  )
}

// ── CRAG FORM ──────────────────────────────────────────────────────
function CragForm({ onSaved, onClose, editCrag = null }) {
  const [name, setName]       = React.useState(editCrag?.name || '')
  const [region, setRegion]   = React.useState(editCrag?.region || '')
  const [rock, setRock]       = React.useState(editCrag?.rock_type || '')
  const [notes, setNotes]     = React.useState(editCrag?.notes || '')
  const [lat, setLat]         = React.useState(editCrag?.lat || null)
  const [lng, setLng]         = React.useState(editCrag?.lng || null)
  const [saving, setSaving]   = React.useState(false)

  const previewCrag = lat && lng ? [{ id: 'preview', name: name || 'Nuova falesia', lat, lng }] : []

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await saveCrag({ id: editCrag?.id, name: name.trim(), region: region.trim(), rock_type: rock.trim(), notes: notes.trim(), lat, lng })
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '448px', margin: '0 auto', background: C.surface, borderRadius: '20px 20px 0 0', padding: '20px', paddingBottom: '40px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: C.green, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            {editCrag ? 'Modifica falesia' : 'Nuova falesia'}
          </div>
          <div style={{ cursor: 'pointer', color: C.muted, fontSize: '20px', lineHeight: 1 }} onClick={onClose}>×</div>
        </div>

        <input style={{ ...ss.inp, marginBottom: '10px', fontSize: '15px', fontWeight: '600' }}
          placeholder="Nome falesia *" value={name} onChange={e => setName(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <input style={ss.inp} placeholder="Zona / Regione" value={region} onChange={e => setRegion(e.target.value)} />
          <input style={ss.inp} placeholder="Tipo roccia" value={rock} onChange={e => setRock(e.target.value)} />
        </div>
        <textarea style={{ ...ss.inp, resize: 'vertical', lineHeight: '1.6', marginBottom: '14px' }}
          rows={2} placeholder="Note..." value={notes} onChange={e => setNotes(e.target.value)} />

        <div style={{ fontSize: '10px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>
          Posizione sulla mappa
        </div>
        <MapboxMap
          crags={previewCrag}
          height="200px"
          onMapClick={(la, ln) => { setLat(la); setLng(ln) }}
        />
        {lat && lng && (
          <div style={{ fontSize: '10px', color: C.green, marginTop: '6px', textAlign: 'center' }}>
            📍 {lat.toFixed(5)}, {lng.toFixed(5)} · tocca di nuovo per spostare
          </div>
        )}
        {!lat && (
          <div style={{ fontSize: '10px', color: C.hint, marginTop: '6px', textAlign: 'center' }}>
            Tocca la mappa per posizionare la falesia (opzionale)
          </div>
        )}

        <div style={{ ...ss.savBtn, marginTop: '16px', opacity: (!name.trim() || saving) ? 0.5 : 1, background: C.green }}
          onClick={!saving && name.trim() ? handleSave : undefined}>
          {saving ? 'Salvataggio...' : editCrag ? 'Salva modifiche' : 'Aggiungi falesia'}
        </div>
      </div>
    </div>
  )
}

// ── SESSION FORM ───────────────────────────────────────────────────
function SessionForm({ crags, onSaved, onClose, editSession = null }) {
  const [date, setDate]       = React.useState(editSession?.session_date || todayStr())
  const [cragId, setCragId]   = React.useState(editSession?.crag_id || (crags[0]?.id || ''))
  const [notes, setNotes]     = React.useState(editSession?.notes || '')
  const [ascents, setAscents] = React.useState([])
  const [saving, setSaving]   = React.useState(false)

  const addAscent = () => setAscents(p => [...p, { route_name: '', grade: '7a', style: 'redpoint', completed: true, attempts: 1, rpe: '', notes: '' }])
  const updateAscent = (i, field, val) => setAscents(p => p.map((a, idx) => idx === i ? { ...a, [field]: val } : a))
  const removeAscent = (i) => setAscents(p => p.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!date || !cragId) return
    setSaving(true)
    const sessionId = await saveClimbingSession({ id: editSession?.id, session_date: date, crag_id: parseInt(cragId), notes: notes.trim() })
    if (sessionId) {
      for (const a of ascents) {
        if (!a.route_name.trim() && !a.grade) continue
        await saveAscent({ session_id: sessionId, route_name: a.route_name.trim(), grade: a.grade, style: a.style, completed: a.completed, attempts: parseInt(a.attempts) || 1, rpe: a.rpe ? parseInt(a.rpe) : null, notes: a.notes.trim() })
      }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '448px', margin: '0 auto', background: C.surface, borderRadius: '20px 20px 0 0', padding: '20px', paddingBottom: '40px', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: C.violet, textTransform: 'uppercase', letterSpacing: '.08em' }}>Nuova sessione</div>
          <div style={{ cursor: 'pointer', color: C.muted, fontSize: '20px', lineHeight: 1 }} onClick={onClose}>×</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', color: C.hint, marginBottom: '5px' }}>Data</div>
            <input type="date" style={ss.inp} value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: C.hint, marginBottom: '5px' }}>Falesia</div>
            <select style={{ ...ss.inp, appearance: 'none' }} value={cragId} onChange={e => setCragId(e.target.value)}>
              {crags.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <textarea style={{ ...ss.inp, resize: 'vertical', lineHeight: '1.6', marginBottom: '16px' }}
          rows={2} placeholder="Note sessione..." value={notes} onChange={e => setNotes(e.target.value)} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Tiri ({ascents.length})</div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: C.violetLight, cursor: 'pointer', padding: '5px 10px', background: C.violetBg, border: `1px solid ${C.violetBorder}`, borderRadius: '8px' }}
            onClick={addAscent}>+ Aggiungi tiro</div>
        </div>

        {ascents.map((a, i) => (
          <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: C.hint }}>Tiro {i + 1}</div>
              <div style={{ fontSize: '16px', color: C.hint, cursor: 'pointer', padding: '0 4px' }} onClick={() => removeAscent(i)}>×</div>
            </div>
            <input style={{ ...ss.inp, marginBottom: '8px' }} placeholder="Nome via (opzionale)" value={a.route_name} onChange={e => updateAscent(i, 'route_name', e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '10px', color: C.hint, marginBottom: '4px' }}>Grado</div>
                <select style={{ ...ss.inp, appearance: 'none' }} value={a.grade} onChange={e => updateAscent(i, 'grade', e.target.value)}>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: C.hint, marginBottom: '4px' }}>Tentativi</div>
                <input type="number" style={ss.inp} min="1" value={a.attempts} onChange={e => updateAscent(i, 'attempts', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {STYLES.map(s => (
                <div key={s.id}
                  style={{ padding: '5px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', border: `1px solid ${a.style === s.id ? s.color : C.border}`, background: a.style === s.id ? `${s.color}22` : 'transparent', color: a.style === s.id ? s.color : C.hint }}
                  onClick={() => updateAscent(i, 'style', s.id)}>
                  {s.label}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ fontSize: '10px', color: C.hint }}>Completata:</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[{ v: true, l: 'Sì' }, { v: false, l: 'No' }].map(o => (
                  <div key={o.l}
                    style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', border: `1px solid ${a.completed === o.v ? C.green : C.border}`, background: a.completed === o.v ? C.greenBg : 'transparent', color: a.completed === o.v ? C.greenLight : C.hint }}
                    onClick={() => updateAscent(i, 'completed', o.v)}>
                    {o.l}
                  </div>
                ))}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ fontSize: '10px', color: C.hint }}>RPE</div>
                <select style={{ ...ss.inp, width: '60px', padding: '6px 8px', fontSize: '12px' }} value={a.rpe} onChange={e => updateAscent(i, 'rpe', e.target.value)}>
                  <option value="">—</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}

        {ascents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: C.hint, border: `1px dashed ${C.border}`, borderRadius: '12px', marginBottom: '12px' }}>
            Nessun tiro ancora · clicca "Aggiungi tiro" per iniziare
          </div>
        )}

        <div style={{ ...ss.savBtn, marginTop: '8px', opacity: (!date || !cragId || saving) ? 0.5 : 1 }}
          onClick={!saving && date && cragId ? handleSave : undefined}>
          {saving ? 'Salvataggio...' : `Salva sessione${ascents.length ? ` (${ascents.length} tiri)` : ''}`}
        </div>
      </div>
    </div>
  )
}

// ── PROJECT FORM ───────────────────────────────────────────────────
function ProjectForm({ crags, onSaved, onClose }) {
  const [name, setName]     = React.useState('')
  const [cragId, setCragId] = React.useState(crags[0]?.id || '')
  const [grade, setGrade]   = React.useState('7b')
  const [notes, setNotes]   = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await saveProject({ route_name: name.trim(), crag_id: parseInt(cragId) || null, grade, notes: notes.trim(), status: 'active' })
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '448px', margin: '0 auto', background: C.surface, borderRadius: '20px 20px 0 0', padding: '20px', paddingBottom: '40px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: C.amber, textTransform: 'uppercase', letterSpacing: '.08em' }}>Nuovo progetto</div>
          <div style={{ cursor: 'pointer', color: C.muted, fontSize: '20px', lineHeight: 1 }} onClick={onClose}>×</div>
        </div>
        <input style={{ ...ss.inp, marginBottom: '10px', fontSize: '15px', fontWeight: '600' }}
          placeholder="Nome via *" value={name} onChange={e => setName(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', color: C.hint, marginBottom: '4px' }}>Falesia</div>
            <select style={{ ...ss.inp, appearance: 'none' }} value={cragId} onChange={e => setCragId(e.target.value)}>
              <option value="">—</option>
              {crags.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: C.hint, marginBottom: '4px' }}>Grado stimato</div>
            <select style={{ ...ss.inp, appearance: 'none' }} value={grade} onChange={e => setGrade(e.target.value)}>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <textarea style={{ ...ss.inp, resize: 'vertical', lineHeight: '1.6', marginBottom: '14px' }}
          rows={2} placeholder="Note iniziali..." value={notes} onChange={e => setNotes(e.target.value)} />
        <div style={{ ...ss.savBtn, background: C.amber, color: '#000', opacity: (!name.trim() || saving) ? 0.5 : 1 }}
          onClick={!saving && name.trim() ? handleSave : undefined}>
          {saving ? 'Salvataggio...' : 'Crea progetto'}
        </div>
      </div>
    </div>
  )
}

// ── ATTEMPT FORM ───────────────────────────────────────────────────
function AttemptForm({ project, onSaved, onClose }) {
  const [date, setDate]       = React.useState(todayStr())
  const [progress, setProgress] = React.useState('')
  const [completed, setCompleted] = React.useState(false)
  const [saving, setSaving]   = React.useState(false)

  const handleSave = async () => {
    setSaving(true)
    await saveProjectAttempt({ project_id: project.id, attempt_date: date, progress: progress.trim(), completed })
    if (completed) await updateProject(project.id, { status: 'closed' })
    setSaving(false)
    onSaved(completed)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '448px', margin: '0 auto', background: C.surface, borderRadius: '20px 20px 0 0', padding: '20px', paddingBottom: '40px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: C.amber, textTransform: 'uppercase', letterSpacing: '.08em' }}>Nuovo tentativo</div>
          <div style={{ cursor: 'pointer', color: C.muted, fontSize: '20px', lineHeight: 1 }} onClick={onClose}>×</div>
        </div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: C.text, marginBottom: '16px' }}>{project.route_name} · {project.grade}</div>

        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '10px', color: C.hint, marginBottom: '4px' }}>Data</div>
          <input type="date" style={ss.inp} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <textarea style={{ ...ss.inp, resize: 'vertical', lineHeight: '1.6', marginBottom: '12px' }}
          rows={3} placeholder="Come è andato? Dove sei arrivato, cosa hai scoperto..." value={progress} onChange={e => setProgress(e.target.value)} />

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <div style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${!completed ? C.border : C.greenBorder}`, background: !completed ? C.bg : C.greenBg, color: !completed ? C.hint : C.greenLight, fontSize: '12px', fontWeight: '600' }}
            onClick={() => setCompleted(false)}>Ancora in lavoro</div>
          <div style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${completed ? C.greenBorder : C.border}`, background: completed ? C.greenBg : C.bg, color: completed ? C.greenLight : C.hint, fontSize: '12px', fontWeight: '600' }}
            onClick={() => setCompleted(true)}>🎉 Chiuso!</div>
        </div>

        <div style={{ ...ss.savBtn, background: completed ? C.green : C.amber, color: completed ? '#000' : '#000', opacity: saving ? 0.5 : 1 }}
          onClick={!saving ? handleSave : undefined}>
          {saving ? 'Salvataggio...' : completed ? '🎉 Registra chiusura!' : 'Salva tentativo'}
        </div>
      </div>
    </div>
  )
}

// ── CRAG DETAIL ────────────────────────────────────────────────────
function CragDetail({ crag, sessions, ascents, onBack, onAddSession, onDelete }) {
  const [confirmDel, setConfirmDel] = React.useState(false)

  const cragSessions = sessions.filter(s => s.crag_id === crag.id)
  const cragAscents  = ascents.filter(a => cragSessions.some(s => s.id === a.session_id))
  const firstAscents = cragAscents.filter(a => IS_FIRST_ASCENT.includes(a.style) && a.completed)
  const maxGrade     = firstAscents.length ? firstAscents.reduce((max, a) => (GRADE_ORDER[a.grade] || 0) > (GRADE_ORDER[max] || 0) ? a.grade : max, firstAscents[0].grade) : null

  return (
    <div>
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: C.surface, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '320px', border: `1px solid ${C.redBorder}` }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: C.text, marginBottom: '8px' }}>Elimina falesia</div>
            <div style={{ fontSize: '13px', color: C.muted, marginBottom: '20px', lineHeight: '1.5' }}>Vuoi eliminare <strong style={{ color: C.text }}>{crag.name}</strong>? Le sessioni associate non verranno eliminate.</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', background: C.bg, border: `1px solid ${C.border}`, fontSize: '13px', color: C.muted }} onClick={() => setConfirmDel(false)}>Annulla</div>
              <div style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', background: C.redBg, border: `1px solid ${C.redBorder}`, fontSize: '13px', fontWeight: '600', color: C.red }} onClick={onDelete}>Elimina</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...ss.hdr, background: C.greenBg, borderBottomColor: C.greenBorder }}>
        <div style={{ fontSize: '12px', color: C.green, cursor: 'pointer', marginBottom: '12px', fontWeight: '500' }} onClick={onBack}>← Scalate</div>
        <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '.08em', textTransform: 'uppercase', color: C.green, marginBottom: '4px' }}>
          {crag.region || 'Falesia'}{crag.rock_type ? ` · ${crag.rock_type}` : ''}
        </div>
        <div style={{ fontSize: '26px', fontWeight: '700', color: C.text, letterSpacing: '-.02em' }}>{crag.name}</div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: C.text }}>{cragSessions.length}</div>
            <div style={{ fontSize: '9px', color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>sessioni</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: C.text }}>{cragAscents.length}</div>
            <div style={{ fontSize: '9px', color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>tiri totali</div>
          </div>
          {maxGrade && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: C.greenLight }}>{maxGrade}</div>
              <div style={{ fontSize: '9px', color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>grado max</div>
            </div>
          )}
        </div>
      </div>

      <div style={ss.body}>
        {crag.lat && crag.lng && (
          <MapboxMap crags={[crag]} centerCrag={crag} height="180px" interactive={false} />
        )}
        {crag.notes && (
          <div style={{ ...ss.card, marginTop: crag.lat ? '12px' : '0' }}>
            <div style={{ fontSize: '12px', color: C.muted, lineHeight: '1.6' }}>{crag.notes}</div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', marginTop: '4px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Sessioni</div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: C.violetLight, cursor: 'pointer', padding: '5px 10px', background: C.violetBg, border: `1px solid ${C.violetBorder}`, borderRadius: '8px' }}
            onClick={onAddSession}>+ Nuova sessione</div>
        </div>

        {cragSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', fontSize: '12px', color: C.hint, border: `1px dashed ${C.border}`, borderRadius: '12px' }}>
            Nessuna sessione registrata per questa falesia
          </div>
        ) : (
          cragSessions.sort((a, b) => b.session_date.localeCompare(a.session_date)).map(sess => {
            const sessAscents = ascents.filter(a => a.session_id === sess.id)
            const firstAsc = sessAscents.filter(a => IS_FIRST_ASCENT.includes(a.style) && a.completed)
            const maxG = firstAsc.length ? firstAsc.reduce((m, a) => (GRADE_ORDER[a.grade] || 0) > (GRADE_ORDER[m] || 0) ? a.grade : m, firstAsc[0].grade) : null
            return (
              <div key={sess.id} style={{ ...ss.card, marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>{fmtDateShort(sess.session_date)}</div>
                    <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px' }}>{sessAscents.length} tiri{maxG ? ` · max ${maxG}` : ''}</div>
                  </div>
                  {maxG && <div style={{ fontSize: '13px', fontWeight: '700', color: C.violetLight, background: C.violetBg, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${C.violetBorder}` }}>{maxG}</div>}
                </div>
                {sessAscents.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {sessAscents.map((a, i) => {
                      const styleInfo = STYLE_MAP[a.style] || STYLE_MAP.redpoint
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px' }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: a.completed ? styleInfo.color : C.hint }} />
                          <span style={{ fontSize: '11px', fontWeight: '600', color: C.text }}>{a.grade}</span>
                          <span style={{ fontSize: '9px', color: styleInfo.color }}>{styleInfo.short}</span>
                          {a.route_name && <span style={{ fontSize: '10px', color: C.muted }}>· {a.route_name}</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
                {sess.notes && <div style={{ fontSize: '11px', color: C.muted, marginTop: '8px', lineHeight: '1.5', fontStyle: 'italic' }}>{sess.notes}</div>}
              </div>
            )
          })
        )}

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <div style={{ fontSize: '11px', color: C.red, cursor: 'pointer', opacity: 0.6, padding: '8px' }} onClick={() => setConfirmDel(true)}>Elimina falesia</div>
        </div>
      </div>
    </div>
  )
}

// ── STATS ──────────────────────────────────────────────────────────
function StatsSection({ sessions, ascents, crags }) {
  const firstAscents = ascents.filter(a => IS_FIRST_ASCENT.includes(a.style) && a.completed)
  const repetitions  = ascents.filter(a => a.style === 'ripetizione' && a.completed)

  // Grade pyramid
  const gradeCounts = {}
  firstAscents.forEach(a => { gradeCounts[a.grade] = (gradeCounts[a.grade] || 0) + 1 })
  const pyramidGrades = GRADES.filter(g => gradeCounts[g]).reverse()
  const maxCount = Math.max(...Object.values(gradeCounts), 1)

  // Style breakdown
  const styleCounts = {}
  ascents.filter(a => a.completed).forEach(a => { styleCounts[a.style] = (styleCounts[a.style] || 0) + 1 })

  // Top repeated routes
  const routeCounts = {}
  ascents.forEach(a => { if (a.route_name) routeCounts[a.route_name] = (routeCounts[a.route_name] || 0) + 1 })
  const topRoutes = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Progression over time — group by month
  const monthlyData = {}
  sessions.forEach(sess => {
    const month = sess.session_date.slice(0, 7)
    if (!monthlyData[month]) monthlyData[month] = { month, total: 0, firstAscents: 0, maxGrade: null }
    const sessAscents = ascents.filter(a => a.session_id === sess.id)
    sessAscents.forEach(a => {
      if (a.completed) {
        monthlyData[month].total++
        if (IS_FIRST_ASCENT.includes(a.style)) {
          monthlyData[month].firstAscents++
          if (!monthlyData[month].maxGrade || (GRADE_ORDER[a.grade] || 0) > (GRADE_ORDER[monthlyData[month].maxGrade] || 0)) {
            monthlyData[month].maxGrade = a.grade
          }
        }
      }
    })
  })
  const months = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
  const maxMonthlyTotal = Math.max(...months.map(m => m.total), 1)

  // Crag frequency
  const cragCounts = {}
  sessions.forEach(s => { cragCounts[s.crag_id] = (cragCounts[s.crag_id] || 0) + 1 })
  const topCrags = Object.entries(cragCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  if (sessions.length === 0) {
    return (
      <div style={{ ...ss.body, textAlign: 'center', paddingTop: '48px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
        <div style={{ fontSize: '14px', color: C.muted }}>Nessun dato ancora.</div>
        <div style={{ fontSize: '12px', color: C.hint, marginTop: '8px' }}>Registra sessioni per vedere le statistiche.</div>
      </div>
    )
  }

  return (
    <div style={ss.body}>
      {/* Totali */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {[
          { l: 'Sessioni', v: sessions.length, c: C.violet },
          { l: 'Tiri totali', v: ascents.filter(a => a.completed).length, c: C.blue },
          { l: 'Prime salite', v: firstAscents.length, c: C.green },
        ].map(it => (
          <div key={it.l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: it.c }}>{it.v}</div>
            <div style={{ fontSize: '9px', color: C.hint, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: '3px' }}>{it.l}</div>
          </div>
        ))}
      </div>

      {/* Piramide gradi */}
      {pyramidGrades.length > 0 && (
        <div style={ss.card}>
          <div style={ss.secLbl}>Piramide gradi · prime salite</div>
          {pyramidGrades.map(g => (
            <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
              <div style={{ width: '32px', fontSize: '11px', fontWeight: '700', color: C.text, textAlign: 'right', flexShrink: 0 }}>{g}</div>
              <div style={{ flex: 1, background: C.bg, borderRadius: '4px', height: '18px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: `linear-gradient(90deg, ${C.violet}, ${C.violetLight})`, width: `${(gradeCounts[g] / maxCount) * 100}%`, borderRadius: '4px', display: 'flex', alignItems: 'center', paddingLeft: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#fff' }}>{gradeCounts[g]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Volume mensile */}
      {months.length > 0 && (
        <div style={ss.card}>
          <div style={ss.secLbl}>Volume mensile</div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '80px' }}>
            {months.map(m => (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <div style={{ fontSize: '8px', color: C.violet, fontWeight: '600' }}>{m.total}</div>
                <div style={{ width: '100%', background: C.violet, borderRadius: '3px 3px 0 0', height: `${(m.total / maxMonthlyTotal) * 60}px`, minHeight: '4px' }} />
                <div style={{ fontSize: '8px', color: C.hint, textAlign: 'center' }}>{m.month.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stili */}
      {Object.keys(styleCounts).length > 0 && (
        <div style={ss.card}>
          <div style={ss.secLbl}>Per stile</div>
          {STYLES.filter(s => styleCounts[s.id]).map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                <div style={{ fontSize: '12px', color: C.textSoft }}>{s.label}</div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{styleCounts[s.id]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top vie ripetute */}
      {topRoutes.length > 0 && (
        <div style={ss.card}>
          <div style={ss.secLbl}>Vie più ripetute</div>
          {topRoutes.map(([name, count], i) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: C.hint, width: '16px' }}>{i + 1}</div>
                <div style={{ fontSize: '12px', color: C.textSoft }}>{name}</div>
              </div>
              <div style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '999px', background: C.violetBg, color: C.violetLight, border: `1px solid ${C.violetBorder}` }}>×{count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top falesie */}
      {topCrags.length > 0 && (
        <div style={ss.card}>
          <div style={ss.secLbl}>Falesie più visitate</div>
          {topCrags.map(([cragId, count], i) => {
            const crag = crags.find(c => c.id === parseInt(cragId))
            return (
              <div key={cragId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: C.hint, width: '16px' }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: '12px', color: C.textSoft }}>{crag?.name || '—'}</div>
                    {crag?.region && <div style={{ fontSize: '10px', color: C.hint }}>{crag.region}</div>}
                  </div>
                </div>
                <div style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '999px', background: C.greenBg, color: C.greenLight, border: `1px solid ${C.greenBorder}` }}>{count} uscite</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── PROJECTS TAB ───────────────────────────────────────────────────
function ProjectsTab({ projects, attempts, crags, onAdded, onRefresh }) {
  const [showForm,       setShowForm]       = React.useState(false)
  const [showAttempt,    setShowAttempt]    = React.useState(null)
  const [expandedProject, setExpandedProject] = React.useState(null)

  const active = projects.filter(p => p.status === 'active')
  const closed = projects.filter(p => p.status === 'closed')

  const ProjectCard = ({ project }) => {
    const projAttempts = attempts.filter(a => a.project_id === project.id).sort((a, b) => a.attempt_date.localeCompare(b.attempt_date))
    const crag = crags.find(c => c.id === project.crag_id)
    const isExpanded = expandedProject === project.id
    const isClosed = project.status === 'closed'
    const closeDate = isClosed ? projAttempts.find(a => a.completed)?.attempt_date : null

    return (
      <div style={{ ...ss.card, marginBottom: '8px', border: `1px solid ${isClosed ? C.greenBorder : C.amberBorder}`, background: isClosed ? C.greenBg : C.amberBg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
          onClick={() => setExpandedProject(isExpanded ? null : project.id)}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              {isClosed && <span style={{ fontSize: '13px' }}>✓</span>}
              <div style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>{project.route_name}</div>
            </div>
            <div style={{ fontSize: '10px', color: isClosed ? C.green : C.amber, display: 'flex', gap: '8px' }}>
              {crag && <span>{crag.name}</span>}
              <span>{project.grade}</span>
              {isClosed && closeDate && <span>· chiuso {fmtDateShort(closeDate)}</span>}
              {!isClosed && <span>· {projAttempts.length} tent.</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isClosed && (
              <div style={{ padding: '5px 10px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${C.amberBorder}`, borderRadius: '8px', fontSize: '10px', fontWeight: '600', color: C.amber, cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); setShowAttempt(project) }}>
                + Tentativo
              </div>
            )}
            <div style={{ fontSize: '14px', color: isClosed ? C.green : C.amber }}>{isExpanded ? '▲' : '▼'}</div>
          </div>
        </div>

        {isExpanded && projAttempts.length > 0 && (
          <div style={{ marginTop: '12px', borderTop: `1px solid ${isClosed ? C.greenBorder : C.amberBorder}`, paddingTop: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Timeline</div>
            {projAttempts.map((att, i) => (
              <div key={att.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: att.completed ? C.green : C.amber, marginTop: '3px', flexShrink: 0 }} />
                  {i < projAttempts.length - 1 && <div style={{ width: '1px', flex: 1, background: C.border, marginTop: '3px' }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: '4px' }}>
                  <div style={{ fontSize: '10px', color: C.muted, marginBottom: '2px' }}>{fmtDateShort(att.attempt_date)}{att.completed ? ' · 🎉 CHIUSO' : ''}</div>
                  {att.progress && <div style={{ fontSize: '12px', color: C.textSoft, lineHeight: '1.5' }}>{att.progress}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
        {isExpanded && projAttempts.length === 0 && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: C.hint, textAlign: 'center', padding: '8px' }}>Nessun tentativo ancora</div>
        )}
      </div>
    )
  }

  return (
    <div style={ss.body}>
      {showForm && <ProjectForm crags={crags} onSaved={() => { setShowForm(false); onAdded() }} onClose={() => setShowForm(false)} />}
      {showAttempt && <AttemptForm project={showAttempt} onSaved={() => { setShowAttempt(null); onRefresh() }} onClose={() => setShowAttempt(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: C.muted }}>{active.length} attivi · {closed.length} chiusi</div>
        <div style={{ ...ss.savBtn, width: 'auto', padding: '8px 16px', background: C.amber, color: '#000', fontSize: '12px', marginTop: 0 }}
          onClick={() => setShowForm(true)}>+ Nuovo progetto</div>
      </div>

      {active.length === 0 && closed.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: '13px', color: C.hint }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
          Nessun progetto ancora.<br />
          <span style={{ fontSize: '11px' }}>Aggiungi una via su cui stai lavorando.</span>
        </div>
      )}

      {active.length > 0 && (
        <>
          <div style={{ fontSize: '10px', fontWeight: '600', color: C.amber, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>Attivi</div>
          {active.map(p => <ProjectCard key={p.id} project={p} />)}
        </>
      )}

      {closed.length > 0 && (
        <>
          <div style={{ fontSize: '10px', fontWeight: '600', color: C.green, textTransform: 'uppercase', letterSpacing: '.08em', marginTop: '16px', marginBottom: '8px' }}>Chiusi ✓</div>
          {closed.map(p => <ProjectCard key={p.id} project={p} />)}
        </>
      )}
    </div>
  )
}

// ── MAIN SCALATE ───────────────────────────────────────────────────
export default function ScalateSection() {
  const [sub,          setSub]          = React.useState('falesie')
  const [crags,        setCrags]        = React.useState([])
  const [sessions,     setSessions]     = React.useState([])
  const [ascents,      setAscents]      = React.useState([])
  const [projects,     setProjects]     = React.useState([])
  const [attempts,     setAttempts]     = React.useState([])
  const [loading,      setLoading]      = React.useState(true)
  const [selectedCrag, setSelectedCrag] = React.useState(null)
  const [showCragForm, setShowCragForm] = React.useState(false)
  const [showSessForm, setShowSessForm] = React.useState(false)
  const [editCrag,     setEditCrag]     = React.useState(null)

  const loadAll = async () => {
    setLoading(true)
    const [c, s, a, p, at] = await Promise.all([
      loadCrags(), loadClimbingSessions(), loadAscents(), loadProjects(), loadProjectAttempts()
    ])
    setCrags(c); setSessions(s); setAscents(a); setProjects(p); setAttempts(at)
    setLoading(false)
  }

  React.useEffect(() => { loadAll() }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: '12px', color: C.hint }}>Caricamento...</div>
      </div>
    )
  }

  // Crag detail view
  if (selectedCrag) {
    return (
      <CragDetail
        crag={selectedCrag}
        sessions={sessions}
        ascents={ascents}
        onBack={() => setSelectedCrag(null)}
        onAddSession={() => setShowSessForm(true)}
        onDelete={async () => {
          await deleteCrag(selectedCrag.id)
          setSelectedCrag(null)
          loadAll()
        }}
      >
        {showSessForm && (
          <SessionForm
            crags={crags.filter(c => c.id === selectedCrag.id)}
            onSaved={() => { setShowSessForm(false); loadAll() }}
            onClose={() => setShowSessForm(false)}
          />
        )}
      </CragDetail>
    )
  }

  const renderFalesie = () => (
    <div style={ss.body}>
      {showCragForm && <CragForm editCrag={editCrag} onSaved={() => { setShowCragForm(false); setEditCrag(null); loadAll() }} onClose={() => { setShowCragForm(false); setEditCrag(null) }} />}
      {showSessForm && <SessionForm crags={crags} onSaved={() => { setShowSessForm(false); loadAll() }} onClose={() => setShowSessForm(false)} />}

      {/* Mappa globale */}
      {crags.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <MapboxMap
            crags={crags}
            selectedCragId={null}
            onCragClick={(crag) => setSelectedCrag(crag)}
            height="220px"
          />
          <div style={{ fontSize: '10px', color: C.hint, textAlign: 'center', marginTop: '6px' }}>
            Tocca un marker per aprire la falesia
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          {crags.length} {crags.length === 1 ? 'falesia' : 'falesie'}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: C.violetLight, cursor: 'pointer', padding: '5px 10px', background: C.violetBg, border: `1px solid ${C.violetBorder}`, borderRadius: '8px' }}
            onClick={() => setShowSessForm(true)}>+ Sessione</div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: C.greenLight, cursor: 'pointer', padding: '5px 10px', background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: '8px' }}
            onClick={() => setShowCragForm(true)}>+ Falesia</div>
        </div>
      </div>

      {crags.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🧗</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: C.text, marginBottom: '8px' }}>Nessuna falesia ancora</div>
          <div style={{ fontSize: '12px', color: C.muted, marginBottom: '24px', lineHeight: '1.6' }}>Aggiungi le falesie che frequenti per iniziare a tracciare le tue uscite.</div>
          <div style={{ ...ss.savBtn, maxWidth: '200px', margin: '0 auto', background: C.green }}
            onClick={() => setShowCragForm(true)}>Aggiungi prima falesia</div>
        </div>
      ) : (
        crags.map(crag => {
          const cragSessions = sessions.filter(s => s.crag_id === crag.id)
          const cragAscents  = ascents.filter(a => cragSessions.some(s => s.id === a.session_id))
          const firstAscentsHere = cragAscents.filter(a => IS_FIRST_ASCENT.includes(a.style) && a.completed)
          const maxGrade = firstAscentsHere.length ? firstAscentsHere.reduce((m, a) => (GRADE_ORDER[a.grade] || 0) > (GRADE_ORDER[m] || 0) ? a.grade : m, firstAscentsHere[0].grade) : null

          return (
            <div key={crag.id} style={{ ...ss.card, cursor: 'pointer', marginBottom: '8px' }}
              onClick={() => setSelectedCrag(crag)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: C.text, marginBottom: '3px' }}>{crag.name}</div>
                  <div style={{ fontSize: '10px', color: C.muted }}>
                    {crag.region && <span>{crag.region}</span>}
                    {crag.rock_type && <span style={{ marginLeft: '6px', color: C.hint }}>· {crag.rock_type}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {maxGrade && <div style={{ fontSize: '13px', fontWeight: '700', color: C.violetLight, background: C.violetBg, padding: '3px 8px', borderRadius: '6px', border: `1px solid ${C.violetBorder}` }}>{maxGrade}</div>}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>{cragSessions.length}</div>
                    <div style={{ fontSize: '8px', color: C.hint, textTransform: 'uppercase' }}>uscite</div>
                  </div>
                </div>
              </div>
              {crag.lat && crag.lng && (
                <div style={{ fontSize: '9px', color: C.hint, marginTop: '5px' }}>📍 {crag.lat.toFixed(3)}, {crag.lng.toFixed(3)}</div>
              )}
            </div>
          )
        })
      )}
    </div>
  )

  return (
    <div>
      {showSessForm && !selectedCrag && (
        <SessionForm crags={crags} onSaved={() => { setShowSessForm(false); loadAll() }} onClose={() => setShowSessForm(false)} />
      )}

      <div style={ss.hdr}>
        <div style={ss.eyebrow}>arrampicata · performance</div>
        <div style={ss.title}>Scalate</div>
        <div style={ss.subtitle}>
          {sessions.length} sessioni · {ascents.filter(a => IS_FIRST_ASCENT.includes(a.style) && a.completed).length} prime salite
        </div>
      </div>

      <div style={ss.subBar}>
        {[{ id: 'falesie', l: 'Falesie' }, { id: 'progetti', l: 'Progetti' }, { id: 'stats', l: 'Stats' }].map(t => (
          <div key={t.id} style={ss.subTab(sub === t.id)} onClick={() => setSub(t.id)}>{t.l}</div>
        ))}
      </div>

      {sub === 'falesie'  && renderFalesie()}
      {sub === 'progetti' && <ProjectsTab projects={projects} attempts={attempts} crags={crags} onAdded={loadAll} onRefresh={loadAll} />}
      {sub === 'stats'    && <StatsSection sessions={sessions} ascents={ascents} crags={crags} />}
    </div>
  )
}
