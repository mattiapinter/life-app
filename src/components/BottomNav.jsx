import React from 'react'

const SIDE = [
  { id: 'allenamento', icon: 'fitness_center', label: 'Allenamento' },
  { id: 'scalate',     icon: 'landscape',      label: 'Scalate' },
]

const SIDE_R = [
  { id: 'dati',  icon: 'science',    label: 'Dati' },
  { id: 'dieta', icon: 'restaurant', label: 'Dieta' },
]

function SideItem({ tab, active, onTap, bouncing }) {
  const isActive = active === tab.id
  const bounce = bouncing === tab.id
  return (
    <button
      type="button"
      onClick={() => onTap(tab.id)}
      className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 rounded-xl transition-all duration-200 active:scale-[0.97] ${
        isActive ? 'text-primary' : 'text-on-surface-variant/70'
      }`}>
      <span
        className={`material-symbols-outlined text-[22px] ${bounce ? 'nav-bounce' : ''}`}
        style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
        {tab.icon}
      </span>
      <span className={`font-label text-[9px] font-bold uppercase tracking-wider truncate max-w-full px-0.5 ${isActive ? 'text-primary' : 'text-on-surface-variant/80'}`}>
        {tab.label}
      </span>
    </button>
  )
}

export default function BottomNav({ active, onChange }) {
  const [bouncing, setBouncing] = React.useState(null)

  const handleTap = (id) => {
    onChange(id)
    setBouncing(id)
    setTimeout(() => setBouncing(null), 400)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#1c1b1b]/88 backdrop-blur-2xl border-t border-outline-variant/15 shadow-[0_-8px_32px_rgba(0,0,0,0.35)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="relative flex items-end justify-between max-w-lg mx-auto px-1 pt-1 pb-2 min-h-[56px]">
        <div className="flex flex-1 items-end justify-around pb-1">
          {SIDE.map(tab => (
            <SideItem key={tab.id} tab={tab} active={active} onTap={handleTap} bouncing={bouncing} />
          ))}
        </div>

        <div className="relative w-[72px] flex-shrink-0 flex justify-center" style={{ height: '28px' }}>
          <button
            type="button"
            aria-label="Home"
            onClick={() => handleTap('home')}
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[58px] h-[58px] rounded-full kinetic-gradient flex items-center justify-center shadow-[0_8px_28px_rgba(198,191,255,0.35)] border-2 border-primary/50 active:scale-[0.94] transition-transform ${
              active === 'home' ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-[#1c1b1b]' : ''
            }`}>
            <span
              className={`material-symbols-outlined text-[28px] text-[#160066] ${bouncing === 'home' ? 'nav-bounce' : ''}`}
              style={{ fontVariationSettings: active === 'home' ? "'FILL' 1" : "'FILL' 0" }}>
              home
            </span>
          </button>
        </div>

        <div className="flex flex-1 items-end justify-around pb-1">
          {SIDE_R.map(tab => (
            <SideItem key={tab.id} tab={tab} active={active} onTap={handleTap} bouncing={bouncing} />
          ))}
        </div>
      </div>
    </nav>
  )
}
