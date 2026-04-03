// ── COLORS ────────────────────────────────────────────────────────
export const C = {
  bg: '#0A0E12',
  surface: '#141B22',
  surfaceHover: '#1A2129',
  border: '#1F2933',
  borderMid: '#2D3748',
  text: '#F7FAFC',
  textSoft: '#E2E8F0',
  muted: '#94A3B8',
  hint: '#475569',

  primary: '#14B8A6',
  primaryLight: '#5EEAD4',
  primaryBg: 'linear-gradient(135deg, rgba(20, 184, 166, 0.08) 0%, rgba(6, 78, 59, 0.08) 100%)',
  primaryBgSolid: '#0D2926',
  primaryBorder: '#134E4A',
  primaryGlow: 'rgba(20, 184, 166, 0.25)',

  violet: '#8B5CF6',
  violetLight: '#C4B5FD',
  violetBg: '#1E1B3C',
  violetBorder: '#4C1D95',
  violetDim: '#2E1065',

  green: '#10B981',
  greenBg: '#064E3B',
  greenBorder: '#065F46',
  greenLight: '#6EE7B7',

  amber: '#F59E0B',
  amberBg: '#451A03',
  amberBorder: '#78350F',
  amberLight: '#FCD34D',

  blue: '#3B82F6',
  blueBg: '#1E3A8A',
  blueBorder: '#1E40AF',
  blueLight: '#93C5FD',

  orange: '#F97316',
  orangeBg: '#431407',
  orangeBorder: '#7C2D12',
  orangeLight: '#FDBA74',

  red: '#EF4444',
  redBg: '#450A0A',
  redBorder: '#7F1D1D',
  redLight: '#FCA5A5',
}

// ── SESSION COLORS ─────────────────────────────────────────────────
export const SESSION_COLORS = {
  PALESTRA:                  { bg: C.blueBg,   border: C.blueBorder,   text: C.blue,   label: 'Palestra' },
  PESI:                      { bg: C.violetBg, border: C.violetBorder, text: C.violet, label: 'Pesi' },
  CORSA:                     { bg: C.orangeBg, border: C.orangeBorder, text: C.orange, label: 'Corsa' },
  PLACCA_VERTICALE:          { bg: C.greenBg,  border: C.greenBorder,  text: C.green,  label: 'Placca / Verticale' },
  STRAPIOMBO:                { bg: C.greenBg,  border: C.greenBorder,  text: C.green,  label: 'Strapiombo' },
  STRAPIOMBO_TRAZIONI_SETT4: { bg: C.greenBg,  border: C.greenBorder,  text: C.green,  label: 'Strapiombo + Trazioni' },
  DAY_PROJECT:               { bg: C.amberBg,  border: C.amberBorder,  text: C.amber,  label: 'Day Project' },
  REST:                      { bg: '#161616',  border: C.border,       text: C.hint,   label: 'Riposo' },
}

// ── SHARED STYLES ──────────────────────────────────────────────────
export const ss = {
  app:   { minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif" },
  main:  { maxWidth: '448px', margin: '0 auto', minHeight: '100vh', background: C.bg, position: 'relative' },

  // FIX: safe area per iPhone 15 Dynamic Island (env safe-area-inset-top = ~59px)
  hdr:   {
    background: C.bg,
    padding: 'calc(env(safe-area-inset-top, 44px) + 20px) 20px 20px',
    borderBottom: `1px solid ${C.border}`,
  },

  eyebrow: { fontSize: '11px', fontWeight: '600', color: C.primary, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '10px' },
  title:   { fontSize: '32px', fontWeight: '800', color: C.text, letterSpacing: '-.025em', lineHeight: '1.1' },
  subtitle:{ fontSize: '13px', color: C.muted, marginTop: '6px', fontWeight: '400', letterSpacing: '-.01em' },
  body:    { padding: '18px', paddingBottom: '120px' },
  card:    {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '18px',
    padding: '18px',
    marginBottom: '14px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  secLbl:  { fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '12px', paddingBottom: '10px', borderBottom: `1px solid ${C.border}` },
  inp:     {
    width: '100%',
    background: C.bg,
    border: `1.5px solid ${C.border}`,
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '14px',
    color: C.text,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },

  // FIX: bottom nav con safe area per home indicator iPhone 15
  bnav:    {
    position: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    zIndex: '50',
    background: 'rgba(10, 14, 18, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: `1px solid ${C.border}`,
    padding: '12px 0',
    paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 8px)',
  },
  bnavInner: { maxWidth: '448px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', alignItems: 'center' },
  bnavItem: (a) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '4px 16px', cursor: 'pointer', opacity: a ? 1 : 0.4 }),
  bnavLabel: (a) => ({ fontSize: '9px', fontWeight: '600', color: a ? C.primary : C.hint, letterSpacing: '.06em', textTransform: 'uppercase' }),
  subBar: { display: 'flex', background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '0 16px', overflowX: 'auto' },
  subTab: (a) => ({
    padding: '14px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    color: a ? C.primaryLight : C.muted,
    borderBottom: a ? `2.5px solid ${C.primary}` : '2.5px solid transparent',
    letterSpacing: '.02em',
    marginBottom: '-1px',
    transition: 'color 0.2s, border-color 0.2s',
    whiteSpace: 'nowrap'
  }),
  pill: (a) => ({
    flex: '1',
    padding: '10px',
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '12px',
    cursor: 'pointer',
    userSelect: 'none',
    background: a ? C.primary : 'transparent',
    color: a ? '#0A0E12' : C.muted,
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    border: a ? 'none' : `1.5px solid ${C.border}`,
  }),
  savBtn: {
    width: '100%',
    background: C.primary,
    border: 'none',
    borderRadius: '14px',
    padding: '16px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#0A0E12',
    textAlign: 'center',
    cursor: 'pointer',
    marginTop: '6px',
    userSelect: 'none',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: `0 4px 14px ${C.primaryGlow}`,
  },
}

