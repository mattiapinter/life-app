import React from 'react'
import { DAYS, MEALS_CATS, todayIdx, fmtDate, fmtDateShort, fmtDayName } from '../constants'
import { SESSION_COLORS } from '../constants'
import { TRAINING_PLAN, getTodayCalEntry } from '../data/trainingPlan'
import { saveHrvLog } from '../lib/supabase'

function HrvWidget({ hrvLogs, onHrvSaved }) {
  const [inputVal, setInputVal] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const today = new Date().toISOString().split('T')[0]

  const sorted = [...hrvLogs].sort((a, b) => a.log_date.localeCompare(b.log_date))
  const last7 = sorted.slice(-7)
  const avg7 = last7.length ? Math.round(last7.reduce((s, r) => s + r.hrv_value, 0) / last7.length) : null
  const todayLog = sorted.find(r => r.log_date === today)
  const todayHrv = todayLog?.hrv_value || null
  const alreadyLogged = !!todayLog

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
      "Sistema nervoso in forma smagliante! Oggi puoi spingere forte",
      "HRV da campione. Il corpo ha voglia di soffrire — dagliene!",
      "Recupero ottimale. È il momento di mettere km nelle gambe.",
    ],
    yellow: [
      "Corpo un po' affaticato. Allenati, ma senza strafare",
      "Giallo — non rosso. Fai la sessione, ma ascolta il corpo.",
      "HRV nella media. Buon allenamento, niente eroismo oggi.",
    ],
    red: [
      "Il corpo urla riposo. Recupero attivo o rest day, senza se e ma.",
      "Sistema nervoso stanco. Una passeggiata sì, le trazioni no.",
      "HRV basso. Mangia bene, dormi tanto, dimentica la scheda per oggi.",
    ],
  }

  const getCoachMsg = (s) => {
    if (!s) return null
    const msgs = coachText[s]
    const dayNum = new Date(today).getDate()
    return msgs[dayNum % msgs.length]
  }

  const statusColor = { green: '#4ae176', yellow: '#fbbf24', red: '#ffb4ab' }
  const statusBg = { green: 'rgba(74, 225, 118, 0.1)', yellow: 'rgba(251, 191, 36, 0.1)', red: 'rgba(255, 180, 171, 0.1)' }

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
    <div className="bg-surface-container-low rounded-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary text-2xl">favorite</span>
          <span className="text-sm font-bold uppercase tracking-widest text-on-surface">HRV Mattutino</span>
        </div>
        {avg7 && (
          <span className="text-xs text-on-surface-variant">
            media: <span className="text-secondary font-bold">{avg7}</span>
          </span>
        )}
      </div>

      {todayHrv && status && (
        <div
          className="rounded-xl p-5 mb-4"
          style={{
            background: statusBg[status],
            border: `1.5px solid ${statusColor[status]}33`
          }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-4 h-4 rounded-full animate-pulse"
              style={{
                background: statusColor[status],
                boxShadow: `0 0 12px ${statusColor[status]}`
              }}
            />
            <span className="text-3xl font-headline font-extrabold tracking-tight" style={{ color: statusColor[status] }}>
              {todayHrv} <span className="text-lg">ms</span>
            </span>
            <span
              className="ml-auto text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg"
              style={{
                color: statusColor[status],
                background: `${statusColor[status]}22`
              }}>
              {status === 'green' ? 'OTTIMO' : status === 'yellow' ? 'MODERATO' : 'RIPOSA'}
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: statusColor[status], opacity: 0.9 }}>
            {getCoachMsg(status)}
          </p>
        </div>
      )}

      {!alreadyLogged ? (
        <div className="flex gap-3">
          <input
            type="number"
            inputMode="numeric"
            className="flex-1 bg-surface-container-highest border-2 border-outline-variant rounded-xl px-4 py-3 text-2xl font-headline font-bold text-center text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="HRV"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 rounded-xl font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-50"
            style={{
              background: saved ? '#4ae176' : 'linear-gradient(135deg, #c6bfff 0%, #8c81fb 100%)',
              color: saved ? '#003915' : '#160066',
              boxShadow: saved ? '0 4px 16px rgba(74, 225, 118, 0.3)' : '0 4px 16px rgba(198, 191, 255, 0.3)'
            }}>
            {saving ? '...' : saved ? '✓' : 'Salva'}
          </button>
        </div>
      ) : (
        <div className="text-center text-sm font-bold text-primary">✓ Già registrato oggi</div>
      )}

      {last7.length > 1 && (
        <div className="flex gap-1 mt-4 h-8 items-end">
          {last7.map((r, i) => {
            const maxV = Math.max(...last7.map(x => x.hrv_value))
            const minV = Math.min(...last7.map(x => x.hrv_value))
            const range = maxV - minV || 1
            const h = Math.max(8, Math.round(((r.hrv_value - minV) / range) * 28))
            const s = getStatus(r.hrv_value, avg7)
            const isToday = r.log_date === today
            return (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${h}px`,
                    background: s ? statusColor[s] : '#474553',
                    opacity: isToday ? 1 : 0.5
                  }}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function HomeSection({ weeklyPlan, fitSessions, setTab, setSub, sessionNotes, hrvLogs, onHrvSaved }) {
  const dayName = DAYS[todayIdx()]
  const dayData = weeklyPlan[dayName] || { isSkiDay: false, meals: {} }
  const meals = dayData.meals || {}
  const mealNames = Object.keys(MEALS_CATS)
  const filled = mealNames.filter(m => Object.values(meals[m] || {}).some(v => v))
  const pct = Math.round((filled.length / mealNames.length) * 100)
  const todayEntry = getTodayCalEntry()
  const today = new Date().toISOString().split('T')[0]

  const todayChange = sessionNotes?.find(n =>
    n.note_date === today && n.original_session && n.original_session !== n.session_type
  )
  const todayDisplayType = todayChange?.session_type || todayEntry?.session_type

  const weekStrip = TRAINING_PLAN.calendar
    .filter(e => e.day_date >= today)
    .slice(0, 7)

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-6 pb-8" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)' }}>
        <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          {fmtDate()}
        </p>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface mb-1">
          Ciao, <span className="text-primary">Mattia</span>
        </h1>
        <p className="text-on-surface-variant font-medium">Riepilogo di oggi</p>
      </div>

      <div className="px-6 space-y-6">
        <HrvWidget hrvLogs={hrvLogs || []} onHrvSaved={onHrvSaved} />

        {todayEntry && todayDisplayType !== 'REST' && (() => {
          const sc = SESSION_COLORS[todayDisplayType] || SESSION_COLORS.REST
          const scOrig = SESSION_COLORS[todayEntry.session_type] || SESSION_COLORS.REST
          const isChanged = !!todayChange
          return (
            <button
              onClick={() => setTab('allenamento')}
              className="w-full rounded-xl p-6 transition-all active:scale-[0.98] text-left"
              style={{
                background: sc.bg,
                border: `2px solid ${isChanged ? '#fbbf24' : sc.border}`,
                boxShadow: `0 8px 24px ${sc.text}22`
              }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-xl" style={{ color: sc.text }}>
                  fitness_center
                </span>
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: sc.text }}>
                  Allenamento · Settimana {todayEntry.week}{todayEntry.scarico ? ' · Scarico' : ''}
                </span>
                {isChanged && (
                  <span
                    className="w-2 h-2 rounded-full ml-auto animate-pulse"
                    style={{ background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }}
                  />
                )}
              </div>
              <h3 className="text-2xl font-headline font-extrabold tracking-tight text-on-surface mb-2">
                {sc.label}
              </h3>
              {isChanged && (
                <p className="text-xs font-semibold mb-3" style={{ color: '#fbbf24' }}>
                  modificato · pianificato: {scOrig.label}
                </p>
              )}
              {!isChanged && todayEntry.also && (
                <p className="text-xs font-semibold mb-3" style={{ color: sc.text, opacity: 0.8 }}>
                  + {SESSION_COLORS[todayEntry.also]?.label}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: sc.text }}>
                Apri sessione
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </div>
            </button>
          )
        })()}

        {todayEntry && todayDisplayType === 'REST' && (
          <div className="bg-surface-container-low rounded-xl p-6 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
              Oggi
            </span>
            <p className="text-xl font-bold text-on-surface-variant">Giorno di riposo</p>
          </div>
        )}

        <div className="bg-surface-container-low rounded-xl p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-tertiary text-2xl">restaurant</span>
              <span className="text-sm font-bold uppercase tracking-widest text-on-surface">Pasti</span>
            </div>
            <button
              onClick={() => setTab('dieta')}
              className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-opacity">
              Apri →
            </button>
          </div>

          <div className="space-y-3 mb-5">
            {mealNames.map(meal => {
              const items = Object.values(meals[meal] || {}).filter(Boolean)
              return (
                <div key={meal} className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className={`text-sm font-semibold ${items.length ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>
                    {meal}
                  </span>
                  <span className="text-xs text-on-surface-variant max-w-[60%] truncate text-right">
                    {items.length ? items.join(' · ') : '—'}
                  </span>
                </div>
              )
            })}
          </div>

          <div>
            <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="h-full kinetic-gradient rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  boxShadow: '0 0 8px rgba(198, 191, 255, 0.3)'
                }}
              />
            </div>
            <p className="text-xs font-bold text-on-surface-variant mt-2">
              {filled.length}/{mealNames.length} pasti pianificati
            </p>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface mb-5">
            Prossimi Allenamenti
          </h3>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {weekStrip.map((entry, i) => {
              const changed = sessionNotes?.find(n =>
                n.note_date === entry.day_date && n.original_session && n.original_session !== n.session_type
              )
              const displayType = changed?.session_type || entry.session_type
              const sc = SESSION_COLORS[displayType] || SESSION_COLORS.REST
              const isToday = entry.day_date === today
              return (
                <button
                  key={i}
                  onClick={() => setTab('allenamento')}
                  className="flex-shrink-0 flex flex-col items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-on-surface' : 'text-on-surface-variant/60'}`}>
                    {fmtDayName(entry.day_date)}
                  </span>
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: isToday ? sc.bg : '#1c1b1b',
                        border: `1.5px solid ${isToday ? sc.border : '#353534'}`
                      }}>
                      <span
                        className="text-xs font-bold text-center leading-tight"
                        style={{ color: sc.text }}>
                        {displayType === 'REST' ? '—' : sc.label.split(' ')[0].slice(0, 5)}
                      </span>
                    </div>
                    {changed && (
                      <div
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background"
                        style={{ background: '#fbbf24' }}
                      />
                    )}
                  </div>
                  <span className={`text-xs ${isToday ? 'text-on-surface font-semibold' : 'text-on-surface-variant/60'}`}>
                    {fmtDateShort(entry.day_date).split(' ')[0]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
