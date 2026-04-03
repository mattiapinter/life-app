import React from 'react'
import { C, ss, todayStr, fmtDateShort } from '../constants'
import {
  loadCrags, saveCrag, deleteCrag,
  loadClimbingSessions, saveClimbingSession, deleteClimbingSession, fetchWeatherForSession,
  loadAscents, saveAscent, deleteAscent,
  loadProjects, saveProject, updateProject,
  loadProjectAttempts, saveProjectAttempt,
} from '../lib/supabase'

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWF0dGlhcGludGVyIiwiYSI6ImNtbjhxbnE4YzAwb3oycnBiajh6MWVxbjcifQ.9speCzHwwbsAaqr2IcukHw'

const GRADES = [
  '4','4+','5','5+','6a','6a+','6b','6b+','6c','6c+',
  '7a','7a+','7b','7b+','7c','7c+',
  '8a','8a+','8b','8b+','8c','8c+','9a','9a+','9b','9b+','9c',
]
const GRADE_ORDER = Object.fromEntries(GRADES.map((g, i) => [g, i]))

const CLIMB_STYLES = [
  { id: 'a_vista',     label: 'A vista',     color: C.amber,  short: 'AV' },
  { id: 'flash',       label: 'Flash',       color: C.green,  short: 'FL' },
  { id: 'redpoint',    label: 'Redpoint',    color: C.violet, short: 'RP' },
  { id: 'ripetizione', label: 'Ripetizione', color: C.blue,   short: 'RI' },
  { id: 'top_rope',    label: 'Top rope',    color: C.muted,  short: 'TR' },
]
const STYLE_MAP = Object.fromEntries(CLIMB_STYLES.map(s => [s.id, s]))
const IS_FIRST_ASCENT = ['a_vista', 'flash', 'redpoint']

const CRAG_STYLES = [
  { id: 'placca',     label: 'Placca' },
  { id: 'verticale',  label: 'Verticale' },
  { id: 'strapiombo', label: 'Strapiombo' },
  { id: 'tetto',      label: 'Tetto' },
  { id: 'misto',      label: 'Misto' },
]

const EXPOSURES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'O', 'NO']

const WMO_LABEL = (code) => {
  if (code == null) return null
  if (code === 0) return { label: 'Sole', icon: '☀️' }
  if (code <= 3)  return { label: 'Parzialmente nuvoloso', icon: '⛅' }
  if (code <= 49) return { label: 'Nebbia/foschia', icon: '🌫️' }
  if (code <= 69) return { label: 'Pioggia', icon: '🌧️' }
  if (code <= 79) return { label: 'Neve', icon: '❄️' }
  if (code <= 99) return { label: 'Temporale', icon: '⛈️' }
  return { label: 'Coperto', icon: '☁️' }
}

function StarRating({ value, onChange, size = 16 }) {
  const [hover, setHover] = React.useState(0)
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1,2,3,4,5].map(n => {
        const current = hover || value || 0
        const active = n <= current
        const starColor = current <= 2 ? C.hint : current === 3 ? C.amber : C.green
        const color = active ? starColor : C.border
        return (
          <div key={n}
            style={{ fontSize: `${size}px`, cursor: 'pointer', color, transition: 'color 0.15s', lineHeight: 1 }}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n === value ? null : n)}>
            {active ? '★' : '☆'}
          </div>
        )
      })}
    </div>
  )
}

