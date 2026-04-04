import React from 'react'
import { DAYS, MEALS_CATS, todayIdx, fmtDate, fmtDateShort, fmtDayName, todayStr } from '../constants'
import { SESSION_COLORS } from '../constants'
import { TRAINING_PLAN, getTodayCalEntry } from '../data/trainingPlan'
import { saveHrvLog } from '../lib/supabase'
import {
  calcReadiness,
  readinessCoachText,
  readinessBadgeTraining,
  getHrvToday,
  hrvSortedAsc,
  avgSleepEndMinutes,
  avgSleepStartMinutes,
  minutesToHHMM,
} from '../lib/readinessCalc'

function ReadinessGauge({ value }) {
  const v = value == null ? null : Math.min(100, Math.max(0, value))
  const arcColor = v == null ? '#928f9f' : v > 80 ? '#4ae176' : v >= 60 ? '#fbbf24' : '#ffb4ab'
  const r = 52
  const c = 2 * Math.PI * r
  const pct = v == null ? 0 : v / 100
  const dash = c * 0.5 * pct

  return (
    <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/15">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary text-xl">monitor_heart</span>
        <span className="text-sm font-bold uppercase tracking-widest text-on-surface">Daily Readiness</span>
      </div>
      <div className="flex flex-col items-center">
        <svg width="200" height="110" viewBox="0 0 200 110" className="mx-auto">
          <path
            d="M 28 100 A 72 72 0 0 1 172 100"
            fill="none"
            stroke="#353534"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {v != null && (
            <path
              d="M 28 100 A 72 72 0 0 1 172 100"
              fill="none"
              stroke={arcColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c * 0.5}`}
            />
          )}
        </svg>
        <div className="-mt-14 text-center">
          <div className="text-5xl font-headline font-extrabold tracking-tight text-on-surface">
            {v != null ? v : 'n.d.'}
          </div>
          <div className="text-xs text-on-surface-variant mt-1">su 100</div>
        </div>
      </div>
    </div>
  )
}

function HrvWidgetEvolved({ hrvLogs, onHrvSaved, widgetRef }) {
  const [inputVal, setInputVal] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const today = todayStr()

  const sorted = hrvSortedAsc(hrvLogs)
  const last28 = sorted.slice(-28)
  const avg28 = last28.length ? Math.round(last28.reduce((s, r) => s + r.hrv_value, 0) / last28.length) : null
  const last14 = sorted.slice(-14)
  const todayLog = sorted.find(r => r.log_date === today)
  const todayHrv = todayLog?.hrv_value ?? null
  const alreadyLogged = !!todayLog

  const getStatus = (hrv, avg) => {
    if (!hrv || !avg) return null
    const pct = hrv / avg
    if (pct >= 0.97) return 'green'
    if (pct >= 0.88) return 'yellow'
    return 'red'
  }

  const statusColor = { green: '#4ae176', yellow: '#fbbf24', red: '#ffb4ab' }

  const trend3 = React.useMemo(() => {
    const last3 = sorted.slice(-3).map(r => r.hrv_value)
    if (last3.length < 3) return 'flat'
    const d = last3[2] - last3[0]
    if (Math.abs(d) < 3) return 'flat'
    return d > 0 ? 'up' : 'down'
  }, [sorted])

  const handleSave = async () => {
    const v = parseInt(inputVal, 10)
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
    <div ref={widgetRef} className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/15 scroll-mt-28">
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary text-2xl">favorite</span>
          <div>
            <span className="text-sm font-bold uppercase tracking-widest text-on-surface block">HRV Mattutino</span>
            {avg28 && <span className="text-xs text-on-surface-variant">baseline 28gg: <strong className="text-secondary">{avg28}</strong> ms</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 text-on-surface-variant" aria-hidden>
          {trend3 === 'up' && <span className="material-symbols-outlined text-lg text-tertiary">trending_up</span>}
          {trend3 === 'down' && <span className="material-symbols-outlined text-lg text-error">trending_down</span>}
          {trend3 === 'flat' && <span className="material-symbols-outlined text-lg">trending_flat</span>}
        </div>
      </div>

      {todayHrv != null && avg28 && (
        <div
          className="rounded-xl p-4 mb-4 border"
          style={{
            background: 'rgba(74, 225, 118, 0.06)',
            borderColor: `${statusColor[getStatus(todayHrv, avg28)]}44`,
          }}>
          <div className="text-3xl font-headline font-extrabold" style={{ color: statusColor[getStatus(todayHrv, avg28)] }}>
            {todayHrv} <span className="text-lg">ms</span>
          </div>
        </div>
      )}

      {!alreadyLogged ? (
        <div className="flex gap-3">
          <input
            type="number"
            inputMode="numeric"
            className="w-24 bg-surface-container-highest border-2 border-outline-variant rounded-xl px-3 py-3 text-2xl font-headline font-bold text-center text-on-surface"
            placeholder="HRV"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50"
            style={{
              background: saved ? '#4ae176' : 'linear-gradient(135deg, #c6bfff 0%, #8c81fb 100%)',
              color: saved ? '#003915' : '#160066',
              boxShadow: '0 4px 16px rgba(198, 191, 255, 0.3)',
            }}>
            {saving ? '...' : saved ? 'OK' : 'Salva'}
          </button>
        </div>
      ) : (
        <div className="text-center text-sm font-bold text-primary">Registrato oggi</div>
      )}

      {last14.length > 1 && avg28 && (
        <div className="flex gap-0.5 mt-4 h-16 items-end justify-between px-0.5">
          {last14.map((r, i) => {
            const vals = last14.map(x => x.hrv_value)
            const maxV = Math.max(...vals)
            const minV = Math.min(...vals)
            const range = maxV - minV || 1
            const h = Math.max(6, Math.round(((r.hrv_value - minV) / range) * 52))
            const s = getStatus(r.hrv_value, avg28)
            const isToday = r.log_date === today
            return (
              <div key={r.id || i} className="flex-1 flex flex-col justify-end items-center min-w-0">
                <div
                  className="w-full max-w-[14px] rounded-t mx-auto"
                  style={{
                    height: `${h}px`,
                    background: s ? statusColor[s] : '#474553',
                    opacity: isToday ? 1 : 0.65,
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

function CaffeineSleepCard({ healthLogs }) {
  const n = (healthLogs || []).length
  const avgWake = avgSleepEndMinutes(healthLogs, 7)
  const defaultWake = 7 * 60 + 30
  const wakeM = avgWake != null ? Math.round(avgWake) : defaultWake
  const prima = (wakeM + 90) % (24 * 60)
  const ultima = (wakeM - 600 + 24 * 60) % (24 * 60)
  const dormi = (wakeM - 450 + 24 * 60) % (24 * 60)

  const avgStart = avgSleepStartMinutes(healthLogs, 7)
  let late = false
  if (avgStart != null) {
    const diff = (avgStart - dormi + 24 * 60) % (24 * 60)
    late = diff > 45 && diff < 12 * 60
  }

  const sleepTip = late
    ? 'Il tuo sonno profondo cala quando vai a letto tardi. I tuoi dati lo confermano. Il sonno a onde lente è concentrato nelle prime ore del ciclo e si comprime con gli orari tardivi (Walker, 2017).'
    : 'Stai rispettando una buona igiene del sonno. Il ritmo circadiano stabile migliora la qualità del sonno profondo nel lungo periodo (Walker, 2017).'

  return (
    <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/15">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-amber-300 text-xl">local_cafe</span>
        <span className="text-sm font-bold uppercase tracking-widest text-on-surface">Caffeina e sonno</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        <div>
          <div className="text-[10px] font-bold uppercase text-on-surface-variant mb-1">Prima tazza</div>
          <div className="text-lg font-headline font-extrabold text-on-surface">{minutesToHHMM(prima)}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase text-on-surface-variant mb-1">Ultima tazza</div>
          <div className="text-lg font-headline font-extrabold text-on-surface">{minutesToHHMM(ultima)}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase text-on-surface-variant mb-1">Dormi entro</div>
          <div className="text-lg font-headline font-extrabold text-on-surface">{minutesToHHMM(dormi)}</div>
        </div>
      </div>
      <p className="text-xs text-on-surface-variant leading-relaxed">{sleepTip}</p>
      {n < 3 && (
        <p className="text-[10px] text-on-surface-variant/70 mt-3 leading-relaxed">
          Orari calibrati su sveglia di default 07:30 finché non avrai almeno 3 notti registrate in health_logs.
        </p>
      )}
    </div>
  )
}

export default function HomeSection({
  weeklyPlan,
  fitSessions,
  setTab,
  setSub,
  sessionNotes,
  hrvLogs,
  healthLogs,
  healthLogToday,
  onHrvSaved,
}) {
  const hrvWidgetRef = React.useRef(null)
  const dayName = DAYS[todayIdx()]
  const dayData = weeklyPlan[dayName] || { isSkiDay: false, meals: {} }
  const meals = dayData.meals || {}
  const mealNames = Object.keys(MEALS_CATS)
  const filled = mealNames.filter(m => Object.values(meals[m] || {}).some(v => v))
  const pct = Math.round((filled.length / mealNames.length) * 100)
  const todayEntry = getTodayCalEntry()
  const today = todayStr()

  const todayChange = sessionNotes?.find(n =>
    n.note_date === today && n.original_session && n.original_session !== n.session_type
  )
  const todayDisplayType = todayChange?.session_type || todayEntry?.session_type

  const weekStrip = TRAINING_PLAN.calendar
    .filter(e => e.day_date >= today)
    .slice(0, 7)

  const hrvToday = getHrvToday(hrvLogs || [])
  const readiness = calcReadiness(hrvToday, hrvLogs || [], healthLogToday)
  const hasHrv = !!hrvToday
  const hasSleep = healthLogToday?.sleep_deep != null && healthLogToday?.sleep_total != null
  const badgeText = readinessBadgeTraining(readiness)

  const showHrvBanner = !(hrvLogs || []).some(r => r.log_date === today)

  const coachReadiness = readiness != null ? readinessCoachText(readiness, hasHrv, hasSleep) : null

  const chips = (
    <div className="flex flex-wrap gap-2 justify-center mt-4">
      {avg28chip(hrvToday, hrvLogs)}
      {healthLogToday?.sleep_deep != null && (
        <span className="text-[10px] px-2 py-1 rounded-full bg-surface-container-highest border border-outline-variant text-on-surface-variant">
          Profondo {healthLogToday.sleep_deep} min
        </span>
      )}
      {healthLogToday?.resting_hr != null && (
        <span className="text-[10px] px-2 py-1 rounded-full bg-surface-container-highest border border-outline-variant text-on-surface-variant">
          FC riposo {healthLogToday.resting_hr}
        </span>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-background pb-44">
      <div className="px-6 pb-6" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 32px)' }}>
        <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">
          {fmtDate()}
        </p>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface mb-1">
          Ciao, <span className="text-primary">Mattia</span>
        </h1>
        <p className="text-on-surface-variant font-medium">Riepilogo di oggi</p>
      </div>

      <div className="px-6 space-y-6">
        {showHrvBanner && (
          <div className="rounded-xl p-4 border border-amber-500/35 bg-amber-500/10">
            <p className="text-sm font-semibold text-on-surface mb-2">Inserisci l&apos;HRV di stamattina per calcolare il Readiness</p>
            <button
              type="button"
              onClick={() => hrvWidgetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="text-xs font-bold uppercase tracking-widest text-amber-200">
              Vai al widget HRV
            </button>
          </div>
        )}

        <div>
          <ReadinessGauge value={readiness} />
          {chips}
          {coachReadiness && (
            <p className="text-xs text-on-surface-variant leading-relaxed mt-4 text-center px-1">{coachReadiness}</p>
          )}
        </div>

        {todayEntry && todayDisplayType !== 'REST' && (() => {
          const sc = SESSION_COLORS[todayDisplayType] || SESSION_COLORS.REST
          const scOrig = SESSION_COLORS[todayEntry.session_type] || SESSION_COLORS.REST
          const isChanged = !!todayChange
          return (
            <button
              type="button"
              onClick={() => setTab('allenamento')}
              className="w-full rounded-xl p-6 transition-all active:scale-[0.98] text-left relative"
              style={{
                background: sc.bg,
                border: `2px solid ${isChanged ? '#fbbf24' : sc.border}`,
                boxShadow: `0 8px 24px ${sc.text}22`,
              }}>
              {badgeText && (
                <span
                  className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg max-w-[55%] text-right leading-tight"
                  style={{ background: 'rgba(0,0,0,0.35)', color: '#e5e2e1' }}>
                  {badgeText}
                </span>
              )}
              <div className="flex items-center gap-2 mb-3 pr-16">
                <span className="material-symbols-outlined text-xl" style={{ color: sc.text }}>
                  fitness_center
                </span>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: sc.text }}>
                  Allenamento · Settimana {todayEntry.week}{todayEntry.scarico ? ' · Scarico' : ''}
                </span>
                {isChanged && (
                  <span className="w-2 h-2 rounded-full ml-auto animate-pulse" style={{ background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }} />
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
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-2">Oggi</span>
            <p className="text-xl font-bold text-on-surface-variant">Giorno di riposo</p>
          </div>
        )}

        <CaffeineSleepCard healthLogs={healthLogs} />

        <HrvWidgetEvolved hrvLogs={hrvLogs || []} onHrvSaved={onHrvSaved} widgetRef={hrvWidgetRef} />

        <div className="bg-surface-container-low rounded-xl p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-tertiary text-2xl">restaurant</span>
              <span className="text-sm font-bold uppercase tracking-widest text-on-surface">Pasti</span>
            </div>
            <button
              type="button"
              onClick={() => setTab('dieta')}
              className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-opacity">
              Apri
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
                    {items.length ? items.join(' · ') : 'n.d.'}
                  </span>
                </div>
              )
            })}
          </div>
          <div>
            <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="h-full kinetic-gradient rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, boxShadow: '0 0 8px rgba(198, 191, 255, 0.3)' }}
              />
            </div>
            <p className="text-xs font-bold text-on-surface-variant mt-2">
              {filled.length}/{mealNames.length} pasti pianificati
            </p>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface mb-5">Prossimi Allenamenti</h3>
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
                  type="button"
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
                        border: `1.5px solid ${isToday ? sc.border : '#353534'}`,
                      }}>
                      <span className="text-xs font-bold text-center leading-tight" style={{ color: sc.text }}>
                        {displayType === 'REST' ? 'Rip' : sc.label.split(' ')[0].slice(0, 5)}
                      </span>
                    </div>
                    {changed && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background" style={{ background: '#fbbf24' }} />
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

function avg28chip(hrvToday, hrvLogs) {
  const sorted = hrvSortedAsc(hrvLogs)
  const last28 = sorted.slice(-28)
  const avg = last28.length ? Math.round(last28.reduce((s, r) => s + r.hrv_value, 0) / last28.length) : null
  if (!hrvToday || avg == null) {
    return (
      <span className="text-[10px] px-2 py-1 rounded-full bg-surface-container-highest border border-outline-variant text-on-surface-variant">
        HRV oggi n/d
      </span>
    )
  }
  return (
    <span className="text-[10px] px-2 py-1 rounded-full bg-surface-container-highest border border-outline-variant text-on-surface-variant">
      HRV {hrvToday.hrv_value} vs media 28gg {avg}
    </span>
  )
}