// ── CONSTANTS ──────────────────────────────────────────────────────
export const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
export const MEALS_CATS = {
  Colazione: ['Carboidrati', 'Proteine', 'Grassi'],
  Spuntino:  ['Carboidrati', 'Proteine', 'Grassi'],
  Pranzo:    ['Carboidrati', 'Proteine', 'Grassi'],
  Merenda:   ['Carboidrati', 'Proteine', 'Grassi'],
  Cena:      ['Carboidrati', 'Proteine', 'Grassi'],
}
export const INIT_OPTS = {
  normal: { Colazione:{Carboidrati:'',Proteine:'',Grassi:''}, Spuntino:{Carboidrati:'',Proteine:'',Grassi:''}, Pranzo:{Carboidrati:'',Proteine:'',Grassi:''}, Merenda:{Carboidrati:'',Proteine:'',Grassi:''}, Cena:{Carboidrati:'',Proteine:'',Grassi:''} },
  ski:    { Colazione:{Carboidrati:'',Proteine:'',Grassi:''}, Spuntino:{Carboidrati:'',Proteine:'',Grassi:''}, Pranzo:{Carboidrati:'',Proteine:'',Grassi:''}, Merenda:{Carboidrati:'',Proteine:'',Grassi:''}, Cena:{Carboidrati:'',Proteine:'',Grassi:''} },
}

export const MOB_TESTS = [
  { id:'spaccata_piedi',  label:'Spaccata frontale in piedi',  unit:'cm',  desc:'Distanza tra i talloni' },
  { id:'spaccata_seduti', label:'Spaccata frontale da seduti', unit:'cm',  desc:'Distanza tra i talloni' },
  { id:'sit_reach',       label:'Sit and reach',               unit:'cm',  desc:'Negativo se non raggiungi il pavimento' },
  { id:'dorsi_sx',        label:'Dorsiflessione SX',           unit:'cm',  desc:'Distanza punta piede–muro' },
  { id:'dorsi_dx',        label:'Dorsiflessione DX',           unit:'cm',  desc:'Distanza punta piede–muro' },
  { id:'grant_sx',        label:'Grant foot raise SX',         unit:'cm',  desc:'Altezza punto di contatto' },
  { id:'grant_dx',        label:'Grant foot raise DX',         unit:'cm',  desc:'Altezza punto di contatto' },
  { id:'grant_ad_sx',     label:'Grant adattato SX',           unit:'cm',  desc:'Altezza punto di contatto' },
  { id:'grant_ad_dx',     label:'Grant adattato DX',           unit:'cm',  desc:'Altezza punto di contatto' },
]
export const STR_TESTS = [
  { id:'tacca_sx',    label:'Forza tacca 20mm SX',       unit:'kg',       desc:'Tindeq — 6 sec massimale' },
  { id:'tacca_dx',    label:'Forza tacca 20mm DX',       unit:'kg',       desc:'Tindeq — 6 sec massimale' },
  { id:'pinza_sx',    label:'Forza pinza SX',            unit:'kg',       desc:'Tindeq — 6 sec massimale' },
  { id:'pinza_dx',    label:'Forza pinza DX',            unit:'kg',       desc:'Tindeq — 6 sec massimale' },
  { id:'trazione_kg', label:'Forza massimale trazione',  unit:'kg extra', desc:'Carico aggiuntivo singola trazione' },
  { id:'resist_reps', label:'Resistenza tacca 20mm',     unit:'reps',     desc:'7"/3" off a cedimento — Beast' },
]
export const PHOTO_TESTS = [
  { id:'flessione_braccia', label:'Flessione braccia a muro', unit:'°', desc:'Angolo da foto/video' },
  { id:'extra_sx',          label:'Extrarotazione femore SX', unit:'°', desc:'Da foto/video' },
  { id:'extra_dx',          label:'Extrarotazione femore DX', unit:'°', desc:'Da foto/video' },
  { id:'intra_sx',          label:'Intrarotazione femore SX', unit:'°', desc:'Da foto/video' },
  { id:'intra_dx',          label:'Intrarotazione femore DX', unit:'°', desc:'Da foto/video' },
]
export const ALL_TESTS = [...MOB_TESTS, ...STR_TESTS]

export const USER_HEIGHT = 185
export const USER_LEG    = 104.5

// ── HELPERS ────────────────────────────────────────────────────────
export const todayIdx = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 }

// FIX: usava toISOString() che è UTC → alle 23:30 in Italia dava "domani"
// Ora usa ora locale del dispositivo
export const todayStr = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const fmtDate = () => {
  const d = new Date()
  return `${DAYS[todayIdx()]} · ${d.getDate()} ${['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'][d.getMonth()]}`
}
export const fmtDateShort = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()} ${['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'][d.getMonth()]}`
}
export const fmtDayName = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  const names = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']
  return names[d.getDay()]
}
export const extractYoutubeId = (url) => {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}
export const extractLoomId = (url) => {
  if (!url) return null
  const m = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
  return m ? m[1] : null
}