// ── GPS BUTTON ─────────────────────────────────────────────────────
function GpsButton({ url, onUrlChange }) {
  const [showModal, setShowModal] = React.useState(false)
  const [input, setInput]         = React.useState('')
  const [saving, setSaving]       = React.useState(false)

  const handleSave = async () => {
    if (!input.trim()) return
    setSaving(true)
    await onUrlChange(input.trim())
    setSaving(false)
    setShowModal(false)
    setInput('')
  }

  return (
    <>
      {url ? (
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: '6px', fontSize: '10px', color: C.greenLight, fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            📍 Traccia GPS
          </a>
          <div style={{ padding: '3px 6px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: C.muted }}
            onClick={() => setShowModal(true)}>✎</div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: 'transparent', border: `1px dashed ${C.hint}`, borderRadius: '6px', cursor: 'pointer', fontSize: '10px', color: C.hint, whiteSpace: 'nowrap' }}
          onClick={() => setShowModal(true)}>
          + traccia GPS
        </div>
      )}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowModal(false)}>
          <div style={{ width: '100%', maxWidth: '448px', margin: '0 auto', background: C.surface, borderRadius: '20px 20px 0 0', padding: '20px', paddingBottom: '40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '4px' }}>Traccia GPS / Avvicinamento</div>
            <div style={{ fontSize: '11px', color: C.muted, marginBottom: '12px' }}>Incolla un link Komoot, Wikiloc, Google Maps ecc.</div>
            {url && <div style={{ fontSize: '10px', color: C.hint, marginBottom: '8px', padding: '6px', background: C.bg, borderRadius: '6px', wordBreak: 'break-all' }}>Attuale: {url}</div>}
            <input style={{ ...ss.inp, marginBottom: '10px' }} placeholder="https://www.komoot.com/tour/..." value={input} onChange={e => setInput(e.target.value)} autoFocus />
            <div style={{ ...ss.savBtn, background: C.green, opacity: (!input.trim() || saving) ? 0.5 : 1 }} onClick={!saving && input.trim() ? handleSave : undefined}>
              {saving ? 'Salvataggio...' : 'Salva'}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── MAPBOX COMPONENT ──────────────────────────────────────────────
function MapboxMap({ crags, selectedCragId, onCragClick, onMapClick, interactive = true, height = '260px', centerCrag = null }) {
  const mapRef      = React.useRef(null)
  const mapInstance = React.useRef(null)
  const markersRef  = React.useRef([])
  const [mapLoaded, setMapLoaded] = React.useState(false)

  React.useEffect(() => {
    if (mapInstance.current || !mapRef.current) return

    const initMap = () => {
      if (!window.mapboxgl) return
      window.mapboxgl.accessToken = MAPBOX_TOKEN

      const center = centerCrag
        ? [centerCrag.lng, centerCrag.lat]
        : crags.length > 0
          ? [crags.reduce((s, c) => s + (c.lng || 12), 0) / crags.length, crags.reduce((s, c) => s + (c.lat || 46), 0) / crags.length]
          : [11.0, 46.1]

      const zoom = centerCrag ? 14 : crags.length > 1 ? 8 : crags.length === 1 ? 13 : 9

      mapInstance.current = new window.mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
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

    const existingScript = document.getElementById('mapbox-script')
    if (!existingScript) {
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
      existingScript.addEventListener('load', initMap)
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
        setMapLoaded(false)
      }
    }
  }, [])

  React.useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    crags.forEach(crag => {
      if (!crag.lat || !crag.lng) return
      const isSelected = crag.id === selectedCragId
      const el = document.createElement('div')
      el.style.cssText = `
        width: ${isSelected ? '18px' : '13px'};
        height: ${isSelected ? '18px' : '13px'};
        border-radius: 50%;
        background: ${isSelected ? C.green : C.amber};
        border: 2.5px solid #fff;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        transition: all 0.2s;
      `
      if (onCragClick) el.addEventListener('click', (e) => { e.stopPropagation(); onCragClick(crag) })

      const popup = new window.mapboxgl.Popup({ offset: 18, closeButton: false })
        .setHTML(`<div style="background:#1C1C1C;border:1px solid #3A3A3A;padding:8px 12px;border-radius:8px;font-family:'DM Sans',sans-serif;color:#F0F0F0;font-size:12px;font-weight:600;white-space:nowrap">${crag.name}${crag.region ? `<span style="color:#888;font-weight:400;margin-left:6px">${crag.region}</span>` : ''}</div>`)

      const marker = new window.mapboxgl.Marker({ element: el })
        .setLngLat([crag.lng, crag.lat])
        .setPopup(popup)
        .addTo(mapInstance.current)

      markersRef.current.push(marker)
    })
  }, [crags, selectedCragId, mapLoaded])

  return (
    <div style={{ position: 'relative', height, borderRadius: '12px', overflow: 'hidden', background: '#1a2a1a' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {!mapLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#161616', fontSize: '12px', color: C.hint }}>
          Caricamento mappa...
        </div>
      )}
      {onMapClick && mapLoaded && (
        <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', border: `1px solid rgba(255,255,255,0.15)`, borderRadius: '999px', padding: '5px 12px', fontSize: '10px', color: '#ddd', pointerEvents: 'none' }}>
          Tocca la mappa per posizionare il pin
        </div>
      )}
    </div>
  )
}

// ── CRAG FORM ──────────────────────────────────────────────────────
function CragForm({ onSaved, onClose, editCrag = null }) {
  const [name,       setName]       = React.useState(editCrag?.name || '')
  const [region,     setRegion]     = React.useState(editCrag?.region || '')
  const [rock,       setRock]       = React.useState(editCrag?.rock_type || '')
  const [notes,      setNotes]      = React.useState(editCrag?.notes || '')
  const [lat,        setLat]        = React.useState(editCrag?.lat || null)
  const [lng,        setLng]        = React.useState(editCrag?.lng || null)
  const [gradeMin,   setGradeMin]   = React.useState(editCrag?.grade_min || '5')
  const [gradeMax,   setGradeMax]   = React.useState(editCrag?.grade_max || '8a')
  const [approach,   setApproach]   = React.useState(editCrag?.approach_min || '')
  const [cragStyles, setCragStyles] = React.useState(editCrag?.styles || [])
  const [exposure,   setExposure]   = React.useState(editCrag?.exposure || null)
  const [saving,     setSaving]     = React.useState(false)

  const toggleCragStyle = (id) => setCragStyles(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id])
  const previewCrag = lat && lng ? [{ id: 'preview', name: name || 'Nuova falesia', lat, lng }] : []

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await saveCrag({
      id: editCrag?.id,
      name: name.trim(), region: region.trim(), rock_type: rock.trim(),
      notes: notes.trim(), lat, lng,
      grade_min: gradeMin, grade_max: gradeMax,
      approach_min: approach ? parseInt(approach) : null,
      styles: cragStyles,
      exposure: exposure || null,
    })
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', color: C.hint, marginBottom: '4px' }}>Grado min</div>
            <select style={{ ...ss.inp, appearance: 'none' }} value={gradeMin} onChange={e => setGradeMin(e.target.value)}>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: C.hint, marginBottom: '4px' }}>Grado max</div>
            <select style={{ ...ss.inp, appearance: 'none' }} value={gradeMax} onChange={e => setGradeMax(e.target.value)}>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: C.hint, marginBottom: '4px' }}>Avvic. (min)</div>
            <input type="number" style={ss.inp} placeholder="es. 15" value={approach} onChange={e => setApproach(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', color: C.hint, marginBottom: '6px' }}>Stile falesia</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {CRAG_STYLES.map(s => {
              const sel = cragStyles.includes(s.id)
              return (
                <div key={s.id}
                  style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', border: `1px solid ${sel ? C.greenBorder : C.border}`, background: sel ? C.greenBg : 'transparent', color: sel ? C.greenLight : C.hint }}
                  onClick={() => toggleCragStyle(s.id)}>
                  {s.label}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', color: C.hint, marginBottom: '6px' }}>Esposizione</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {EXPOSURES.map(e => {
              const sel = exposure === e
              return (
                <div key={e}
                  style={{ padding: '4px 11px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: `1px solid ${sel ? C.blue : C.border}`, background: sel ? C.blueBg : 'transparent', color: sel ? C.blueLight : C.hint, fontFamily: 'monospace' }}
                  onClick={() => setExposure(sel ? null : e)}>
                  {e}
                </div>
              )
            })}
          </div>
        </div>

        <textarea style={{ ...ss.inp, resize: 'vertical', lineHeight: '1.6', marginBottom: '14px' }}
          rows={2} placeholder="Note, descrizione, info utili..." value={notes} onChange={e => setNotes(e.target.value)} />

        <div style={{ fontSize: '10px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>
          Posizione sulla mappa
        </div>
        <MapboxMap crags={previewCrag} height="200px" onMapClick={(la, ln) => { setLat(la); setLng(ln) }} />
        {lat && lng
          ? <div style={{ fontSize: '10px', color: C.green, marginTop: '6px', textAlign: 'center' }}>📍 {lat.toFixed(5)}, {lng.toFixed(5)} · tocca di nuovo per spostare</div>
          : <div style={{ fontSize: '10px', color: C.hint, marginTop: '6px', textAlign: 'center' }}>Tocca la mappa per posizionare la falesia (opzionale)</div>
        }

        <div style={{ ...ss.savBtn, marginTop: '16px', opacity: (!name.trim() || saving) ? 0.5 : 1, background: C.green }}
          onClick={!saving && name.trim() ? handleSave : undefined}>
          {saving ? 'Salvataggio...' : editCrag ? 'Salva modifiche' : 'Aggiungi falesia'}
        </div>
      </div>
    </div>
  )
}

// ── SESSION FORM ───────────────────────────────────────────────────
function SessionForm({ crags, onSaved, onClose, sessionType = 'falesia' }) {
  const [date,    setDate]    = React.useState(todayStr())
  const [cragId,  setCragId]  = React.useState(crags[0]?.id || '')
  const [notes,   setNotes]   = React.useState('')
  const [ascents, setAscents] = React.useState([])
  const [saving,  setSaving]  = React.useState(false)

  const addAscent = () => setAscents(p => [...p, { route_name: '', grade: '7a', style: 'redpoint', completed: true, attempts: 1, rpe: '', quality_stars: null, notes: '' }])
  const updateAscent = (i, field, val) => setAscents(p => p.map((a, idx) => idx === i ? { ...a, [field]: val } : a))
  const removeAscent = (i) => setAscents(p => p.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!date || !cragId) return
    setSaving(true)
    const crag = crags.find(c => c.id === parseInt(cragId))
    let weatherData = null
    if (crag?.lat && crag?.lng) {
      weatherData = await fetchWeatherForSession(crag.lat, crag.lng, date)
    }
    const sessionId = await saveClimbingSession({
      session_date: date, crag_id: parseInt(cragId), notes: notes.trim(), type: sessionType,
      weather_temp: weatherData?.weather_temp ?? null,
      weather_code: weatherData?.weather_code ?? null,
    })
    if (sessionId) {
      for (const a of ascents) {
        if (!a.route_name.trim() && !a.grade) continue
        await saveAscent({ session_id: sessionId, route_name: a.route_name.trim(), grade: a.grade, style: a.style, completed: a.completed, attempts: parseInt(a.attempts) || 1, rpe: a.rpe ? parseInt(a.rpe) : null, quality_stars: a.quality_stars ?? null, notes: a.notes?.trim() || null })
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
              <div style={{ fontSize: '16px', color: C.hint, cursor: 'pointer' }} onClick={() => removeAscent(i)}>×</div>
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
              {CLIMB_STYLES.map(s => (
                <div key={s.id}
                  style={{ padding: '5px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', border: `1px solid ${a.style === s.id ? s.color : C.border}`, background: a.style === s.id ? `${s.color}22` : 'transparent', color: a.style === s.id ? s.color : C.hint }}
                  onClick={() => updateAscent(i, 'style', s.id)}>
                  {s.label}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: C.hint }}>Completata:</div>
              {[{ v: true, l: 'Si' }, { v: false, l: 'No' }].map(o => (
                <div key={o.l}
                  style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', border: `1px solid ${a.completed === o.v ? C.green : C.border}`, background: a.completed === o.v ? C.greenBg : 'transparent', color: a.completed === o.v ? C.greenLight : C.hint }}
                  onClick={() => updateAscent(i, 'completed', o.v)}>{o.l}</div>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ fontSize: '10px', color: C.hint }}>RPE</div>
                <select style={{ ...ss.inp, width: '60px', padding: '6px 8px', fontSize: '12px' }} value={a.rpe} onChange={e => updateAscent(i, 'rpe', e.target.value)}>
                  <option value="">—</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '10px', color: C.hint }}>Qualita':</div>
              <StarRating value={a.quality_stars} onChange={v => updateAscent(i, 'quality_stars', v)} size={18} />
            </div>
            {a.style !== 'ripetizione' && (
              <textarea style={{ ...ss.inp, resize: 'vertical', lineHeight: '1.5', marginTop: '8px', fontSize: '12px' }}
                rows={2} placeholder="Note tiro..." value={a.notes || ''}
                onChange={e => updateAscent(i, 'notes', e.target.value)} />
            )}
          </div>
        ))}

        {ascents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: C.hint, border: `1px dashed ${C.border}`, borderRadius: '12px', marginBottom: '12px' }}>
            Nessun tiro ancora · clicca "Aggiungi tiro"
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
  const [name,   setName]   = React.useState('')
  const [cragId, setCragId] = React.useState(crags[0]?.id || '')
  const [grade,  setGrade]  = React.useState('7b')
  const [notes,  setNotes]  = React.useState('')
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
  const [date,      setDate]      = React.useState(todayStr())
  const [progress,  setProgress]  = React.useState('')
  const [completed, setCompleted] = React.useState(false)
  const [saving,    setSaving]    = React.useState(false)

  const handleSave = async () => {
    setSaving(true)
    await saveProjectAttempt({ project_id: project.id, attempt_date: date, progress: progress.trim(), completed })
    if (completed) await updateProject(project.id, { status: 'closed' })
    setSaving(false)
    onSaved()
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
          rows={3} placeholder="Come è andato? Dove sei arrivato..." value={progress} onChange={e => setProgress(e.target.value)} />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <div style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${!completed ? C.amberBorder : C.border}`, background: !completed ? C.amberBg : C.bg, color: !completed ? C.amberLight : C.hint, fontSize: '12px', fontWeight: '600' }}
            onClick={() => setCompleted(false)}>Ancora in lavoro</div>
          <div style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${completed ? C.greenBorder : C.border}`, background: completed ? C.greenBg : C.bg, color: completed ? C.greenLight : C.hint, fontSize: '12px', fontWeight: '600' }}
            onClick={() => setCompleted(true)}>🎉 Chiuso!</div>
        </div>
        <div style={{ ...ss.savBtn, background: completed ? C.green : C.amber, color: '#000', opacity: saving ? 0.5 : 1 }}
          onClick={!saving ? handleSave : undefined}>
          {saving ? 'Salvataggio...' : completed ? '🎉 Registra chiusura!' : 'Salva tentativo'}
        </div>
      </div>
    </div>
  )
}

