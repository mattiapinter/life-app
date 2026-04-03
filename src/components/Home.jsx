import React from 'react'
import { C, ss, DAYS, MEALS_CATS, todayIdx, fmtDate, fmtDateShort, fmtDayName } from '../constants'
import { SESSION_COLORS } from '../constants'
import { TRAINING_PLAN, getTodayCalEntry } from '../data/trainingPlan'
import { saveHrvLog } from '../lib/supabase'

// ── HRV WIDGET ─────────────────────────────────────────────────────
function HrvWidget({ hrvLogs, onHrvSaved }) {
  const [inputVal, setInputVal] = React.useState('')
  const [saving,   setSaving]   = React.useState(false)
  const [saved,    setSaved]    = React.useState(false)
  const today = new Date().toISOString().split('T')[0]

  const sorted    = [...hrvLogs].sort((a, b) => a.log_date.localeCompare(b.log_date))
  const last7     = sorted.slice(-7)
  const avg7      = last7.length ? Math.round(last7.reduce((s, r) => s + r.hrv_value, 0) / last7.length) : null
  const todayLog  = sorted.find(r => r.log_date === today)
  const todayHrv  = todayLog?.hrv_value || null
  const alreadyLogged = !!todayLog

  // Semaforo basato su % della media 7gg
  const getStatus = (hrv, avg) => {
    if (!hrv || !avg) return null
    const pct = hrv / avg
    if (pct >= 0.97) return 'green'
    if (pct >= 0.88) return 'yellow'
    return 'red'
  }

  const status = getStatus(todayHrv, avg7)

  const coachText = {
    green: [
      "Sistema nervoso in forma smagliante! Oggi puoi spingere forte 💪",
      "HRV da campione. Il corpo ha voglia di soffrire — dagliene!",
      "Recupero ottimale. È il momento di mettere km nelle gambe.",
    ],
    yellow: [
      "Corpo un po' affaticato. Allenati, ma senza strafare 🎯",
      "Giallo — non rosso. Fai la sessione, ma ascolta il corpo.",
      "HRV nella media. Buon allenamento, niente eroismo oggi.",
    ],
    red: [
      "Il corpo urla riposo 🔴 Recupero attivo o rest day, senza se e ma.",
      "Sistema nervoso stanco. Una passeggiata sì, le trazioni no.",
      "HRV basso. Mangia bene, dormi tanto, dimentica la scheda per oggi.",
    ],
  }

  const getCoachMsg = (s) => {
    if (!s) return null
    const msgs = coachText[s]
    // deterministico per giorno
    const dayNum = new Date(today).getDate()
    return msgs[dayNum % msgs.length]
  }

  const statusColor = { green: C.green, yellow: C.amber, red: C.red }
  const statusBg    = { green: C.greenBg, yellow: C.amberBg, red: C.redBg }
  const statusBorder = { green: C.greenBorder, yellow: C.amberBorder, red: C.redBorder }
  const statusLight  = { green: C.greenLight, yellow: C.amberLight, red: C.redLight }

  const handleSave = async () => {
    const v = parseInt(inputVal)
    if (!v || v < 10 || v > 300) return
    setSaving(true)
    await saveHrvLog({ log_date: today, hrv_value: v })
    await onHrvSaved()
    setSaving(false)
    setSaved(true)
    setInputVal('')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ ...ss.card, background: C.primaryBgSolid, border: `1px solid ${C.primaryBorder}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>HRV mattutino</div>
        {avg7 && <div style={{ fontSize: '11px', color: C.primaryLight }}>media 7gg: <span style={{ color: C.primary, fontWeight: '700' }}>{avg7}</span></div>}
      </div>

      {/* Semaforo + coach */}
      {todayHrv && status && (
        <div style={{
          background: statusBg[status],
          border: `1.5px solid ${statusBorder[status]}`,
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '14px',
          boxShadow: `0 4px 12px ${statusColor[status]}33`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: statusColor[status],
              flexShrink: 0,
              boxShadow: `0 0 12px ${statusColor[status]}`,
              animation: 'pulse 2s infinite',
            }} />
            <div style={{ fontSize: '24px', fontWeight: '800', color: statusLight[status] }}>{todayHrv} ms</div>
            <div style={{
              fontSize: '10px',
              color: statusColor[status],
              fontWeight: '700',
              marginLeft: 'auto',
              background: statusColor[status] + '22',
              padding: '4px 8px',
              borderRadius: '6px',
              letterSpacing: '.05em',
            }}>
              {status === 'green' ? 'OTTIMO' : status === 'yellow' ? 'MODERATO' : 'RIPOSA'}
            </div>
          </div>
          <div style={{ fontSize: '13px', color: statusLight[status], lineHeight: '1.6', opacity: 0.95, fontWeight: '500' }}>
            {getCoachMsg(status)}
          </div>
        </div>
      )}

      {/* Input */}
      {!alreadyLogged ? (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="number" inputMode="numeric"
            style={{ ...ss.inp, flex: 1, fontSize: '20px', fontWeight: '700', textAlign: 'center', border: `1.5px solid ${C.primaryBorder}` }}
            placeholder="HRV (ms)"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
          />
          <div
            style={{
              padding: '12px 18px',
              background: saved ? C.greenBg : C.primary,
              border: `1px solid ${saved ? C.greenBorder : C.primary}`,
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '700',
              color: saved ? C.greenLight : '#0A0E12',
              whiteSpace: 'nowrap',
              opacity: saving ? 0.6 : 1,
              flexShrink: 0,
              transition: 'all 0.2s',
              boxShadow: saved ? `0 4px 12px ${C.green}44` : `0 4px 12px ${C.primaryGlow}`,
            }}
            onClick={!saving ? handleSave : undefined}>
            {saving ? '...' : saved ? '✓' : 'Salva'}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: C.primary, textAlign: 'center', fontWeight: '600' }}>✓ Già registrato oggi</div>
      )}

      {/* Mini sparkline testuale ultimi giorni */}
      {last7.length > 1 && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '10px', alignItems: 'flex-end', height: '28px' }}>
          {last7.map((r, i) => {
            const maxV = Math.max(...last7.map(x => x.hrv_value))
            const minV = Math.min(...last7.map(x => x.hrv_value))
            const range = maxV - minV || 1
            const h = Math.max(8, Math.round(((r.hrv_value - minV) / range) * 24))
            const s = getStatus(r.hrv_value, avg7)
            const isToday = r.log_date === today
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{ width: '100%', height: `${h}px`, borderRadius: '3px 3px 0 0', background: s ? statusColor[s] : C.muted, opacity: isToday ? 1 : 0.5 }} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── HOME SECTION ───────────────────────────────────────────────────
export default function HomeSection({ weeklyPlan, fitSessions, setTab, setSub, sessionNotes, hrvLogs, onHrvSaved }) {
  const dayName  = DAYS[todayIdx()]
  const dayData  = weeklyPlan[dayName] || { isSkiDay: false, meals: {} }
  const meals    = dayData.meals || {}
  const mealNames = Object.keys(MEALS_CATS)
  const filled   = mealNames.filter(m => Object.values(meals[m] || {}).some(v => v))
  const pct      = Math.round((filled.length / mealNames.length) * 100)
  const todayEntry = getTodayCalEntry()
  const today    = new Date().toISOString().split('T')[0]

  const todayChange = sessionNotes?.find(n =>
    n.note_date === today && n.original_session && n.original_session !== n.session_type
  )
  const todayDisplayType = todayChange?.session_type || todayEntry?.session_type

  const weekStrip = TRAINING_PLAN.calendar
    .filter(e => e.day_date >= today)
    .slice(0, 7)

  return (
    <div>
      <div style={ss.hdr}>
        <div style={ss.eyebrow}>{fmtDate()}</div>
        <div style={ss.title}>Ciao Mattia 👋</div>
        <div style={ss.subtitle}>riepilogo di oggi</div>
      </div>

      <div style={{ ...ss.body, paddingTop: '20px' }}>

        {/* ── HRV WIDGET ── */}
        <HrvWidget hrvLogs={hrvLogs || []} onHrvSaved={onHrvSaved} />
        <div style={{ textAlign: 'right', marginTop: '-6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', color: C.hint, cursor: 'pointer' }}
            onClick={() => { setTab('dieta'); setSub?.('misure') }}>
            storico HRV e misure →
          </span>
        </div>

        {/* ── ALLENAMENTO OGGI ── */}
        {todayEntry && todayDisplayType !== 'REST' && (() => {
          const sc     = SESSION_COLORS[todayDisplayType] || SESSION_COLORS.REST
          const scOrig = SESSION_COLORS[todayEntry.session_type] || SESSION_COLORS.REST
          const isChanged = !!todayChange
          return (
            <div style={{
              background: sc.bg,
              border: `1.5px solid ${isChanged ? C.amberBorder : sc.border}`,
              borderRadius: '20px',
              padding: '20px',
              marginBottom: '14px',
              cursor: 'pointer',
              boxShadow: `0 4px 16px ${sc.text}22`,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onClick={() => setTab('allenamento')}>
              <div style={{
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: sc.text,
                marginBottom: '8px',
                display:'flex',
                alignItems:'center',
                gap:'8px'
              }}>
                Allenamento di oggi · Settimana {todayEntry.week}{todayEntry.scarico ? ' · Scarico' : ''}
                {isChanged && <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:C.amber, display:'inline-block', boxShadow:`0 0 8px ${C.amber}` }} />}
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: C.text, letterSpacing:'-.02em' }}>{sc.label}</div>
              {isChanged && (
                <div style={{ fontSize: '11px', color: C.amber, marginTop: '4px', opacity: 0.85, fontWeight:'600' }}>
                  modificato · pianificato: {scOrig.label}
                </div>
              )}
              {!isChanged && todayEntry.also && (
                <div style={{ fontSize: '12px', color: sc.text, opacity: 0.85, marginTop: '4px', fontWeight:'600' }}>
                  + {SESSION_COLORS[todayEntry.also]?.label}
                </div>
              )}
              <div style={{
                marginTop: '14px',
                fontSize: '11px',
                fontWeight: '700',
                color: sc.text,
                display:'flex',
                alignItems:'center',
                gap:'4px'
              }}>Apri sessione →</div>
            </div>
          )
        })()}

        {todayEntry && todayDisplayType === 'REST' && (
          <div style={{ background: '#161616', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', marginBottom: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.08em', color: C.hint, marginBottom: '6px' }}>Oggi</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: C.muted }}>Giorno di riposo 🛋️</div>
          </div>
        )}

        {/* ── PASTI OGGI ── */}
        <div style={ss.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
            <div style={{ fontSize:'14px', fontWeight:'700', color:C.text }}>Pasti di oggi</div>
            <div style={{
              fontSize:'12px',
              color:C.primary,
              cursor:'pointer',
              fontWeight:'700',
              transition:'transform 0.2s'
            }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onClick={() => setTab('dieta')}>apri →</div>
          </div>
          {mealNames.map(meal => {
            const items = Object.values(meals[meal] || {}).filter(Boolean)
            return (
              <div key={meal} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:'12px', fontWeight:'500', color: items.length ? C.text : C.hint, minWidth:'80px' }}>{meal}</div>
                <div style={{ fontSize:'11px', color:C.muted, maxWidth:'55%', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {items.length ? items.join(' · ') : <span style={{ color:C.hint }}>—</span>}
                </div>
              </div>
            )
          })}
          <div style={{ marginTop:'12px' }}>
            <div style={{ background:C.borderMid, borderRadius:'999px', height:'4px', overflow:'hidden' }}>
              <div style={{
                background: `linear-gradient(90deg, ${C.primary} 0%, ${C.primaryLight} 100%)`,
                height:'100%',
                width:`${pct}%`,
                borderRadius:'999px',
                transition:'width 0.3s ease',
                boxShadow:`0 0 8px ${C.primaryGlow}`,
              }} />
            </div>
            <div style={{ fontSize:'11px', color:C.muted, marginTop:'6px', fontWeight:'600' }}>{filled.length}/{mealNames.length} pasti pianificati</div>
          </div>
        </div>

        {/* ── MINI CALENDARIO SETTIMANALE ── */}
        <div style={ss.card}>
          <div style={ss.secLbl}>Prossimi allenamenti</div>
          <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'4px' }}>
            {weekStrip.map((entry, i) => {
              const changed = sessionNotes?.find(n =>
                n.note_date === entry.day_date && n.original_session && n.original_session !== n.session_type
              )
              const displayType = changed?.session_type || entry.session_type
              const sc      = SESSION_COLORS[displayType] || SESSION_COLORS.REST
              const isToday = entry.day_date === today
              return (
                <div key={i} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'5px', cursor:'pointer' }}
                  onClick={() => setTab('allenamento')}>
                  <div style={{ fontSize:'9px', fontWeight:'600', color: isToday ? C.text : C.hint, textTransform:'uppercase' }}>
                    {fmtDayName(entry.day_date)}
                  </div>
                  <div style={{ position:'relative', width:'38px', height:'38px' }}>
                    <div style={{
                      width:'38px', height:'38px', borderRadius:'10px',
                      background: isToday ? sc.bg : '#161616',
                      border: `1px solid ${isToday ? sc.border : C.border}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <div style={{ fontSize:'8px', fontWeight:'700', color: sc.text, textAlign:'center', lineHeight:'1.3', padding:'2px' }}>
                        {displayType === 'REST' ? '—' : sc.label.split(' ')[0].slice(0, 5)}
                      </div>
                    </div>
                    {changed && (
                      <div style={{ position:'absolute', top:'-2px', right:'-2px', width:'8px', height:'8px', borderRadius:'50%', background:C.amber, border:`1px solid ${C.bg}` }} />
                    )}
                  </div>
                  <div style={{ fontSize:'9px', color: isToday ? C.text : C.hint }}>{fmtDateShort(entry.day_date).split(' ')[0]}</div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
