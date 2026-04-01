import React from 'react'
import { C, ss } from '../constants'
import { db } from '../lib/supabase'

export default function LoginScreen({ onLogin }) {
  const [mode,     setMode]     = React.useState('login') // 'login' | 'signup'
  const [email,    setEmail]    = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error,    setError]    = React.useState('')
  const [loading,  setLoading]  = React.useState(false)

  const handle = async () => {
    if (!email.trim() || !password.trim()) { setError('Inserisci email e password'); return }
    setLoading(true); setError('')
    try {
      if (mode === 'login') {
        const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else {
        const { error } = await db.auth.signUp({ email: email.trim(), password })
        if (error) throw error
      }
      onLogin()
    } catch(e) {
      setError(e.message || 'Errore — riprova')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <div style={{ width:'100%', maxWidth:'360px' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ fontSize:'11px', fontWeight:'700', color:C.violet, textTransform:'uppercase', letterSpacing:'.15em', marginBottom:'8px' }}>LIFE</div>
          <div style={{ fontSize:'28px', fontWeight:'700', color:C.text, letterSpacing:'-.02em' }}>
            Ciao, Pinter 👋
          </div>
          <div style={{ fontSize:'13px', color:C.muted, marginTop:'6px' }}>
            {mode === 'login' ? 'Accedi al tuo spazio' : 'Crea il tuo account'}
          </div>
        </div>

        {/* Form */}
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <input
            type="email"
            style={{ ...ss.inp, fontSize:'15px', padding:'14px' }}
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            type="password"
            style={{ ...ss.inp, fontSize:'15px', padding:'14px' }}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onKeyDown={e => e.key === 'Enter' && handle()}
          />

          {error && (
            <div style={{ fontSize:'12px', color:C.red, background:C.redBg, border:`1px solid ${C.redBorder}`, borderRadius:'8px', padding:'10px 12px' }}>
              {error}
            </div>
          )}

          <div
            style={{ ...ss.savBtn, marginTop:'4px', opacity: loading ? 0.6 : 1, fontSize:'15px', padding:'16px' }}
            onClick={!loading ? handle : undefined}>
            {loading ? '...' : mode === 'login' ? 'Entra' : 'Crea account'}
          </div>
        </div>

        {/* Switch mode */}
        <div style={{ textAlign:'center', marginTop:'24px' }}>
          <span style={{ fontSize:'12px', color:C.hint }}>
            {mode === 'login' ? 'Prima volta? ' : 'Hai già un account? '}
          </span>
          <span
            style={{ fontSize:'12px', color:C.violetLight, cursor:'pointer', fontWeight:'600' }}
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
            {mode === 'login' ? 'Crea account' : 'Accedi'}
          </span>
        </div>

      </div>
    </div>
  )
}
