import React from 'react'

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
      <button
        type="button"
        onClick={onFabClick}
        aria-label={fabAriaLabel}
        className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center border-2 border-primary/40 bg-primary/15 text-primary shadow-[0_4px_24px_rgba(198,191,255,0.2)] active:scale-[0.96] transition-transform">
        <span className="material-symbols-outlined text-[26px]">add</span>
      </button>
    </div>
  )
}

/** Storico espandibile/collassabile (stesso pattern su tutte le tab Metriche). */
export function CollapsibleHistory({ title, badge, defaultOpen = true, children }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-container-highest/40 transition-colors">
        <span className="material-symbols-outlined text-on-surface-variant text-xl">
          {open ? 'expand_less' : 'expand_more'}
        </span>
        <span className="flex-1 text-sm font-bold uppercase tracking-widest text-on-surface">{title}</span>
        {badge != null && badge !== '' ? (
          <span className="text-xs font-semibold text-on-surface-variant tabular-nums">{badge}</span>
        ) : null}
      </button>
      {open ? <div className="px-4 pb-4 pt-0 border-t border-outline-variant/10">{children}</div> : null}
    </div>
  )
}

/** Modale full-screen / sheet per form Metriche. */
export function MetricheFormModal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
      onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[min(92vh,720px)] flex flex-col bg-surface-container rounded-t-3xl sm:rounded-2xl border border-outline-variant/20 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-outline-variant/15 bg-surface-container">
          <span className="font-headline text-lg font-bold text-on-surface truncate pr-2">{title}</span>
          <button
            type="button"
            aria-label="Chiudi"
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-highest text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 pb-10">{children}</div>
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
