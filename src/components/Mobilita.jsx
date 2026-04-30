import React, { useEffect, useRef, useState } from 'react'
import { C, ss } from '../constants'

const MOBILITY_VIDEO_ID  = 'YOUR_YOUTUBE_VIDEO_ID' // sostituisci dopo upload su YouTube
const HOLD_SEC           = 60
const TRANSITION_SEC     = 10
const TOTAL_POSITIONS    = 5

export default function Mobilita() {
  const [running, setRunning]   = useState(false)
  const [phase, setPhase]       = useState('hold')  // 'hold' | 'transition' | 'done'
  const [secLeft, setSecLeft]   = useState(HOLD_SEC)
  const [position, setPosition] = useState(1)
  const tickRef                 = useRef(null)

  useEffect(() => {
    if (!running) return
    tickRef.current = setInterval(() => {
      setSecLeft(prev => {
        if (prev > 1) return prev - 1
        if (phase === 'hold') {
          if (position >= TOTAL_POSITIONS) {
            setPhase('done')
            setRunning(false)
            return 0
          }
          setPhase('transition')
          return TRANSITION_SEC
        }
        if (phase === 'transition') {
          setPosition(p => p + 1)
          setPhase('hold')
          return HOLD_SEC
        }
        return 0
      })
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [running, phase, position])

  const reset = () => {
    setRunning(false)
    setPhase('hold')
    setSecLeft(HOLD_SEC)
    setPosition(1)
  }

  const isPlaceholder = MOBILITY_VIDEO_ID === 'YOUR_YOUTUBE_VIDEO_ID'

  return (
    <div style={{ paddingBottom: '160px', maxWidth: '448px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={ss.hdr}>
        <div style={ss.eyebrow}>Daily routine</div>
        <div style={ss.title}>Mobilità</div>
        <div style={ss.subtitle}>5 posizioni · 1' a posizione · da fare ogni giorno</div>
      </div>

      <div style={ss.body}>
        <div style={{ position: 'relative', paddingBottom: '56.25%', marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', background: C.surface, border: `1px solid ${C.border}` }}>
          {isPlaceholder ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', padding: '20px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: C.hint }}>movie</span>
              <span style={{ fontSize: '12px', color: C.hint }}>Carica il video su YouTube e sostituisci MOBILITY_VIDEO_ID in Mobilita.jsx</span>
            </div>
          ) : (
            <iframe
              src={`https://www.youtube.com/embed/${MOBILITY_VIDEO_ID}`}
              title="Mobilità coach"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
            />
          )}
        </div>

        <div style={{ ...ss.card, textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: C.hint, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>
            Posizione {position}/{TOTAL_POSITIONS}
          </div>
          <div style={{ fontSize: '56px', fontWeight: '800', color: phase === 'hold' ? C.primary : (phase === 'done' ? C.green : C.orangeLight), letterSpacing: '-0.02em', marginBottom: '4px' }}>
            {secLeft}s
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '20px' }}>
            {phase === 'hold' ? 'Tieni la posizione' : phase === 'transition' ? 'Cambia posizione' : 'Completato'}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => setRunning(r => !r)} disabled={phase === 'done'}
                    style={{ flex: 1, padding: '14px 0', borderRadius: '12px', background: phase === 'done' ? C.border : C.primary, color: phase === 'done' ? C.hint : '#160066', border: 0, fontWeight: 700, fontSize: '14px', cursor: phase === 'done' ? 'not-allowed' : 'pointer' }}>
              {running ? 'Pausa' : 'Play'}
            </button>
            <button onClick={reset}
                    style={{ flex: 1, padding: '14px 0', borderRadius: '12px', background: 'transparent', color: C.primary, border: `1px solid ${C.primaryBorder}`, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              Reset
            </button>
          </div>
        </div>

        <p style={{ fontSize: '11px', color: C.hint, textAlign: 'center', marginTop: '16px', lineHeight: '1.6' }}>
          5 posizioni, 1' a posizione, 10" per cambiare. Da fare ogni giorno.
        </p>
      </div>
    </div>
  )
}
