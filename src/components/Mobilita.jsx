import React, { useEffect, useRef, useState } from 'react'
import { C, ss } from '../constants'

// Short YouTube: https://youtube.com/shorts/N-OQBYVtaSc
const MOBILITY_VIDEO_ID = 'N-OQBYVtaSc'
const HOLD_SEC          = 60
const TRANSITION_SEC    = 10
const TOTAL_POSITIONS   = 5

const POSITIONS = [
  { n: 1, name: 'Posizione 1' },
  { n: 2, name: 'Posizione 2' },
  { n: 3, name: 'Posizione 3' },
  { n: 4, name: 'Posizione 4' },
  { n: 5, name: 'Posizione 5' },
]

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

/** embedded: dentro card collassabile in tab Oggi (video Short grande verticale). */
export default function Mobilita({ embedded = false }) {
  const [running, setRunning]   = useState(false)
  const [phase, setPhase]       = useState('hold')
  const [secLeft, setSecLeft]   = useState(HOLD_SEC)
  const [position, setPosition] = useState(1)
  const intervalRef             = useRef(null)

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSecLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

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

  const totalSec = phase === 'transition' ? TRANSITION_SEC : HOLD_SEC
  const progress = totalSec > 0 ? Math.max(0, Math.min(1, (totalSec - secLeft) / totalSec)) : 0
  const phaseLabel = phase === 'hold'       ? 'Tieni la posizione'
                   : phase === 'transition' ? 'Cambia posizione'
                   : 'Completato'
  const phaseColor = phase === 'hold'       ? C.primary
                   : phase === 'transition' ? (C.orangeLight || '#fb923c')
                   : C.green

  // Short verticale: grande quando apri la card o nella tab dedicata
  const videoShell = {
    position: 'relative',
    width: '100%',
    margin: embedded ? '0 0 16px' : '0 auto 20px',
    maxWidth: '100%',
    borderRadius: '14px',
    overflow: 'hidden',
    background: '#0a0a0a',
    border: `1px solid ${C.border}`,
    aspectRatio: '9 / 16',
    maxHeight: 'min(78vh, 680px)',
  }

  const inner = (
    <>
      <div style={videoShell}>
        <iframe
          src={`https://www.youtube.com/embed/${MOBILITY_VIDEO_ID}?playsinline=1&rel=0`}
          title="Mobilità coach"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>

      {embedded && (
        <p style={{ fontSize: '12px', color: C.muted, lineHeight: 1.55, marginBottom: '14px' }}>
          5 posizioni · 1 min a posizione · 10 secondi cambio · ogni giorno
        </p>
      )}

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

        <div style={{ height: '6px', background: C.bg, borderRadius: '999px', overflow: 'hidden', marginBottom: '18px', border: `1px solid ${C.border}` }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: phaseColor, transition: 'width .3s linear' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {!running ? (
            <button
              type="button"
              onClick={start}
              style={{ flex: 1, padding: '14px 0', borderRadius: '12px', background: C.primary, color: '#160066', border: 0, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              {phase === 'done' ? 'Ricomincia' : 'Play'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRunning(false)}
              style={{ flex: 1, padding: '14px 0', borderRadius: '12px', background: C.primary, color: '#160066', border: 0, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              Pausa
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            style={{ flex: 1, padding: '14px 0', borderRadius: '12px', background: 'transparent', color: C.primary, border: `1px solid ${C.primaryBorder}`, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
            Reset
          </button>
        </div>
      </div>

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
              <div style={{ marginLeft: 'auto', fontSize: '11px', color: C.hint }}>1 min</div>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '11px', color: C.hint, textAlign: 'center', marginTop: '8px', lineHeight: '1.6' }}>
        5 posizioni × 1 min tenuta + 10 secondi cambio. Da fare ogni giorno.
      </p>
    </>
  )

  if (embedded) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>{inner}</div>
  }

  return (
    <div style={{ paddingBottom: '160px', maxWidth: '448px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={ss.hdr}>
        <div style={ss.eyebrow}>Daily routine</div>
        <div style={ss.title}>Mobilità</div>
        <div style={ss.subtitle}>5 posizioni · 1 min a posizione · 10 secondi cambio · ogni giorno</div>
      </div>

      <div style={ss.body}>
        {inner}
      </div>
    </div>
  )
}
