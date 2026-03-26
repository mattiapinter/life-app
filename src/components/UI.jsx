import React from 'react'
import { C, ss, extractYoutubeId, extractLoomId } from '../constants'
import { IcoClose, IcoPlay, IcoEdit } from './Icons'
import { saveExerciseVideo } from '../lib/supabase'

// ── MODAL OVERLAY ─────────────────────────────────────────────────
export function Modal({ onClose, title, subtitle, accentColor, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'flex-end' }} onClick={onClose}>
      <div style={{ width:'100%', maxWidth:'448px', margin:'0 auto', background:C.surface, borderRadius:'20px 20px 0 0', padding:'20px', paddingBottom:'40px', maxHeight:'85vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div>
            {subtitle && <div style={{ fontSize:'9px', fontWeight:'600', letterSpacing:'.08em', textTransform:'uppercase', color: accentColor || C.violet, marginBottom:'4px' }}>{subtitle}</div>}
            <div style={{ fontSize:'16px', fontWeight:'700', color:C.text }}>{title}</div>
          </div>
          <div style={{ cursor:'pointer', padding:'6px' }} onClick={onClose}><IcoClose /></div>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── VIDEO BUTTON ──────────────────────────────────────────────────
export function VideoButton({ exerciseName, videos, onVideosChange }) {
  const [showModal, setShowModal] = React.useState(false)
  const [showEmbed, setShowEmbed] = React.useState(false)
  const [editMode, setEditMode] = React.useState(false)
  const [urlInput, setUrlInput] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const existing = videos?.[exerciseName]
  const ytId = extractYoutubeId(existing)
  const loomId = extractLoomId(existing)

  const handleSave = async () => {
    if (!urlInput.trim()) return
    setSaving(true)
    const ok = await saveExerciseVideo(exerciseName, urlInput.trim())
    if (ok && onVideosChange) onVideosChange(exerciseName, urlInput.trim())
    setSaving(false)
    setEditMode(false)
    setUrlInput('')
  }

  const embedUrl = ytId
    ? `https://www.youtube.com/embed/${ytId}`
    : loomId
    ? `https://www.loom.com/embed/${loomId}`
    : null

  return (
    <>
      {existing ? (
        <div style={{ display:'flex', gap:'5px', flexShrink:0, whiteSpace:'nowrap' }}>
          <div
            style={{ display:'flex', alignItems:'center', gap:'4px', padding:'3px 8px', background:C.violetBg, border:`1px solid ${C.violetBorder}`, borderRadius:'6px', cursor:'pointer', fontSize:'10px', color:C.violetLight, fontWeight:'600', whiteSpace:'nowrap' }}
            onClick={() => setShowEmbed(true)}
          >
            <IcoPlay col={C.violet} /> Video
          </div>
          <div
            style={{ padding:'3px 6px', background:C.surface, border:`1px solid ${C.border}`, borderRadius:'6px', cursor:'pointer', flexShrink:0 }}
            onClick={() => { setEditMode(true); setShowModal(true) }}
          >
            <IcoEdit />
          </div>
        </div>
      ) : (
        <div
          style={{ display:'flex', alignItems:'center', gap:'4px', padding:'3px 8px', background:'transparent', border:`1px dashed ${C.hint}`, borderRadius:'6px', cursor:'pointer', fontSize:'10px', color:C.hint, whiteSpace:'nowrap', flexShrink:0 }}
          onClick={() => { setEditMode(true); setShowModal(true) }}
        >
          + video
        </div>
      )}

      {showModal && (
        <Modal title={exerciseName} subtitle="Aggiungi Video" onClose={() => { setShowModal(false); setEditMode(false) }}>
          <div style={{ fontSize:'11px', color:C.muted, marginBottom:'10px' }}>Incolla un URL YouTube o Loom</div>
          <input
            style={{ ...ss.inp, marginBottom:'10px' }}
            placeholder="https://youtube.com/watch?v=..."
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            autoFocus
          />
          <div style={{ ...ss.savBtn, opacity: saving ? 0.6 : 1 }} onClick={!saving ? handleSave : undefined}>
            {saving ? 'Salvataggio...' : 'Salva'}
          </div>
        </Modal>
      )}

      {showEmbed && embedUrl && (
        <Modal title={exerciseName} subtitle="Video" onClose={() => setShowEmbed(false)}>
          <div style={{ position:'relative', paddingBottom:'56.25%', height:0, borderRadius:'10px', overflow:'hidden' }}>
            <iframe
              src={embedUrl}
              style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </Modal>
      )}
    </>
  )
}

// ── COACH NOTE DRAWER ─────────────────────────────────────────────
export function CoachNoteModal({ sessionType, sessionLabel, accentColor, note, onClose }) {
  return (
    <Modal title={sessionLabel} subtitle="Note del Coach" accentColor={accentColor} onClose={onClose}>
      <div style={{ fontSize:'13px', color:C.textSoft, lineHeight:'1.75', background:C.bg, borderRadius:'12px', padding:'14px', border:`1px solid ${C.border}` }}>
        {note}
      </div>
    </Modal>
  )
}

// ── CHANGE SESSION DRAWER ─────────────────────────────────────────
import { SESSION_COLORS } from '../constants'
import { TRAINING_PLAN } from '../data/trainingPlan'
import { saveSessionNote } from '../lib/supabase'

export function ChangeSessionDrawer({ currentEntry, onClose, onChanged }) {
  const [selected, setSelected] = React.useState(null)
  const [note, setNote] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const allTypes = ['PALESTRA','PESI','CORSA','PLACCA_VERTICALE','STRAPIOMBO','DAY_PROJECT','REST']

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    await saveSessionNote({
      note_date: currentEntry.day_date,
      session_type: selected,
      original_session: currentEntry.session_type,
      note_text: note,
      created_at: new Date().toISOString(),
    })
    setSaving(false)
    onChanged(selected, note)
    onClose()
  }

  return (
    <Modal title="Cambia allenamento" subtitle="Imprevisto?" accentColor={C.red} onClose={onClose}>
      <div style={{ fontSize:'11px', color:C.muted, marginBottom:'14px' }}>
        Pianificato: <span style={{ color:C.text, fontWeight:'600' }}>{SESSION_COLORS[currentEntry.session_type]?.label}</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'16px' }}>
        {allTypes.map(type => {
          const sc = SESSION_COLORS[type]
          const isSelected = selected === type
          return (
            <div key={type}
              style={{ padding:'11px 14px', borderRadius:'10px', cursor:'pointer', border:`1px solid ${isSelected ? sc.border : C.border}`, background: isSelected ? sc.bg : C.bg, display:'flex', alignItems:'center', justifyContent:'space-between' }}
              onClick={() => setSelected(type)}
            >
              <span style={{ fontSize:'13px', fontWeight:'600', color: isSelected ? sc.text : C.textSoft }}>{sc.label}</span>
              {isSelected && <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: sc.text }} />}
            </div>
          )
        })}
      </div>
      <textarea
        style={{ ...ss.inp, resize:'vertical', lineHeight:'1.6', marginBottom:'12px' }}
        rows={3}
        placeholder="Note (opzionale) — es. ero stanco, impegno improvviso..."
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <div style={{ ...ss.savBtn, opacity: (!selected || saving) ? 0.5 : 1 }} onClick={selected && !saving ? handleSave : undefined}>
        {saving ? 'Salvataggio...' : 'Conferma cambio'}
      </div>
    </Modal>
  )
}
