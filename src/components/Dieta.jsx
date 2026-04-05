import React from 'react'
import { C, ss, DAYS, MEALS_CATS, todayIdx } from '../constants'
import { IcoCheck, IcoRandom } from './Icons'

export default function DietaSection({ initialSub, onSubChange, weeklyPlan, setWeeklyPlan, foodOptions, setFoodOptions }) {
  const [sub, setSub] = React.useState(initialSub || 'piano')

  // Sync sub con App quando cambia dall'esterno (cambio macro)
  React.useEffect(() => {
    if (initialSub && initialSub !== sub) setSub(initialSub)
  }, [initialSub])

  // Notifica App del cambio sub
  const changeSub = (s) => { setSub(s); onSubChange?.(s) }

  const [dayIdx, setDayIdx]         = React.useState(todayIdx())
  const [settingsMode, setSettingsMode] = React.useState('normal')
  const [cart, setCart]             = React.useState(() => {
    try { const s = localStorage.getItem('life_cart'); return s ? JSON.parse(s) : [] } catch(e) { return [] }
  })

  React.useEffect(() => { localStorage.setItem('life_cart', JSON.stringify(cart)) }, [cart])

  const dayName = DAYS[dayIdx]
  const dayData = weeklyPlan[dayName] || { isSkiDay: false, meals: {} }
  const getOpts = (meal, cat, ski) =>
    (foodOptions[ski ? 'ski' : 'normal']?.[meal]?.[cat] || '').split('\n').map(s => s.trim()).filter(Boolean)
  const setSel = (meal, cat, val) =>
    setWeeklyPlan(p => ({ ...p, [dayName]: { ...p[dayName], meals: { ...p[dayName].meals, [meal]: { ...(p[dayName].meals?.[meal] || {}), [cat]: val } } } }))
  const toggleSki = () =>
    setWeeklyPlan(p => ({ ...p, [dayName]: { ...p[dayName], isSkiDay: !p[dayName].isSkiDay } }))
  const randomize = () => {
    const m = {}
    Object.entries(MEALS_CATS).forEach(([ml, cats]) => {
      m[ml] = {}
      cats.forEach(c => { const opts = getOpts(ml, c, dayData.isSkiDay); if (opts.length) m[ml][c] = opts[Math.floor(Math.random() * opts.length)] })
    })
    setWeeklyPlan(p => ({ ...p, [dayName]: { ...p[dayName], meals: m } }))
  }

  const resetWeek = () => {
    const empty = {}
    DAYS.forEach(d => { empty[d] = { isSkiDay: weeklyPlan[d]?.isSkiDay || false, meals: {} } })
    setWeeklyPlan(empty)
  }

  const shoppingList = React.useMemo(() => {
    const list = {}
    const parse = str => {
      str = str.trim()
      const m = str.match(/^([\d.,\-]+)\s*(gr|g|ml|cucchiain[io]|cucchiai[o]?|scatolett[ae])?\s*(?:di\s+)?(.*)$/i)
      if (m) {
        let q = m[1].includes('-') ? parseFloat(m[1].split('-')[1]) : parseFloat(m[1].replace(',', '.'))
        let u = (m[2] || '').toLowerCase().replace(/^g$/, 'gr').replace('cucchiaini', 'cucchiaino').replace('cucchiai', 'cucchiaio').replace('scatolette', 'scatoletta')
        let n = m[3].replace(/\s*\([^)]*\)/g, '').trim()
        n = n.charAt(0).toUpperCase() + n.slice(1)
        return { q, u, n }
      }
      return { q: 1, u: 'pz', n: str.charAt(0).toUpperCase() + str.slice(1) }
    }
    Object.values(weeklyPlan).forEach(day => {
      Object.values(day.meals || {}).forEach(meal => {
        Object.values(meal || {}).forEach(item => {
          if (!item) return
          item.split('+').forEach(part => {
            const { q, u, n } = parse(part)
            const k = `${n}|${u}`
            if (!list[k]) list[k] = { n, u, q: 0 }
            list[k].q += q
          })
        })
      })
    })
    return Object.values(list).sort((a, b) => a.n.localeCompare(b.n)).map(i => {
      let dq = i.q % 1 !== 0 ? i.q.toFixed(1) : i.q
      let du = i.u
      if (i.q > 1) { if (du === 'cucchiaino') du = 'cucchiaini'; if (du === 'cucchiaio') du = 'cucchiai'; if (du === 'scatoletta') du = 'scatolette' }
      return { id: `${i.n}-${i.u}`, name: i.n, qty: du && du !== 'pz' ? `${dq} ${du}` : `${dq}` }
    })
  }, [weeklyPlan])

  const renderPiano = () => (
    <div style={ss.body} className="space-y-5 pt-1">
      <div className="bg-surface-container-low rounded-xl p-4 flex items-center justify-between border border-outline-variant/20">
        <button type="button" className="text-2xl text-on-surface-variant w-10 h-10 flex items-center justify-center rounded-xl bg-transparent border-0 cursor-pointer hover:bg-surface-container-highest/50 transition-colors font-light" onClick={() => setDayIdx((dayIdx - 1 + 7) % 7)} aria-label="Giorno precedente">‹</button>
        <div className="flex items-center gap-3">
          <span className="font-headline text-lg font-extrabold text-on-surface">{dayName}</span>
          <button type="button" className="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0" onClick={toggleSki}>
            <div
              className="relative w-[30px] h-[17px] rounded-full transition-colors border"
              style={{
                background: dayData.isSkiDay ? 'rgba(198, 191, 255, 0.35)' : C.border,
                borderColor: dayData.isSkiDay ? C.primaryBorder : C.border,
              }}>
              <div
                className="absolute top-[1.5px] w-3 h-3 rounded-full transition-all"
                style={{
                  left: dayData.isSkiDay ? '13px' : '1.5px',
                  background: dayData.isSkiDay ? '#fff' : C.muted,
                }}
              />
            </div>
            <span className={`font-label text-[9px] font-bold uppercase tracking-wider ${dayData.isSkiDay ? 'text-primary' : 'text-on-surface-variant'}`}>Endurance</span>
          </button>
        </div>
        <button type="button" className="text-2xl text-on-surface-variant w-10 h-10 flex items-center justify-center rounded-xl bg-transparent border-0 cursor-pointer hover:bg-surface-container-highest/50 transition-colors font-light" onClick={() => setDayIdx((dayIdx + 1) % 7)} aria-label="Giorno successivo">›</button>
      </div>

      {Object.entries(MEALS_CATS).map(([meal, cats]) => {
        const vis = cats.filter(cat => getOpts(meal, cat, dayData.isSkiDay).length > 0)
        if (!vis.length) return null
        return (
          <div key={meal} className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/15">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant/15">
              <span className="material-symbols-outlined text-tertiary text-xl">restaurant</span>
              <span className="font-label text-xs font-bold uppercase tracking-widest text-on-surface">{meal}</span>
            </div>
            <div className="space-y-3">
              {vis.map(cat => {
                const opts = getOpts(meal, cat, dayData.isSkiDay)
                const val  = dayData.meals?.[meal]?.[cat] || ''
                return (
                  <div key={cat}>
                    <div className="text-[11px] font-semibold text-on-surface-variant mb-1.5 tracking-wide">{cat}</div>
                    <div className="relative">
                      <select
                        className={`w-full rounded-xl py-3 pl-3.5 pr-10 text-sm cursor-pointer appearance-none outline-none transition-all border-2 ${
                          val
                            ? 'bg-primary/10 border-primary/40 text-on-surface font-semibold'
                            : 'bg-surface-container-highest border-outline-variant text-on-surface-variant font-medium'
                        }`}
                        value={val} onChange={e => setSel(meal, cat, e.target.value)}>
                        <option value="">Seleziona...</option>
                        {opts.map((o, i) => <option key={i} value={o}>{o}</option>)}
                      </select>
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${val ? 'text-primary' : 'text-on-surface-variant'}`}>▾</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      <button
        type="button"
        className="w-full rounded-xl py-3.5 px-4 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border-0"
        style={{
          background: 'linear-gradient(135deg, #c6bfff 0%, #8c81fb 100%)',
          color: '#160066',
          boxShadow: '0 4px 16px rgba(198, 191, 255, 0.3)',
        }}
        onClick={randomize}>
        <IcoRandom col="#160066" /> Random
      </button>
      <button
        type="button"
        className="w-full py-3 text-center rounded-xl text-xs font-bold uppercase tracking-widest text-on-surface-variant cursor-pointer border border-outline-variant/30 bg-surface-container-low hover:border-outline-variant/50 transition-colors"
        onClick={resetWeek}>
        Azzera settimana
      </button>
    </div>
  )

  const renderSpesa = () => (
    <div style={ss.body} className="space-y-4 pt-1">
      <p className="text-sm font-medium text-on-surface-variant">{shoppingList.length} articoli · {cart.length} spuntati</p>
      {shoppingList.length === 0 ? (
        <div className="text-center py-12 px-5">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-3 block">shopping_bag</span>
          <p className="text-sm font-semibold text-on-surface">Nessun articolo.</p>
          <p className="text-xs text-on-surface-variant mt-2">Pianifica i pasti per generare la lista.</p>
        </div>
      ) : (
        <>
          {shoppingList.map(({ id, name, qty }) => {
            const checked = cart.includes(id)
            return (
              <button
                type="button"
                key={id}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all active:scale-[0.99] ${
                  checked ? 'bg-surface-container-highest/60 border-outline-variant/20' : 'bg-surface-container-low border-outline-variant/20'
                }`}
                onClick={() => setCart(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id])}>
                <div
                  className="w-[22px] h-[22px] rounded-full flex-shrink-0 flex items-center justify-center border-2"
                  style={{
                    borderColor: checked ? '#8c81fb' : C.hint,
                    background: checked ? '#8c81fb' : 'transparent',
                  }}>
                  {checked && <IcoCheck />}
                </div>
                <span className={`flex-1 text-sm font-medium ${checked ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{name}</span>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${checked ? 'text-on-surface-variant bg-surface-container-highest' : 'text-on-primary bg-primary/20'}`}>{qty}</span>
              </button>
            )
          })}
          {cart.length > 0 && (
            <div className="text-center pt-2">
              <button type="button" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors bg-transparent border-0 cursor-pointer py-2" onClick={() => setCart([])}>svuota spuntati</button>
            </div>
          )}
        </>
      )}
    </div>
  )

  const renderOpzioni = () => (
    <div style={ss.body} className="space-y-5 pt-1">
      <div className="flex p-1 rounded-2xl bg-surface-container-low border border-outline-variant/20">
        <div style={ss.pill(settingsMode === 'normal')} onClick={() => setSettingsMode('normal')}>Normale</div>
        <div style={ss.pill(settingsMode === 'ski')}    onClick={() => setSettingsMode('ski')}>Endurance</div>
      </div>
      {Object.entries(MEALS_CATS).map(([meal, cats]) => (
        <div key={meal} style={ss.card}>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-secondary text-lg">tune</span>
            <span className="font-headline text-base font-bold text-on-surface">{meal}</span>
          </div>
          {cats.map(cat => (
            <div key={cat} className="mb-3 last:mb-0">
              <div className="text-[11px] font-semibold text-on-surface-variant mb-1.5">{cat}</div>
              <textarea style={{ ...ss.inp, resize:'vertical', lineHeight:1.6, minHeight:'72px' }}
                rows={3}
                value={foodOptions[settingsMode]?.[meal]?.[cat] || ''}
                onChange={e => setFoodOptions(p => ({ ...p, [settingsMode]: { ...p[settingsMode], [meal]: { ...p[settingsMode][meal], [cat]: e.target.value } } }))}
                placeholder="Opzioni, una per riga..." />
            </div>
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingBottom: '160px', maxWidth: '448px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={ss.hdr}>
        <div style={ss.eyebrow}>nutrizione · piano</div>
        <div style={ss.title}>Dieta</div>
        <div style={ss.subtitle}>{dayData.isSkiDay ? 'Modalità endurance' : 'Piano nutrizionista'}</div>
      </div>

      {sub === 'piano'   && renderPiano()}
      {sub === 'spesa'   && renderSpesa()}
      {sub === 'opzioni' && renderOpzioni()}
    </div>
  )
}
