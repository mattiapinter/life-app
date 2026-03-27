import React from 'react'
import { C, ss, DAYS, MEALS_CATS, todayIdx, fmtDate, fmtDateShort, fmtDayName } from '../constants'
import { SESSION_COLORS } from '../constants'
import { TRAINING_PLAN, getTodayCalEntry } from '../data/trainingPlan'
import { IcoChev } from './Icons'

export default function HomeSection({ weeklyPlan, fitSessions, setTab, sessionNotes }) {
  const dayName  = DAYS[todayIdx()]
  const dayData  = weeklyPlan[dayName] || { isSkiDay: false, meals: {} }
  const meals    = dayData.meals || {}
  const mealNames = Object.keys(MEALS_CATS)
  const filled   = mealNames.filter(m => Object.values(meals[m] || {}).some(v => v))
  const pct      = Math.round((filled.length / mealNames.length) * 100)
  const todayEntry = getTodayCalEntry()
  const today    = new Date().toISOString().split('T')[0]

  // Controlla se l'allenamento di oggi è stato modificato manualmente
  const todayChange = sessionNotes?.find(n =>
    n.note_date === today && n.original_session && n.original_session !== n.session_type
  )
  const todayDisplayType = todayChange?.session_type || todayEntry?.session_type

  // Week strip — 7 days centered around today
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

        {/* ── ALLENAMENTO OGGI ── */}
        {todayEntry && todayDisplayType !== 'REST' && (() => {
          const sc     = SESSION_COLORS[todayDisplayType] || SESSION_COLORS.REST
          const scOrig = SESSION_COLORS[todayEntry.session_type] || SESSION_COLORS.REST
          const isChanged = !!todayChange
          return (
            <div style={{ background: sc.bg, border: `1px solid ${isChanged ? C.amberBorder : sc.border}`, borderRadius: '16px', padding: '18px', marginBottom: '12px', cursor: 'pointer' }}
              onClick={() => setTab('allenamento')}>
              <div style={{ fontSize: '9px', fontWeight: '600', letterSpacing: '.08em', textTransform: 'uppercase', color: sc.text, marginBottom: '6px', display:'flex', alignItems:'center', gap:'6px' }}>
                Allenamento di oggi · Settimana {todayEntry.week}{todayEntry.scarico ? ' · Scarico' : ''}
                {isChanged && <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:C.amber, display:'inline-block' }} />}
              </div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: C.text }}>{sc.label}</div>
              {isChanged && (
                <div style={{ fontSize: '10px', color: C.amber, marginTop: '3px', opacity: 0.8 }}>
                  modificato · pianificato: {scOrig.label}
                </div>
              )}
              {!isChanged && todayEntry.also && (
                <div style={{ fontSize: '11px', color: sc.text, opacity: 0.8, marginTop: '3px' }}>
                  + {SESSION_COLORS[todayEntry.also]?.label}
                </div>
              )}
              <div style={{ marginTop: '12px', fontSize: '10px', fontWeight: '600', color: sc.text }}>Apri sessione →</div>
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
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
            <div style={{ fontSize:'13px', fontWeight:'600', color:C.text }}>Pasti di oggi</div>
            <div style={{ fontSize:'11px', color:C.violet, cursor:'pointer', fontWeight:'500' }} onClick={() => setTab('dieta')}>apri →</div>
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
          <div style={{ marginTop:'10px' }}>
            <div style={{ background:C.borderMid, borderRadius:'999px', height:'3px', overflow:'hidden' }}>
              <div style={{ background:C.violet, height:'100%', width:`${pct}%`, borderRadius:'999px' }} />
            </div>
            <div style={{ fontSize:'10px', color:C.muted, marginTop:'5px' }}>{filled.length}/{mealNames.length} pasti pianificati</div>
          </div>
        </div>

        {/* ── MINI CALENDARIO SETTIMANALE ── */}
        <div style={ss.card}>
          <div style={ss.secLbl}>Prossimi allenamenti</div>
          <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'4px' }}>
            {weekStrip.map((entry, i) => {
              const sc = SESSION_COLORS[entry.session_type] || SESSION_COLORS.REST
              const isToday = entry.day_date === today
              return (
                <div key={i} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'5px', cursor:'pointer' }}
                  onClick={() => setTab('allenamento')}>
                  <div style={{ fontSize:'9px', fontWeight:'600', color: isToday ? C.text : C.hint, textTransform:'uppercase' }}>
                    {fmtDayName(entry.day_date)}
                  </div>
                  <div style={{
                    width:'38px', height:'38px', borderRadius:'10px',
                    background: isToday ? sc.bg : '#161616',
                    border: `1px solid ${isToday ? sc.border : C.border}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <div style={{ fontSize:'8px', fontWeight:'700', color: sc.text, textAlign:'center', lineHeight:'1.3', padding:'2px' }}>
                      {entry.session_type === 'REST' ? '—' : sc.label.split(' ')[0].slice(0, 5)}
                    </div>
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
