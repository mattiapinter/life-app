import { todayStr } from '../constants'

/** Ultimi N log HRV ordinati per data crescente. */
export function hrvSortedAsc(logs) {
  return [...(logs || [])].sort((a, b) => String(a.log_date).localeCompare(String(b.log_date)))
}

export function calcReadiness(hrvToday, hrvLogs, healthLogToday) {
  const sorted = hrvSortedAsc(hrvLogs)
  const hrv28 = sorted.slice(-28)
  const avgHrv = hrv28.length > 0
    ? hrv28.reduce((s, r) => s + r.hrv_value, 0) / hrv28.length
    : null

  const hrvScore = (hrvToday && avgHrv)
    ? Math.min(Math.max((hrvToday.hrv_value / avgHrv) * 100, 40), 120)
    : null

  const sleepDeep = healthLogToday?.sleep_deep
  const sleepTotal = healthLogToday?.sleep_total

  const sleepScore = (sleepDeep != null && sleepTotal != null)
    ? (sleepDeep / 90 * 60) + (sleepTotal / 480 * 40)
    : null

  if (!hrvScore && !sleepScore) return null
  if (!hrvScore) return Math.round(sleepScore)
  if (!sleepScore) return Math.round(hrvScore)
  return Math.round(hrvScore * 0.55 + sleepScore * 0.45)
}

export function readinessCoachText(readiness, hasHrv, hasSleep) {
  if (readiness == null) return null
  if (!hasHrv && hasSleep) {
    return 'Readiness calcolato solo sul sonno. Inserisci l\'HRV per un dato completo.'
  }
  if (hasHrv && !hasSleep) {
    return 'Readiness calcolato solo sull\'HRV. I dati del sonno arriveranno domani mattina automaticamente.'
  }
  if (readiness > 80) {
    return 'Sistema nervoso in forma ottimale. I giorni con HRV elevato rispetto alla baseline sono la finestra ideale per stimoli ad alta intensità. Spingi forte oggi (Kiviniemi et al., 2007).'
  }
  if (readiness >= 60) {
    return 'Condizione nella norma. Puoi allenarti regolarmente ma aspettati un RPE soggettivamente più alto del solito a parità di carico (Fullagar et al., 2015).'
  }
  return 'Il sistema nervoso non ha recuperato completamente. Ridurre il volume oggi produce adattamenti superiori rispetto a forzare il piano (Plews et al., 2013).'
}

export function readinessBadgeTraining(readiness) {
  if (readiness == null) return null
  if (readiness > 80) return 'Giornata ideale per questa sessione'
  if (readiness >= 60) return 'Monitora l\'intensità oggi'
  return 'Considera di ridurre il volume'
}

/** Minuti da mezzanotte per stringa "HH:MM" o ISO time. */
export function timeToMinutes(t) {
  if (t == null || t === '') return null
  const s = String(t).trim()
  const m = s.match(/(\d{1,2}):(\d{2})/)
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
  return null
}

export function minutesToHHMM(mins) {
  if (mins == null || !Number.isFinite(mins)) return '—'
  let m = ((mins % (24 * 60)) + (24 * 60)) % (24 * 60)
  const h = Math.floor(m / 60)
  const mm = Math.round(m % 60)
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** Soglia sonno per card caffeina: orario "dormi entro" e messaggi. */
export function calcSleepTarget(healthLogs) {
  const last7 = [...(healthLogs || [])]
    .sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)))
    .slice(0, 7)

  const withEnd = last7.filter(r => r.sleep_end && String(r.sleep_end).trim())
  const avgWakeMinutes = withEnd.length >= 3
    ? withEnd.reduce((s, r) => s + (timeToMinutes(r.sleep_end) || 0), 0) / withEnd.length
    : 7 * 60 + 30

  const withDeep = last7.filter(r => r.sleep_deep != null && Number.isFinite(Number(r.sleep_deep)))
  const avgDeep = withDeep.length >= 3
    ? withDeep.reduce((s, r) => s + Number(r.sleep_deep), 0) / withDeep.length
    : null

  const withTotal = last7.filter(r => r.sleep_total != null && Number.isFinite(Number(r.sleep_total)))
  const avgTotal = withTotal.length >= 3
    ? withTotal.reduce((s, r) => s + Number(r.sleep_total), 0) / withTotal.length
    : null

  const baseBed = avgWakeMinutes - 7.5 * 60
  let bedtimeMinutes = baseBed
  if (avgDeep !== null && avgDeep < 45) bedtimeMinutes -= 45
  else if (avgDeep !== null && avgDeep < 60) bedtimeMinutes -= 30
  if (avgTotal !== null && avgTotal < 360) bedtimeMinutes -= 30

  const isAnticipated = bedtimeMinutes < baseBed

  bedtimeMinutes = Math.max(bedtimeMinutes, 21 * 60)
  bedtimeMinutes = Math.min(bedtimeMinutes, 25 * 60)

  const h = Math.floor(bedtimeMinutes / 60) % 24
  const m = Math.round(bedtimeMinutes % 60)
  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  return {
    time,
    isAnticipated,
    avgDeep,
    avgTotal,
    avgWakeMinutes,
    nightsWithWake: withEnd.length,
  }
}

export function calcLastCoffee(avgWakeMinutes) {
  const raw = avgWakeMinutes - 10 * 60
  const capped = Math.min(raw, 14 * 60 + 30)
  const norm = ((capped % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(norm / 60) % 24
  const mm = Math.round(norm % 60)
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** Minuti totali sonno come stringa tipo 5h 45m */
export function formatSleepDurationMinutes(totalMin) {
  if (totalMin == null || !Number.isFinite(Number(totalMin))) return 'n.d.'
  const n = Math.round(Number(totalMin))
  const hh = Math.floor(n / 60)
  const mm = n % 60
  if (hh <= 0) return `${mm}m`
  if (mm === 0) return `${hh}h`
  return `${hh}h ${mm}m`
}

export function avgSleepEndMinutes(healthLogs, days = 7) {
  const logs = [...(healthLogs || [])]
    .filter(r => r.sleep_end != null && String(r.sleep_end).trim() !== '')
    .sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)))
    .slice(0, days)
  const mins = logs.map(r => timeToMinutes(r.sleep_end)).filter(v => v != null)
  if (!mins.length) return null
  return mins.reduce((a, b) => a + b, 0) / mins.length
}

export function avgSleepStartMinutes(healthLogs, days = 7) {
  const logs = [...(healthLogs || [])]
    .filter(r => r.sleep_start != null && String(r.sleep_start).trim() !== '')
    .sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)))
    .slice(0, days)
  const mins = logs.map(r => timeToMinutes(r.sleep_start)).filter(v => v != null)
  if (!mins.length) return null
  return mins.reduce((a, b) => a + b, 0) / mins.length
}

export function getHrvToday(hrvLogs) {
  const t = todayStr()
  return (hrvLogs || []).find(r => r.log_date === t) || null
}
