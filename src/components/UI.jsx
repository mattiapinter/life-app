import React from 'react'
import { C, ss, extractYoutubeId, extractLoomId } from '../constants'
import { IcoClose, IcoPlay, IcoEdit } from './Icons'
import { saveExerciseVideo } from '../lib/supabase'

// ── MODAL OVERLAY ─────────────────────────────────────────────────
export function Modal({ onClose, title, subtitle, accentColor, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end' }} onClick={onClose}>
      <div style={{
        width:'100%',
        maxWidth:'448px',
        margin:'0 auto',
        background:C.surface,
        borderRadius:'24px 24px 0 0',
        maxHeight:'min(88dvh, 720px)',
        display:'flex',
        flexDirection:'column',
        overflow:'hidden',
        boxShadow:'0 -4px 24px rgba(0, 0, 0, 0.3)',
        border:`1px solid ${C.border}`,
        borderBottom:'none',
        boxSizing:'border-box',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ flexShrink:0, padding:'24px', paddingBottom:'16px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px' }}>
            <div style={{ minWidth:0, flex:1 }}>
              {subtitle && <div style={{ fontSize:'10px', fontWeight:'700', letterSpacing:'.1em', textTransform:'uppercase', color: accentColor || C.primary, marginBottom:'6px' }}>{subtitle}</div>}
              <div style={{ fontSize:'18px', fontWeight:'700', color:C.text, wordBreak:'break-word' }}>{title}</div>
            </div>
            <div style={{
              cursor:'pointer',
              flexShrink:0,
              padding:'8px',
              borderRadius:'10px',
              background:C.bg,
              border:`1px solid ${C.border}`,
              transition:'transform 0.2s',
            }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onClick={onClose}>
              <IcoClose />
            </div>
          </div>
        </div>
        <div style={{
          flex:1,
          minHeight:0,
          overflowY:'auto',
          WebkitOverflowScrolling:'touch',
          overscrollBehavior:'contain',
          padding:'12px 24px',
          paddingBottom:'calc(env(safe-area-inset-bottom, 20px) + 28px)',
          boxSizing:'border-box',
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── VIDEO BUTTON ──────────────────────────────────────────────────
export function VideoButton({ exerciseName, videos, onVideosChange }) {
  const [showModal,  setShowModal]  = React.useState(false)
  const [showEmbed,  setShowEmbed]  = React.useState(false)
  const [urlInput,   setUrlInput]   = React.useState('')
  const [saving,     setSaving]     = React.useState(false)

  const existing = videos?.[exerciseName]
  const ytId     = extractYoutubeId(existing)
  const loomId   = extractLoomId(existing)
  const embedUrl = ytId
    ? `https://www.youtube.com/embed/${ytId}?playsinline=1&rel=0`
    : loomId
    ? `https://www.loom.com/embed/${loomId}`
    : null

  // true quando l'app è installata come PWA sulla home (Safari standalone)
  const isPWA = typeof window !== 'undefined' && window.navigator.standalone === true

  const handleSave = async () => {
    if (!urlInput.trim()) return
    setSaving(true)
    const ok = await saveExerciseVideo(exerciseName, urlInput.trim())
    if (ok && onVideosChange) onVideosChange(exerciseName, urlInput.trim())
    setSaving(false)
    setShowModal(false)
    setUrlInput('')
  }

  const handlePlay = () => {
    if (isPWA) {
      // In PWA: apri YouTube/Loom nell'app nativa o Safari
      if (ytId) {
        // Prova prima lo schema youtube:// (apre app nativa), fallback su https
        const nativeUrl = `youtube://watch?v=${ytId}`
        const webUrl    = `https://www.youtube.com/watch?v=${ytId}`
        window.location.href = nativeUrl
        // Fallback a Safari dopo 500ms se l'app non si apre
        setTimeout(() => { window.open(webUrl, '_blank') }, 500)
      } else if (loomId) {
        window.open(`https://www.loom.com/share/${loomId}`, '_blank')
      } else if (existing) {
        window.open(existing, '_blank')
      }
    } else {
      // In browser: embed dentro l'app
      setShowEmbed(true)
    }
  }

  return (
    <>
      {existing ? (
        <div style={{ display:'flex', gap:'6px', flexShrink:0, whiteSpace:'nowrap' }}>
          <div
            style={{
              display:'flex',
              alignItems:'center',
              gap:'5px',
              padding:'6px 12px',
              background:C.primaryBgSolid,
              border:`1px solid ${C.primaryBorder}`,
              borderRadius:'10px',
              cursor:'pointer',
              fontSize:'11px',
              color:C.primaryLight,
              fontWeight:'700',
              whiteSpace:'nowrap',
              transition:'all 0.2s',
              boxShadow:`0 2px 8px ${C.primaryGlow}`,
            }}
            onClick={handlePlay}
          >
            <IcoPlay col={C.primary} /> Video
          </div>
          <div
            style={{
              padding:'6px 8px',
              background:C.surface,
              border:`1px solid ${C.border}`,
              borderRadius:'10px',
              cursor:'pointer',
              flexShrink:0,
              transition:'transform 0.2s',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onClick={() => setShowModal(true)}
          >
            <IcoEdit />
          </div>
        </div>
      ) : (
        <div
          style={{
            display:'flex',
            alignItems:'center',
            gap:'5px',
            padding:'6px 12px',
            background:'transparent',
            border:`1.5px dashed ${C.hint}`,
            borderRadius:'10px',
            cursor:'pointer',
            fontSize:'11px',
            color:C.hint,
            whiteSpace:'nowrap',
            flexShrink:0,
            transition:'all 0.2s',
            fontWeight:'600',
          }}
          onClick={() => setShowModal(true)}
        >
          + video
        </div>
      )}

      {/* Embed a schermo intero — solo in browser, non in PWA */}
      {showEmbed && embedUrl && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.95)', display:'flex', flexDirection:'column' }}
          onClick={() => setShowEmbed(false)}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', flexShrink:0 }}>
            <div style={{ fontSize:'13px', fontWeight:'600', color:C.text }}>{exerciseName}</div>
            <div style={{ fontSize:'24px', color:C.muted, cursor:'pointer', padding:'4px 8px' }} onClick={() => setShowEmbed(false)}>✕</div>
          </div>
          <div style={{ flex:1, display:'flex', alignItems:'center', padding:'0 16px 40px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width:'100%', position:'relative', paddingBottom:'56.25%', height:0 }}>
              <iframe
                src={embedUrl}
                style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none', borderRadius:'12px' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal per inserire/modificare URL */}
      {showModal && (
        <Modal title={exerciseName} subtitle="Video esercizio" onClose={() => { setShowModal(false); setUrlInput('') }}>
          <div style={{ fontSize:'11px', color:C.muted, marginBottom:'10px' }}>
            Incolla un URL YouTube o Loom
          </div>
          {existing && (
            <div style={{ fontSize:'11px', color:C.hint, marginBottom:'10px', padding:'8px', background:C.bg, borderRadius:'8px', border:`1px solid ${C.border}`, wordBreak:'break-all' }}>
              Attuale: {existing}
            </div>
          )}
          <input
            style={{ ...ss.inp, marginBottom:'10px', fontSize:'14px' }}
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