// ── EDIT SESSION DRAWER ────────────────────────────────────────────
function EditSessionDrawer({ session, ascents, onClose, onSaved }) {
  const [notes,    setNotes]    = React.useState(session.notes || '')
  const [rows,     setRows]     = React.useState(
    ascents.map(a => ({ ...a, _dirty: false, _deleted: false }))
  )
  const [newTiri,  setNewTiri]  = React.useState([])
  const [saving,   setSaving]   = React.useState(false)

  const updateRow = (id, field, val) =>
    setRows(p => p.map(r => r.id === id ? { ...r, [field]: val, _dirty: true } : r))
  const deleteRow = (id) =>
    setRows(p => p.map(r => r.id === id ? { ...r, _deleted: true } : r))

  const addNew = () =>
    setNewTiri(p => [...p, { _key: Date.now(), route_name: '', grade: '7a', style: 'redpoint', completed: true, attempts: 1, rpe: '', quality_stars: null, notes: '' }])
  const updateNew = (key, field, val) =>
    setNewTiri(p => p.map(t => t._key === key ? { ...t, [field]: val } : t))
  const removeNew = (key) =>
    setNewTiri(p => p.filter(t => t._key !== key))

  const handleSave = async () => {
    setSaving(true)
    const promises = []

    // Aggiorna note sessione
    promises.push(
      (async () => {
        const { db } = await import('../lib/supabase')
        await db.from('climbing_sessions').update({ notes: notes.trim() }).eq('id', session.id)
      })()
    )

    // Elimina tiri segnati
    for (const r of rows.filter(r => r._deleted)) {
      promises.push(deleteAscent(r.id))
    }

    // Aggiorna tiri modificati
    for (const r of rows.filter(r => r._dirty && !r._deleted)) {
      promises.push(
        (async () => {
          const { db } = await import('../lib/supabase')
          await db.from('ascents').update({
            route_name: r.route_name,
            grade: r.grade,
            style: r.style,
            completed: r.completed,
            attempts: parseInt(r.attempts) || 1,
            rpe: r.rpe ? parseInt(r.rpe) : null,
            quality_stars: r.quality_stars ?? null,
            notes: r.notes?.trim() || null,
          }).eq('id', r.id)
        })()
      )
    }

    // Aggiungi tiri nuovi
    for (const t of newTiri) {
      promises.push(saveAscent({
        session_id: session.id,
        route_name: t.route_name.trim(),
        grade: t.grade,
        style: t.style,
        completed: t.completed,
        attempts: parseInt(t.attempts) || 1,
        rpe: t.rpe ? parseInt(t.rpe) : null,
        quality_stars: t.quality_stars ?? null,
        notes: t.notes?.trim() || null,
      }))
    }

    await Promise.all(promises)
    setSaving(false)
    onSaved()
  }

  const visibleRows = rows.filter(r => !r._deleted)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '448px', margin: '0 auto', background: C.surface, borderRadius: '20px 20px 0 0', padding: '20px', paddingBottom: '40px', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: C.violet, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Modifica sessione · {fmtDateShort(session.session_date)}
          </div>
          <div style={{ cursor: 'pointer', color: C.muted, fontSize: '20px', lineHeight: 1 }} onClick={onClose}>×</div>
        </div>

        {/* Note sessione */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', color: C.hint, marginBottom: '5px' }}>Note sessione</div>
          <textarea style={{ ...ss.inp, resize: 'vertical', lineHeight: '1.6' }} rows={2}
            value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note..." />
        </div>

        {/* Tiri esistenti */}
        {visibleRows.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>
              Tiri ({visibleRows.length})
            </div>
            {visibleRows.map(r => {
              const styleInfo = STYLE_MAP[r.style] || STYLE_MAP.redpoint
              return (
                <div key={r.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: styleInfo.color }} />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: C.text }}>{r.grade}</span>
                      <span style={{ fontSize: '10px', color: styleInfo.color }}>{styleInfo.short}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: C.red, cursor: 'pointer', padding: '2px 8px', opacity: 0.7 }}
                      onClick={() => deleteRow(r.id)}>Elimina</div>
                  </div>
                  <input style={{ ...ss.inp, marginBottom: '8px', fontSize: '12px' }}
                    placeholder="Nome via" value={r.route_name || ''}
                    onChange={e => updateRow(r.id, 'route_name', e.target.value)} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '9px', color: C.hint, marginBottom: '3px' }}>Grado</div>
                      <select style={{ ...ss.inp, appearance: 'none', fontSize: '13px' }}
                        value={r.grade} onChange={e => updateRow(r.id, 'grade', e.target.value)}>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: C.hint, marginBottom: '3px' }}>RPE</div>
                      <select style={{ ...ss.inp, appearance: 'none', fontSize: '13px' }}
                        value={r.rpe || ''} onChange={e => updateRow(r.id, 'rpe', e.target.value)}>
                        <option value="">—</option>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {CLIMB_STYLES.map(s => (
                      <div key={s.id}
                        style={{ padding: '4px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', border: `1px solid ${r.style === s.id ? s.color : C.border}`, background: r.style === s.id ? `${s.color}22` : 'transparent', color: r.style === s.id ? s.color : C.hint }}
                        onClick={() => updateRow(r.id, 'style', s.id)}>
                        {s.label}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    {[{ v: true, l: 'Completata' }, { v: false, l: 'Tentativo' }].map(o => (
                      <div key={o.l}
                        style={{ flex: 1, padding: '5px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: '600', border: `1px solid ${r.completed === o.v ? C.green : C.border}`, background: r.completed === o.v ? C.greenBg : 'transparent', color: r.completed === o.v ? C.greenLight : C.hint }}
                        onClick={() => updateRow(r.id, 'completed', o.v)}>{o.l}</div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '9px', color: C.hint }}>Qualita':</div>
                    <StarRating value={r.quality_stars} onChange={v => updateRow(r.id, 'quality_stars', v)} size={16} />
                  </div>
                  {r.style !== 'ripetizione' && (
                    <textarea style={{ ...ss.inp, resize: 'vertical', lineHeight: '1.5', marginTop: '8px', fontSize: '12px' }}
                      rows={2} placeholder="Note tiro..." value={r.notes || ''}
                      onChange={e => updateRow(r.id, 'notes', e.target.value)} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Tiri nuovi */}
        {newTiri.map(t => (
          <div key={t._key} style={{ background: C.violetBg, border: `1px solid ${C.violetBorder}`, borderRadius: '12px', padding: '12px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: C.violetLight }}>Nuovo tiro</div>
              <div style={{ fontSize: '16px', color: C.muted, cursor: 'pointer' }} onClick={() => removeNew(t._key)}>×</div>
            </div>
            <input style={{ ...ss.inp, marginBottom: '8px', fontSize: '12px' }}
              placeholder="Nome via (opzionale)" value={t.route_name}
              onChange={e => updateNew(t._key, 'route_name', e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '9px', color: C.hint, marginBottom: '3px' }}>Grado</div>
                <select style={{ ...ss.inp, appearance: 'none' }} value={t.grade} onChange={e => updateNew(t._key, 'grade', e.target.value)}>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '9px', color: C.hint, marginBottom: '3px' }}>Tentativi</div>
                <input type="number" style={ss.inp} min="1" value={t.attempts} onChange={e => updateNew(t._key, 'attempts', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
              {CLIMB_STYLES.map(s => (
                <div key={s.id}
                  style={{ padding: '4px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', border: `1px solid ${t.style === s.id ? s.color : C.border}`, background: t.style === s.id ? `${s.color}22` : 'transparent', color: t.style === s.id ? s.color : C.hint }}
                  onClick={() => updateNew(t._key, 'style', s.id)}>
                  {s.label}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              {[{ v: true, l: 'Completata' }, { v: false, l: 'Tentativo' }].map(o => (
                <div key={o.l}
                  style={{ flex: 1, padding: '5px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: '600', border: `1px solid ${t.completed === o.v ? C.green : C.border}`, background: t.completed === o.v ? C.greenBg : 'transparent', color: t.completed === o.v ? C.greenLight : C.hint }}
                  onClick={() => updateNew(t._key, 'completed', o.v)}>{o.l}</div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '9px', color: C.hint }}>Qualita':</div>
              <StarRating value={t.quality_stars} onChange={v => updateNew(t._key, 'quality_stars', v)} size={16} />
            </div>
            {t.style !== 'ripetizione' && (
              <textarea style={{ ...ss.inp, resize: 'vertical', lineHeight: '1.5', marginTop: '8px', fontSize: '12px' }}
                rows={2} placeholder="Note tiro..." value={t.notes || ''}
                onChange={e => updateNew(t._key, 'notes', e.target.value)} />
            )}
          </div>
        ))}

        <div style={{ fontSize: '11px', fontWeight: '600', color: C.violetLight, cursor: 'pointer', textAlign: 'center', padding: '10px', background: C.violetBg, border: `1px solid ${C.violetBorder}`, borderRadius: '10px', marginBottom: '12px' }}
          onClick={addNew}>+ Aggiungi tiro</div>

        <div style={{ ...ss.savBtn, opacity: saving ? 0.6 : 1 }} onClick={!saving ? handleSave : undefined}>
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </div>
      </div>
    </div>
  )
}

// ── CRAG DETAIL ────────────────────────────────────────────────────
function CragDetail({ crag: initialCrag, sessions, ascents, onBack, onAddSession, onDelete, onCragUpdated }) {
  const [confirmDel,   setConfirmDel]   = React.useState(false)
  const [showEdit,     setShowEdit]     = React.useState(false)
  const [editSession,  setEditSession]  = React.useState(null)
  const [crag,         setCrag]         = React.useState(initialCrag)

  const cragSessions = sessions.filter(s => s.crag_id === crag.id)
  const cragAscents  = ascents.filter(a => cragSessions.some(s => s.id === a.session_id))
  const firstAscents = cragAscents.filter(a => IS_FIRST_ASCENT.includes(a.style) && a.completed)
  const maxGrade     = firstAscents.length ? firstAscents.reduce((m, a) => (GRADE_ORDER[a.grade] || 0) > (GRADE_ORDER[m] || 0) ? a.grade : m, firstAscents[0].grade) : null

  return (
    <div>
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: C.surface, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '320px', border: `1px solid ${C.redBorder}` }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: C.text, marginBottom: '8px' }}>Elimina falesia</div>
            <div style={{ fontSize: '13px', color: C.muted, marginBottom: '20px', lineHeight: '1.5' }}>Vuoi eliminare <strong style={{ color: C.text }}>{crag.name}</strong>?</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', background: C.bg, border: `1px solid ${C.border}`, fontSize: '13px', color: C.muted }} onClick={() => setConfirmDel(false)}>Annulla</div>
              <div style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', background: C.redBg, border: `1px solid ${C.redBorder}`, fontSize: '13px', fontWeight: '600', color: C.red }} onClick={onDelete}>Elimina</div>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <CragForm editCrag={crag} onSaved={async () => { setShowEdit(false); await onCragUpdated() }} onClose={() => setShowEdit(false)} />
      )}

      {editSession && (
        <EditSessionDrawer
          session={editSession}
          ascents={ascents.filter(a => a.session_id === editSession.id)}
          onClose={() => setEditSession(null)}
          onSaved={() => { setEditSession(null); onCragUpdated() }}
        />
      )}

      <div style={{ ...ss.hdr, background: C.greenBg, borderBottomColor: C.greenBorder }}>
        <div style={{ fontSize: '12px', color: C.green, cursor: 'pointer', marginBottom: '12px', fontWeight: '500' }} onClick={onBack}>← Scalate</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '.08em', textTransform: 'uppercase', color: C.green, marginBottom: '4px' }}>
              {crag.region || 'Falesia'}{crag.rock_type ? ` · ${crag.rock_type}` : ''}
            </div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: C.text, letterSpacing: '-.02em' }}>{crag.name}</div>
          </div>
          <div style={{ fontSize: '11px', color: C.green, cursor: 'pointer', padding: '6px 12px', border: `1px solid ${C.greenBorder}`, borderRadius: '8px', marginLeft: '12px', flexShrink: 0 }}
            onClick={() => setShowEdit(true)}>Modifica</div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          {crag.grade_min && crag.grade_max && (
            <div style={{ padding: '3px 10px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${C.greenBorder}`, borderRadius: '999px', fontSize: '10px', color: C.greenLight, fontWeight: '600' }}>
              {crag.grade_min} → {crag.grade_max}
            </div>
          )}
          {crag.exposure && (
            <div style={{ padding: '3px 10px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${C.blueBorder}`, borderRadius: '999px', fontSize: '10px', color: C.blueLight, fontWeight: '700', fontFamily: 'monospace' }}>
              {crag.exposure}
            </div>
          )}
          {(crag.styles || []).map(s => {
            const cs = CRAG_STYLES.find(x => x.id === s)
            return cs ? (
              <div key={s} style={{ padding: '3px 10px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${C.greenBorder}`, borderRadius: '999px', fontSize: '10px', color: C.greenLight }}>
                {cs.label}
              </div>
            ) : null
          })}
          <GpsButton
            url={crag.gps_url}
            onUrlChange={async (url) => {
              await saveCrag({ ...crag, gps_url: url })
              setCrag(p => ({ ...p, gps_url: url }))
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '14px' }}>
          {[
            { v: cragSessions.length, l: 'sessioni' },
            { v: cragAscents.length,  l: 'tiri totali' },
            { v: firstAscents.length, l: 'prime salite' },
          ].map(it => (
            <div key={it.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: it.l === 'prime salite' ? C.greenLight : C.text }}>{it.v}</div>
              <div style={{ fontSize: '9px', color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>{it.l}</div>
            </div>
          ))}
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
          <MapboxMap crags={[crag]} centerCrag={crag} height="200px" interactive={true} />
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
            const firstAsc    = sessAscents.filter(a => IS_FIRST_ASCENT.includes(a.style) && a.completed)
            const maxG        = firstAsc.length ? firstAsc.reduce((m, a) => (GRADE_ORDER[a.grade] || 0) > (GRADE_ORDER[m] || 0) ? a.grade : m, firstAsc[0].grade) : null
            return (
              <div key={sess.id} style={{ ...ss.card, marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>{fmtDateShort(sess.session_date)}</div>
                      {sess.weather_code != null && (() => {
                        const w = WMO_LABEL(sess.weather_code)
                        return w ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '999px', background: C.surface, border: `1px solid ${C.border}`, fontSize: '10px', color: C.muted }}>
                            {w.icon} {sess.weather_temp != null ? `${sess.weather_temp}°` : ''}
                          </div>
                        ) : null
                      })()}
                    </div>
                    <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px' }}>{sessAscents.length} tiri{maxG ? ` · max ${maxG}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {maxG && <div style={{ fontSize: '13px', fontWeight: '700', color: C.violetLight, background: C.violetBg, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${C.violetBorder}` }}>{maxG}</div>}
                    <div style={{ fontSize: '11px', color: C.violet, cursor: 'pointer', padding: '4px 10px', background: C.violetBg, border: `1px solid ${C.violetBorder}`, borderRadius: '8px', fontWeight: '600' }}
                      onClick={() => setEditSession(sess)}>✎</div>
                  </div>
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
                          {a.quality_stars && (
                            <span style={{ fontSize: '9px', color: a.quality_stars >= 4 ? C.green : C.amber }}>
                              {'★'.repeat(a.quality_stars)}
                            </span>
                          )}
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

// ── TIRI TAB ───────────────────────────────────────────────────────
function TiriTab({ ascents, sessions, crags, onRefresh }) {
  const [filter, setFilter] = React.useState('tutti')
  const [editSession, setEditSession] = React.useState(null)

  const filtered = ascents.filter(a => {
    if (filter === 'prime')       return IS_FIRST_ASCENT.includes(a.style) && a.completed
    if (filter === 'ripetizioni') return a.style === 'ripetizione'
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const sA = sessions.find(s => s.id === a.session_id)
    const sB = sessions.find(s => s.id === b.session_id)
    return (sB?.session_date || '').localeCompare(sA?.session_date || '')
  })

  if (ascents.length === 0) {
    return (
      <div style={{ ...ss.body, textAlign: 'center', paddingTop: '48px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧗</div>
        <div style={{ fontSize: '14px', color: C.muted }}>Nessun tiro ancora.</div>
        <div style={{ fontSize: '12px', color: C.hint, marginTop: '8px' }}>Registra una sessione per vedere i tuoi tiri qui.</div>
      </div>
    )
  }

  return (
    <div style={ss.body}>
      {editSession && (
        <EditSessionDrawer
          session={editSession}
          ascents={ascents.filter(a => a.session_id === editSession.id)}
          onClose={() => setEditSession(null)}
          onSaved={() => { setEditSession(null); onRefresh() }}
        />
      )}

      <div style={{ display: 'flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '3px', marginBottom: '16px' }}>
        {[{ id: 'tutti', l: 'Tutti' }, { id: 'prime', l: 'Prime salite' }, { id: 'ripetizioni', l: 'Ripetizioni' }].map(f => (
          <div key={f.id} style={ss.pill(filter === f.id)} onClick={() => setFilter(f.id)}>{f.l}</div>
        ))}
      </div>
      <div style={{ fontSize: '11px', color: C.hint, marginBottom: '12px' }}>{sorted.length} tiri</div>
      {sorted.map((a, i) => {
        const sess      = sessions.find(s => s.id === a.session_id)
        const crag      = crags.find(c => c.id === sess?.crag_id)
        const styleInfo = STYLE_MAP[a.style] || STYLE_MAP.redpoint
        return (
          <div key={a.id || i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', background: C.surface, borderRadius: '12px', marginBottom: '6px', border: `1px solid ${C.border}` }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${styleInfo.color}18`, border: `1px solid ${styleInfo.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: styleInfo.color }}>{a.grade}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: a.route_name ? C.text : C.muted }}>
                  {a.route_name || 'Via senza nome'}
                </div>
                <div style={{ fontSize: '9px', fontWeight: '700', padding: '1px 6px', borderRadius: '999px', background: `${styleInfo.color}22`, color: styleInfo.color, flexShrink: 0 }}>{styleInfo.short}</div>
                {!a.completed && <div style={{ fontSize: '9px', color: C.hint }}>tentativo</div>}
              </div>
              <div style={{ fontSize: '10px', color: C.hint, marginTop: '2px' }}>
                {crag?.name && <span>{crag.name}</span>}
                {sess?.session_date && <span style={{ marginLeft: '6px' }}>· {fmtDateShort(sess.session_date)}</span>}
                {a.attempts > 1 && <span style={{ marginLeft: '6px' }}>· {a.attempts} tent.</span>}
              </div>
            </div>
            {a.rpe && (
              <div style={{ fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '999px', background: a.rpe <= 6 ? C.greenBg : a.rpe <= 8 ? C.amberBg : C.redBg, color: a.rpe <= 6 ? C.greenLight : a.rpe <= 8 ? C.amberLight : C.redLight, flexShrink: 0 }}>
                RPE {a.rpe}
              </div>
            )}
            {sess && (
              <div style={{ fontSize: '11px', color: C.violet, cursor: 'pointer', padding: '4px 8px', background: C.violetBg, border: `1px solid ${C.violetBorder}`, borderRadius: '8px', fontWeight: '600', flexShrink: 0 }}
                onClick={() => setEditSession(sess)}>✎</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── STATS ──────────────────────────────────────────────────────────
function StatsSection({ sessions, ascents, crags }) {
  const [period, setPeriod] = React.useState('tutto')

  const cutoff = period === '1m' ? new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
               : period === '3m' ? new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
               : null

  const filteredSessions = cutoff ? sessions.filter(s => s.session_date >= cutoff) : sessions
  const sessIds          = new Set(filteredSessions.map(s => s.id))
  const filteredAscents  = ascents.filter(a => sessIds.has(a.session_id))
  const firstAscents     = filteredAscents.filter(a => IS_FIRST_ASCENT.includes(a.style) && a.completed)

  const gradeProgression = (() => {
    const byMonth = {}
    firstAscents.forEach(a => {
      const sess = sessions.find(s => s.id === a.session_id)
      if (!sess) return
      const month = sess.session_date.slice(0, 7)
      const gradeIdx = GRADE_ORDER[a.grade] || 0
      if (!byMonth[month] || gradeIdx > byMonth[month]) byMonth[month] = gradeIdx
    })
    return Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).map(([month, idx]) => ({ month, grade: GRADES[idx] }))
  })()

  const ratedAscents = filteredAscents.filter(a => a.quality_stars && a.completed)
  const avgQuality   = ratedAscents.length ? (ratedAscents.reduce((s, a) => s + a.quality_stars, 0) / ratedAscents.length).toFixed(1) : null

  const topQualityRoutes = [...filteredAscents.filter(a => a.quality_stars >= 4 && a.completed)]
    .sort((a, b) => b.quality_stars - a.quality_stars)
    .slice(0, 5)

  const exposureCounts = {}
  filteredSessions.forEach(sess => {
    const crag = crags.find(c => c.id === sess.crag_id)
    if (crag?.exposure) exposureCounts[crag.exposure] = (exposureCounts[crag.exposure] || 0) + 1
  })
  const maxExposureCount = Math.max(...Object.values(exposureCounts), 1)

  const gradeCounts = {}
  firstAscents.forEach(a => { gradeCounts[a.grade] = (gradeCounts[a.grade] || 0) + 1 })
  const pyramidGrades = GRADES.filter(g => gradeCounts[g]).reverse()
  const maxCount = Math.max(...Object.values(gradeCounts), 1)

  const styleCounts = {}
  filteredAscents.filter(a => a.completed).forEach(a => { styleCounts[a.style] = (styleCounts[a.style] || 0) + 1 })

  const routeCounts = {}
  filteredAscents.forEach(a => { if (a.route_name) routeCounts[a.route_name] = (routeCounts[a.route_name] || 0) + 1 })
  const topRoutes = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const monthlyData = {}
  filteredSessions.forEach(sess => {
    const month = sess.session_date.slice(0, 7)
    if (!monthlyData[month]) monthlyData[month] = { month, total: 0 }
    filteredAscents.filter(a => a.session_id === sess.id && a.completed).forEach(() => { monthlyData[month].total++ })
  })
  const months = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
  const maxMonthlyTotal = Math.max(...months.map(m => m.total), 1)

  const cragCounts = {}
  filteredSessions.forEach(s => { cragCounts[s.crag_id] = (cragCounts[s.crag_id] || 0) + 1 })
  const topCrags = Object.entries(cragCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  if (sessions.length === 0) {
    return (
      <div style={{ ...ss.body, textAlign: 'center', paddingTop: '48px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
        <div style={{ fontSize: '14px', color: C.muted }}>Nessun dato ancora.</div>
      </div>
    )
  }

  return (
    <div style={ss.body}>
      <div style={{ display: 'flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '3px', marginBottom: '16px' }}>
        {[{ id: '1m', l: 'Ultimo mese' }, { id: '3m', l: '3 mesi' }, { id: 'tutto', l: 'Tutto' }].map(p => (
          <div key={p.id} style={ss.pill(period === p.id)} onClick={() => setPeriod(p.id)}>{p.l}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {[
          { l: 'Sessioni',     v: filteredSessions.length,                         c: C.violet },
          { l: 'Tiri totali',  v: filteredAscents.filter(a => a.completed).length, c: C.blue   },
          { l: 'Prime salite', v: firstAscents.length,                             c: C.green  },
        ].map(it => (
          <div key={it.l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: it.c }}>{it.v}</div>
            <div style={{ fontSize: '9px', color: C.hint, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: '3px' }}>{it.l}</div>
          </div>
        ))}
      </div>

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

      {Object.keys(styleCounts).length > 0 && (
        <div style={ss.card}>
          <div style={ss.secLbl}>Per stile</div>
          {CLIMB_STYLES.filter(s => styleCounts[s.id]).map(s => (
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

      {topCrags.length > 0 && (
        <div style={ss.card}>
          <div style={ss.secLbl}>Falesie piu' visitate</div>
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

      {gradeProgression.length >= 2 && (
        <div style={ss.card}>
          <div style={ss.secLbl}>Progressione grado massimo</div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '70px', marginBottom: '6px' }}>
            {gradeProgression.map((pt, i) => {
              const idx   = GRADE_ORDER[pt.grade] || 0
              const maxIdx = Math.max(...gradeProgression.map(p => GRADE_ORDER[p.grade] || 0))
              const minIdx = Math.min(...gradeProgression.map(p => GRADE_ORDER[p.grade] || 0))
              const range = maxIdx - minIdx || 1
              const h = 20 + ((idx - minIdx) / range) * 45
              return (
                <div key={pt.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                  <div style={{ fontSize: '8px', color: C.green, fontWeight: '700' }}>{pt.grade}</div>
                  <div style={{ width: '100%', background: C.green, borderRadius: '3px 3px 0 0', height: `${h}px`, opacity: 0.7 + (i / gradeProgression.length) * 0.3 }} />
                  <div style={{ fontSize: '7px', color: C.hint }}>{pt.month.slice(5)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {avgQuality && (
        <div style={ss.card}>
          <div style={ss.secLbl}>Qualita' vie</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: parseFloat(avgQuality) >= 4 ? C.green : C.amber }}>{avgQuality}</div>
              <div style={{ fontSize: '9px', color: C.hint, textTransform: 'uppercase', letterSpacing: '.06em' }}>media su {ratedAscents.length} vie</div>
            </div>
            <div style={{ display: 'flex', gap: '3px' }}>
              {[1,2,3,4,5].map(n => {
                const rounded = Math.round(parseFloat(avgQuality))
                const sc = rounded <= 2 ? C.hint : rounded === 3 ? C.amber : C.green
                return (
                  <div key={n} style={{ fontSize: '18px', color: n <= rounded ? sc : C.border }}>
                    {n <= rounded ? '★' : '☆'}
                  </div>
                )
              })}
            </div>
          </div>
          {topQualityRoutes.length > 0 && (
            <>
              <div style={{ fontSize: '9px', fontWeight: '600', color: C.hint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Vie top</div>
              {topQualityRoutes.map((a, i) => (
                <div key={a.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: '12px', color: C.textSoft }}>{a.route_name || 'Via senza nome'}</div>
                    <div style={{ fontSize: '10px', color: C.hint }}>{a.grade}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1,2,3,4,5].map(n => (
                      <span key={n} style={{ fontSize: '12px', color: n <= a.quality_stars ? (a.quality_stars <= 2 ? C.hint : a.quality_stars === 3 ? C.amber : C.green) : C.border }}>{n <= a.quality_stars ? '★' : '☆'}</span>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {Object.keys(exposureCounts).length > 0 && (
        <div style={ss.card}>
          <div style={ss.secLbl}>Esposizione falesie visitate</div>
          {Object.entries(exposureCounts).sort((a, b) => b[1] - a[1]).map(([exp, count]) => (
            <div key={exp} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: '28px', fontSize: '10px', fontWeight: '700', color: C.blueLight, textAlign: 'center', fontFamily: 'monospace', flexShrink: 0, padding: '2px 4px', background: C.blueBg, borderRadius: '4px', border: `1px solid ${C.blueBorder}` }}>{exp}</div>
              <div style={{ flex: 1, background: C.bg, borderRadius: '4px', height: '14px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: `linear-gradient(90deg, ${C.blue}, ${C.blueLight})`, width: `${(count / maxExposureCount) * 100}%`, borderRadius: '4px' }} />
              </div>
              <div style={{ fontSize: '10px', color: C.hint, flexShrink: 0, width: '20px', textAlign: 'right' }}>{count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PROJECTS TAB ───────────────────────────────────────────────────
function ProjectsTab({ projects, attempts, crags, onAdded, onRefresh }) {
  const [showForm,        setShowForm]        = React.useState(false)
  const [showAttempt,     setShowAttempt]     = React.useState(null)
  const [expandedProject, setExpandedProject] = React.useState(null)

  const active = projects.filter(p => p.status === 'active')
  const closed = projects.filter(p => p.status === 'closed')

  const ProjectCard = ({ project }) => {
    const projAttempts = attempts.filter(a => a.project_id === project.id).sort((a, b) => a.attempt_date.localeCompare(b.attempt_date))
    const crag         = crags.find(c => c.id === project.crag_id)
    const isExpanded   = expandedProject === project.id
    const isClosed     = project.status === 'closed'
    const closeDate    = isClosed ? projAttempts.find(a => a.completed)?.attempt_date : null

    return (
      <div style={{ ...ss.card, marginBottom: '8px', border: `1px solid ${isClosed ? C.greenBorder : C.amberBorder}`, background: isClosed ? C.greenBg : C.amberBg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
          onClick={() => setExpandedProject(isExpanded ? null : project.id)}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              {isClosed && <span>✓</span>}
              <div style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>{project.route_name}</div>
            </div>
            <div style={{ fontSize: '10px', color: isClosed ? C.green : C.amber, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

        {isExpanded && (
          <div style={{ marginTop: '12px', borderTop: `1px solid ${isClosed ? C.greenBorder : C.amberBorder}`, paddingTop: '12px' }}>
            {projAttempts.length > 0 ? (
              <>
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
              </>
            ) : (
              <div style={{ fontSize: '12px', color: C.hint, textAlign: 'center', padding: '8px' }}>Nessun tentativo ancora</div>
            )}
          </div>
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
        <div style={{ ...ss.savBtn, width: 'auto', padding: '8px 16px', background: C.amber, color: '#000', fontSize: '12px', marginTop: 0, cursor: 'pointer' }}
          onClick={() => setShowForm(true)}>+ Nuovo progetto</div>
      </div>

      {active.length === 0 && closed.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: '13px', color: C.hint }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
          Nessun progetto ancora.
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
export default function ScalateSection({ initialSub, onSubChange }) {
  const [sub,          setSub]          = React.useState(initialSub || 'falesie')
  const [climbMode,    setClimbMode]    = React.useState('falesia')
  const [crags,        setCrags]        = React.useState([])
  const [sessions,     setSessions]     = React.useState([])
  const [ascents,      setAscents]      = React.useState([])
  const [projects,     setProjects]     = React.useState([])
  const [attempts,     setAttempts]     = React.useState([])
  const [loading,      setLoading]      = React.useState(true)
  const [selectedCrag, setSelectedCrag] = React.useState(null)
  const [showCragForm, setShowCragForm] = React.useState(false)
  const [showSessForm, setShowSessForm] = React.useState(false)

  // Sync con App quando cambia dall'esterno
  React.useEffect(() => {
    if (initialSub && initialSub !== sub) setSub(initialSub)
  }, [initialSub])

  const changeSub = (s) => { setSub(s); onSubChange?.(s) }

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

  if (selectedCrag) {
    return (
      <>
        <CragDetail
          crag={selectedCrag}
          sessions={sessions}
          ascents={ascents}
          onBack={() => { setSelectedCrag(null); loadAll() }}
          onAddSession={() => setShowSessForm(true)}
          onDelete={async () => {
            await deleteCrag(selectedCrag.id)
            setSelectedCrag(null)
            loadAll()
          }}
          onCragUpdated={loadAll}
        />
        {showSessForm && (
          <SessionForm
            crags={crags.filter(c => c.id === selectedCrag.id)}
            onSaved={() => { setShowSessForm(false); loadAll() }}
            onClose={() => setShowSessForm(false)}
          />
        )}
      </>
    )
  }

  const renderFalesie = () => (
    <div style={ss.body}>
      {showCragForm && <CragForm onSaved={() => { setShowCragForm(false); loadAll() }} onClose={() => setShowCragForm(false)} />}
      {showSessForm && <SessionForm crags={crags} onSaved={() => { setShowSessForm(false); loadAll() }} onClose={() => setShowSessForm(false)} />}

      {crags.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <MapboxMap crags={crags} onCragClick={(crag) => setSelectedCrag(crag)} height="220px" />
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
          <div style={{ ...ss.savBtn, maxWidth: '200px', margin: '0 auto', background: C.green }} onClick={() => setShowCragForm(true)}>
            Aggiungi prima falesia
          </div>
        </div>
      ) : (
        crags.map(crag => {
          const cragSessions     = sessions.filter(s => s.crag_id === crag.id)
          const cragAscents      = ascents.filter(a => cragSessions.some(s => s.id === a.session_id))
          const firstAscentsHere = cragAscents.filter(a => IS_FIRST_ASCENT.includes(a.style) && a.completed)
          const maxGrade         = firstAscentsHere.length ? firstAscentsHere.reduce((m, a) => (GRADE_ORDER[a.grade] || 0) > (GRADE_ORDER[m] || 0) ? a.grade : m, firstAscentsHere[0].grade) : null

          return (
            <div key={crag.id} style={{ ...ss.card, cursor: 'pointer', marginBottom: '8px' }} onClick={() => setSelectedCrag(crag)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: C.text, marginBottom: '3px' }}>{crag.name}</div>
                  <div style={{ fontSize: '10px', color: C.muted, display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {crag.region && <span>{crag.region}</span>}
                    {crag.rock_type && <span style={{ color: C.hint }}>· {crag.rock_type}</span>}
                    {crag.grade_min && crag.grade_max && <span style={{ color: C.hint }}>· {crag.grade_min}–{crag.grade_max}</span>}
                    {crag.exposure && <span style={{ color: C.blueLight, fontWeight: '700', fontFamily: 'monospace', fontSize: '9px', padding: '1px 6px', background: C.blueBg, borderRadius: '999px', border: `1px solid ${C.blueBorder}` }}>{crag.exposure}</span>}
                  </div>
                  {(crag.styles || []).length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '5px', flexWrap: 'wrap' }}>
                      {(crag.styles || []).map(s => {
                        const cs = CRAG_STYLES.find(x => x.id === s)
                        return cs ? <div key={s} style={{ fontSize: '9px', padding: '1px 7px', borderRadius: '999px', background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}` }}>{cs.label}</div> : null
                      })}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '10px' }}>
                  {maxGrade && <div style={{ fontSize: '13px', fontWeight: '700', color: C.violetLight, background: C.violetBg, padding: '3px 8px', borderRadius: '6px', border: `1px solid ${C.violetBorder}` }}>{maxGrade}</div>}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>{cragSessions.length}</div>
                    <div style={{ fontSize: '8px', color: C.hint, textTransform: 'uppercase' }}>uscite</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  return (
    <div style={{ paddingBottom: '160px' }}>
      <div style={ss.hdr}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div style={ss.eyebrow}>arrampicata · performance</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '999px', padding: '3px 5px' }}>
            {['falesia', 'multi pitch'].map(m => {
              const active = climbMode === m
              return (
                <div key={m}
                  style={{ padding: '3px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', background: active ? C.primary : 'transparent', color: active ? '#0A0E12' : C.hint, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                  onClick={() => setClimbMode(m)}>
                  {m}
                </div>
              )
            })}
          </div>
        </div>
        <div style={ss.title}>Scalate</div>
        <div style={ss.subtitle}>
          {sessions.length} sessioni · {ascents.filter(a => IS_FIRST_ASCENT.includes(a.style) && a.completed).length} prime salite
        </div>
      </div>

      {climbMode === 'multi pitch' ? (
        <div style={{ ...ss.body, textAlign: 'center', paddingTop: '60px' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🏔️</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: C.text, marginBottom: '8px' }}>Multi pitch</div>
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: '1.6' }}>Sezione in sviluppo. Presto potrai tracciare le tue vie in montagna.</div>
        </div>
      ) : (
        <>
          <div style={ss.subBar}>
            {[
              { id: 'falesie',  l: 'Falesie' },
              { id: 'tiri',     l: 'Tiri' },
              { id: 'progetti', l: 'Progetti' },
              { id: 'stats',    l: 'Stats' },
            ].map(t => (
              <div key={t.id} style={ss.subTab(sub === t.id)} onClick={() => changeSub(t.id)}>{t.l}</div>
            ))}
          </div>
          {sub === 'falesie'  && renderFalesie()}
          {sub === 'tiri'     && <TiriTab ascents={ascents} sessions={sessions} crags={crags} onRefresh={loadAll} />}
          {sub === 'progetti' && <ProjectsTab projects={projects} attempts={attempts} crags={crags} onAdded={loadAll} onRefresh={loadAll} />}
          {sub === 'stats'    && <StatsSection sessions={sessions} ascents={ascents} crags={crags} />}
        </>
      )}
    </div>
  )
}
