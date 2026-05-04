import React, { useEffect, useRef, useState } from 'react'
import { C, ss } from '../constants'

// Sostituisci con l'ID YouTube reale dopo l'upload del video
const MOBILITY_VIDEO_ID = 'YOUR_YOUTUBE_VIDEO_ID'
const HOLD_SEC          = 60
const TRANSITION_SEC    = 10
const TOTAL_POSITIONS   = 5

// ── Routine descrittiva (5 posizioni) ────────────────────────────
const POSITIONS = [
  { n: 1, name: "Posizione 1" },
  { n: 2, name: "Posizione 2" },
  { n: 3, name: "Posizione 3" },
  { n: 4, name: "Posizione 4" },
  { n: 5, name: "Posizione 5" },
]

export default function Mobilita() {
  const [running, setRunning]   = useState(false)
  const [phase, setPhase]       = useState('hold')   // 'hold' | 'transition' | 'done'
  const [secLeft, setSecLeft]   = useState(HOLD_SEC)
  const [position, setPosition] = useState(1)
  const intervalRef             = useRef(null)

  // Audio beep su transizioni e fine — riusa AudioContext semplice
  const playBeep = (freq = 880, dur = 0.25) => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + dur)
    } catch {}
  }

  // Tick: SOLO decrementa secLeft. Le transizioni di fase sono in un effect separato
  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSecLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

  // Transizioni di fase: quando secLeft tocca 0, passiamo allo stato successivo
  useEffect(() => {
    if (!running) return
    if (secLeft > 0) return

    if (phase === 'hold') {
      if (position >= TOTAL_POSITIONS) {
        playBeep(660, 0.6)
        setPhase('done')
        setRunning(false)
        return
      }
      playBeep(880, 0.2)
      setPhase('transition')
      setSecLeft(TRANSITION_SEC)
      return
    }

    if (phase === 'transition') {
      playBeep(1320, 0.25)
      setPosition(p => p + 1)
      setPhase('hold')
      setSecLeft(HOLD_SEC)
      return
    }
  }, [secLeft, running, phase, position])

  const start = () => {
    if (phase === 'done') reset()
    setRunning(true)
  }

  const reset = () => {
    setRunning(false)
    setPhase('hold')
    setSecLeft(HOLD_SEC)
    setPosition(1)
  }

  const isPlaceholder = MOBILITY_VIDEO_ID === 'YOUR_YOUTUBE_VIDEO_ID'
  const totalSec = phase === 'transition' ? TRANSITION_SEC : HOLD_SEC
  const progress = totalSec > 0 ? Math.max(0, Math.min(1, (totalSec - secLeft) / totalSec)) : 0
  const phaseLabel = phase === 'hold'       ? 'Tieni la posizione'
                   : phase === 'transition' ? 'Cambia posizione'
                   : 'Completato'
  const phaseColor = phase === 'hold'       ? C.primary
                   : phase === 'transition' ? (C.orangeLight || '#fb923c')
                   : C.green

  return (
    <div style={{ paddingBottom: '160px', maxWidth: '448px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={ss.hdr}>
        <div style={ss.eyebrow}>Daily routine</div>
        <div style={ss.title}>Mobilità</div>
        <div style={ss.subtitle}>5 posizioni · 1' a posizione · 10" cambio · da fare ogni giorno</div>
      </div>

      <div style={ss.body}>
        {/* Video YouTube (o placeholder finché non si carica il video) */}
        <div style={{ position: 'relative', paddingBottom: '56.25%', marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', background: C.surface, border: `1px solid ${C.border}` }}>
          {isPlaceholder ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', padding: '20px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: C.hint }}>movie</span>
              <span style={{ fontSize: '12px', color: C.hint, lineHeight: '1.5' }}>
                Carica il video su YouTube e sostituisci<br/>
                <code style={{ fontSize: '11px' }}>MOBILITY_VIDEO_ID</code> in <code style={{ fontSize: '11px' }}>Mobilita.jsx</code>
              </span>
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

        {/* Card timer */}
        <div style={{ ...ss.card, textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: C.hint, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>
            Posizione {position}/{TOTAL_POSITIONS}
          </div>
          <div style={{ fontSize: '56px', fontWeight: '800', color: phaseColor, letterSpacing: '-0.02em', marginBottom: '4px', fontVariantNumeric: 'tabular-nums' }}>
            {secLeft}s
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '14px' }}>
            {phaseLabel}
          </div>

          {/* Progress bar */}
          <div style={{ height: '6px', background: C.bg, borderRadius: '999px', overflow: 'hidden', marginBottom: '18px', border: `1px solid ${C.border}` }}>
            <div style={{ height: '100%', width: `${progress * 100}%`, background: phaseColor, transition: 'width .3s linear' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {!running ? (
              <button
                onClick={start}
                style={{ flex: 1, padding: '14px 0', borderRadius: '12px', background: C.primary, color: '#160066', border: 0, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                {phase === 'done' ? 'Ricomincia' : 'Play'}
              </button>
            ) : (
              <button
                onClick={() => setRunning(false)}
                style={{ flex: 1, padding: '14px 0', borderRadius: '12px', background: C.primary, color: '#160066', border: 0, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                Pausa
              </button>
            )}
            <button
              onClick={reset}
              style={{ flex: 1, padding: '14px 0', borderRadius: '12px', background: 'transparent', color: C.primary, border: `1px solid ${C.primaryBorder}`, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              Reset
            </button>
          </div>
        </div>

        {/* Lista posizioni */}
        <div style={ss.card}>
          <div style={ss.secLbl}>Sequenza</div>
          {POSITIONS.map((p) => {
            const isCurrent = p.n === position && phase !== 'done'
            const isDone    = p.n < position || (p.n === position && phase === 'done')
            return (
              <div
                key={p.n}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 0',
                  borderBottom: `1px solid ${C.border}`,
                  opacity: isDone ? 0.55 : 1,
                }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: isCurrent ? C.primary : (isDone ? C.green : C.bg),
                  border: `1px solid ${isCurrent ? C.primaryBorder : (isDone ? C.greenBorder : C.border)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700,
                  color: isCurrent ? '#160066' : (isDone ? '#fff' : C.hint),
                  flexShrink: 0,
                }}>
                  {isDone ? '✓' : p.n}
                </div>
                <div style={{ fontSize: '13px', color: C.text, fontWeight: isCurrent ? 700 : 500 }}>
                  {p.name}
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '11px', color: C.hint }}>1'</div>
              </div>
            )
          })}
        </div>

        <p style={{ fontSize: '11px', color: C.hint, textAlign: 'center', marginTop: '16px', lineHeight: '1.6' }}>
          5 posizioni × 1' tenuta + 10" cambio = ~5'40" totali. Da fare ogni giorno.
        </p>
      </div>
    </div>
  )
}
