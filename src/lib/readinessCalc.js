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
