import React from 'react'

export default function BottomNav({ active, onChange }) {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'allenamento', icon: 'fitness_center', label: 'Allenamento' },
    { id: 'scalate', icon: 'landscape', label: 'Scalate' },
    { id: 'dieta', icon: 'restaurant', label: 'Dieta' },
    { id: 'metriche', icon: 'monitoring', label: 'Metriche' },
  ]

  return (
    <nav className="fixed w-full rounded-t-3xl z-50 bg-[#1c1b1b]/80 backdrop-blur-2xl shadow-[0_-8px_32px_rgba(198,191,255,0.08)]"
      style={{ bottom: 'max(env(safe-area-inset-bottom, 0px), 24px)', paddingBottom: '12px' }}>
      <div className="flex justify-around items-center h-16 px-4 w-full">
        {tabs.map(tab => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center justify-center transition-all duration-300 ${
                isActive ? 'bg-primary/10 rounded-xl px-4 py-1 scale-110' : 'opacity-60'
              }`}>
              <span
                className={`material-symbols-outlined mb-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {tab.icon}
              </span>
              <span
                className={`font-label text-[10px] font-bold uppercase tracking-wider ${
                  isActive ? 'text-primary' : 'text-on-surface-variant'
                }`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
