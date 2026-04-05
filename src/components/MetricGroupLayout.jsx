import React from 'react'

/** FAB + usato in header pagina Dati e in MetricheTabHeader. */
export function MetricheHeaderFab({ onClick, ariaLabel = 'Aggiungi' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/15 text-primary shadow-[0_4px_24px_rgba(198,191,255,0.2)] transition-transform active:scale-[0.96]">
      <span className="material-symbols-outlined text-[26px]">add</span>
    </button>
  )
}

/** Intestazione tab Metriche: contesto (senza ripetere il nome tab della SubNav) + FAB. */
export function MetricheTabHeader({ title, subtitle, onFabClick, fabAriaLabel = 'Aggiungi' }) {
  const hasTitle = title != null && String(title).trim() !== ''
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {hasTitle ? (
          <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">{title}</h2>
        ) : null}
        {subtitle ? (
          <p
            className={
              hasTitle
                ? 'text-sm text-on-surface-variant font-medium mt-1 leading-snug'
                : 'text-base text-on-surface font-medium leading-snug'
            }>
            {subtitle}
          </p>
        ) : null}
      </div>
      <MetricheHeaderFab onClick={onFabClick} ariaLabel={fabAriaLabel} />
    </div>
  )
}

/** Storico espandibile/collassabile (stesso pattern su tutte le tab Metriche). */
export function CollapsibleHistory({ title, badge, defaultOpen = true, children, className = '', titleIcon }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className={`rounded-xl border border-outline-variant/15 bg-surface-container-low overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-surface-container-highest/40">
        <span className="material-symbols-outlined text-on-surface-variant text-xl">
          {open ? 'expand_less' : 'expand_more'}
        </span>
        {titleIcon ? (
          <span className="material-symbols-outlined flex-shrink-0 text-xl text-secondary" aria-hidden>
            {titleIcon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 text-sm font-bold uppercase tracking-widest text-on-surface">{title}</span>
        {badge != null && badge !== '' ? (
          <span className="text-xs font-semibold text-on-surface-variant tabular-nums">{badge}</span>
        ) : null}
      </button>
      {open ? <div className="px-4 pb-4 pt-0 border-t border-outline-variant/10">{children}</div> : null}
    </div>
  )
}

/** Popup centrato come drawer: più piccolo dello schermo, scroll nel contenuto. */
export function MetricheFormModal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/75 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
      style={{
        paddingLeft: 'max(12px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(12px, env(safe-area-inset-right, 0px))',
        paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
      }}
      onClick={onClose}>
      <div
        className="drawer-enter w-full max-w-lg flex min-h-0 flex-col bg-surface-container rounded-2xl border border-outline-variant/20 overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
        style={{
          maxHeight:
            'min(86dvh, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 24px))',
        }}
        onClick={e => e.stopPropagation()}>
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-outline-variant/15 bg-surface-container px-4 py-3">
          <span className="min-w-0 flex-1 truncate pr-2 font-headline text-lg font-bold text-on-surface">{title}</span>
          <button
            type="button"
            aria-label="Chiudi"
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full hover:bg-surface-container-highest text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-4">
          {children}
        </div>
      </div>
    </div>
  )
}

/** Shell comune per schede Metriche (Biometria, HRV, Test fisici, …). */
export function MetricGroupLayout({ icon, eyebrow, title, subtitle, children, className = '' }) {
  return (
    <div className={`px-6 space-y-5 pb-6 ${className}`}>
      <header className="flex items-start gap-3">
        {icon ? (
          <span className="material-symbols-outlined text-primary text-2xl flex-shrink-0 mt-0.5" aria-hidden>
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">{title}</h2>
          {subtitle ? <p className="text-sm text-on-surface-variant font-medium mt-1">{subtitle}</p> : null}
        </div>
      </header>
      {children}
    </div>
  )
}

export function MetricGroupCard({ title, titleRight, children, className = '' }) {
  return (
    <section
      className={`bg-surface-container-low rounded-xl p-5 border border-outline-variant/15 ${className}`}
      aria-label={title || undefined}>
      {(title || titleRight) && (
        <div className="flex justify-between items-start gap-3 mb-4 pb-3 border-b border-outline-variant/10">
          {title ? (
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">{title}</h3>
          ) : (
            <span />
          )}
          {titleRight}
        </div>
      )}
      {children}
    </section>
  )
}
