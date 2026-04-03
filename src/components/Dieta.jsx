import React from 'react'
import { C, ss, DAYS, MEALS_CATS, todayIdx, fmtDate } from '../constants'
import { IcoCheck, IcoRandom } from './Icons'

export default function DietaSection({ initialSub, onSubChange, weeklyPlan, setWeeklyPlan, foodOptions, setFoodOptions, syncing }) {
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
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 20px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:'22px', color:C.muted, padding:'4px 8px', cursor:'pointer', userSelect:'none', fontWeight:'300' }} onClick={() => setDayIdx((dayIdx - 1 + 7) % 7)}>‹</div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ fontSize:'15px', fontWeight:'600', color:C.text }}>{dayName}</div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer' }} onClick={toggleSki}>
            <div style={{ width:'30px', height:'17px', borderRadius:'9px', background: dayData.isSkiDay ? C.violet : C.border, position:'relative', transition:'background .2s', border:`1px solid ${dayData.isSkiDay ? C.violetBorder : '#333'}` }}>
              <div style={{ position:'absolute', top:'1.5px', left: dayData.isSkiDay ? '13px' : '1.5px', width:'12px', height:'12px', borderRadius:'50%', background: dayData.isSkiDay ? '#fff' : C.muted, transition:'left .18s' }} />
            </div>
            <div style={{ fontSize:'9px', fontWeight:'600', letterSpacing:'.06em', color: dayData.isSkiDay ? C.violetLight : C.hint, textTransform:'uppercase' }}>Endurance</div>
          </div>
        </div>
        <div style={{ fontSize:'22px', color:C.muted, padding:'4px 8px', cursor:'pointer', userSelect:'none', fontWeight:'300' }} onClick={() => setDayIdx((dayIdx + 1) % 7)}>›</div>
      </div>
      <div style={ss.body}>
        {Object.entries(MEALS_CATS).map(([meal, cats]) => {
          const vis = cats.filter(cat => getOpts(meal, cat, dayData.isSkiDay).length > 0)
          if (!vis.length) return null
          return (
            <div key={meal} style={{ marginBottom:'22px' }}>
              <div style={{ fontSize:'11px', fontWeight:'600', color:C.muted, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'10px', paddingBottom:'8px', borderBottom:`1px solid ${C.border}` }}>{meal}</div>
              {vis.map(cat => {
                const opts = getOpts(meal, cat, dayData.isSkiDay)
                const val  = dayData.meals?.[meal]?.[cat] || ''
                return (
                  <div key={cat} style={{ marginBottom:'10px' }}>
                    <div style={{ fontSize:'10px', color:C.hint, fontWeight:'500', marginBottom:'5px', letterSpacing:'.03em' }}>{cat}</div>
                    <div style={{ position:'relative' }}>
                      <select style={{ width:'100%', background: val ? C.violetBg : C.surface, border:`1px solid ${val ? C.violetBorder : C.border}`, borderRadius:'10px', padding:'11px 32px 11px 13px', fontSize:'13px', color: val ? C.violetLight : C.muted, fontWeight: val ? '500' : '400', cursor:'pointer', appearance:'none', outline:'none', lineHeight:'1.3' }}
                        value={val} onChange={e => setSel(meal, cat, e.target.value)}>
                        <option value="">Seleziona...</option>
                        {opts.map((o, i) => <option key={i} value={o}>{o}</option>)}
                      </select>
                      <div style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'10px', color: val ? C.violet : C.hint, pointerEvents:'none' }}>▾</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
        <div style={{ width:'100%', background:C.violetBg, border:`1px solid ${C.violetBorder}`, borderRadius:'12px', padding:'13px', fontSize:'13px', fontWeight:'600', color:C.violetLight, textAlign:'center', cursor:'pointer', userSelect:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }} onClick={randomize}>
          <IcoRandom /> Random
        </div>
        <div style={{ marginTop:'8px', padding:'10px', textAlign:'center', borderRadius:'10px', cursor:'pointer', fontSize:'11px', fontWeight:'600', color:C.hint, background:C.surface, border:`1px solid ${C.border}`, userSelect:'none' }}
          onClick={resetWeek}>
          Azzera settimana
        </div>
      </div>
    </div>
  )

  const renderSpesa = () => (
    <div style={ss.body}>
      <div style={{ fontSize:'12px', color:C.muted, marginBottom:'16px' }}>{shoppingList.length} articoli · {cart.length} spuntati</div>
      {shoppingList.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px' }}>
          <div style={{ fontSize:'14px', color:C.muted }}>Nessun articolo.</div>
          <div style={{ fontSize:'11px', color:C.hint, marginTop:'8px' }}>Pianifica i pasti per generare la lista.</div>
        </div>
      ) : (
        <>
          {shoppingList.map(({ id, name, qty }) => {
            const checked = cart.includes(id)
            return (
              <div key={id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', background: checked ? C.surfaceHover : C.surface, borderRadius:'12px', marginBottom:'6px', cursor:'pointer', border:`1px solid ${C.border}` }}
                onClick={() => setCart(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id])}>
                <div style={{ width:'22px', height:'22px', borderRadius:'50%', flexShrink:0, border:`2px solid ${checked ? C.violet : C.hint}`, background: checked ? C.violet : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {checked && <IcoCheck />}
                </div>
                <div style={{ flex:1, fontSize:'13px', fontWeight:'500', color: checked ? C.hint : C.text, textDecoration: checked ? 'line-through' : 'none' }}>{name}</div>
                <div style={{ fontSize:'11px', fontWeight:'600', padding:'3px 9px', borderRadius:'6px', background: checked ? C.surface : C.violetDim, color: checked ? C.hint : C.violetLight }}>{qty}</div>
              </div>
            )
          })}
          {cart.length > 0 && <div style={{ textAlign:'center', marginTop:'16px' }}><div style={{ fontSize:'10px', color:C.hint, cursor:'pointer', padding:'8px' }} onClick={() => setCart([])}>svuota spuntati</div></div>}
        </>
      )}
    </div>
  )

  const renderOpzioni = () => (
    <div style={ss.body}>
      <div style={{ display:'flex', background:C.surface, border:`1px solid ${C.border}`, borderRadius:'24px', padding:'4px', marginBottom:'20px' }}>
        <div style={ss.pill(settingsMode === 'normal')} onClick={() => setSettingsMode('normal')}>Normale</div>
        <div style={ss.pill(settingsMode === 'ski')}    onClick={() => setSettingsMode('ski')}>Endurance</div>
      </div>
      {Object.entries(MEALS_CATS).map(([meal, cats]) => (
        <div key={meal} style={ss.card}>
          <div style={{ fontSize:'14px', fontWeight:'600', color:C.text, marginBottom:'12px' }}>{meal}</div>
          {cats.map(cat => (
            <div key={cat} style={{ marginBottom:'10px' }}>
              <div style={{ fontSize:'10px', color:C.hint, fontWeight:'500', marginBottom:'5px', letterSpacing:'.03em' }}>{cat}</div>
              <textarea style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:'8px', padding:'10px 12px', fontSize:'12px', color:C.text, resize:'vertical', outline:'none', lineHeight:'1.6' }}
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
    <div>
      <div style={ss.hdr}>
        <div style={ss.eyebrow}>{fmtDate()}{syncing ? ' · sync...' : ' · sincronizzato'}</div>
        <div style={ss.title}>Dieta</div>
        <div style={ss.subtitle}>{dayData.isSkiDay ? 'modalità endurance' : 'piano nutrizionista'}</div>
      </div>

      {sub === 'piano'   && renderPiano()}
      {sub === 'spesa'   && renderSpesa()}
      {sub === 'opzioni' && renderOpzioni()}
    </div>
  )
}
