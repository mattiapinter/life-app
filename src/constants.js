// ── COLORS ────────────────────────────────────────────────────────
export const C = {
  bg: '#111111',
  surface: '#1C1C1C',
  surfaceHover: '#222222',
  border: '#2A2A2A',
  borderMid: '#333333',
  text: '#F0F0F0',
  textSoft: '#CCCCCC',
  muted: '#999999',
  hint: '#555555',

  violet: '#7B6FE8',
  violetLight: '#C4BFEE',
  violetBg: '#1A1730',
  violetBorder: '#3B2F6B',
  violetDim: '#2A2040',

  green: '#4ADE80',
  greenBg: '#0D2016',
  greenBorder: '#1A4228',
  greenLight: '#86EFAC',

  amber: '#FBBF24',
  amberBg: '#1C1500',
  amberBorder: '#3D2E00',
  amberLight: '#FDE68A',

  blue: '#60A5FA',
  blueBg: '#0D1829',
  blueBorder: '#1E3A5F',
  blueLight: '#BFDBFE',

  orange: '#FB923C',
  orangeBg: '#1C0F00',
  orangeBorder: '#3D2000',
  orangeLight: '#FDBA74',

  red: '#F87171',
  redBg: '#1C0A0A',
  redBorder: '#4A1515',
  redLight: '#FCA5A5',
}

// ── SESSION COLORS ─────────────────────────────────────────────────
export const SESSION_COLORS = {
  PALESTRA:                  { bg: C.blueBg,   border: C.blueBorder,   text: C.blue,        label: 'Palestra' },
  PESI:                      { bg: C.violetBg, border: C.violetBorder, text: C.violet,      label: 'Pesi' },
  CORSA:                     { bg: C.orangeBg, border: C.orangeBorder, text: C.orange,      label: 'Corsa' },
  PLACCA_VERTICALE:          { bg: C.greenBg,  border: C.greenBorder,  text: C.green,       label: 'Placca / Verticale' },
  STRAPIOMBO:                { bg: C.greenBg,  border: C.greenBorder,  text: C.green,       label: 'Strapiombo' },
  STRAPIOMBO_TRAZIONI_SETT4: { bg: C.greenBg,  border: C.greenBorder,  text: C.green,       label: 'Strapiombo + Trazioni' },
  DAY_PROJECT:               { bg: C.amberBg,  border: C.amberBorder,  text: C.amber,       label: 'Day Project' },
  REST:                      { bg: '#161616',  border: C.border,       text: C.hint,        label: 'Riposo' },
}

// ── SHARED STYLES ──────────────────────────────────────────────────
export const ss = {
  app:   { minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif" },
  main:  { maxWidth: '448px', margin: '0 auto', minHeight: '100vh', background: C.bg, position: 'relative' },
  hdr:   { background: C.bg, padding: '52px 20px 18px', borderBottom: `1px solid ${C.border}` },
  eyebrow: { fontSize: '10px', fontWeight: '500', color: C.hint, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' },
  title:   { fontSize: '28px', fontWeight: '700', color: C.text, letterSpacing: '-.02em', lineHeight: '1.1' },
  subtitle:{ fontSize: '12px', color: C.muted, marginTop: '5px', fontWeight: '400' },
  body:    { padding: '16px', paddingBottom: '100px' },
  card:    { background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', marginBottom: '12px' },
  secLbl:  { fontSize: '10px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px', paddingBottom: '8px', borderBottom: `1px solid ${C.border}` },
  inp:     { width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: C.text, outline: 'none' },
  bnav:    { position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '50', background: C.bg, borderTop: `1px solid ${C.border}`, padding: '10px 0 20px' },
  bnavInner: { maxWidth: '448px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', alignItems: 'center' },
  bnavItem: (a) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '4px 16px', cursor: 'pointer', opacity: a ? 1 : 0.4 }),
  bnavLabel: (a) => ({ fontSize: '9px', fontWeight: '600', color: a ? C.violet : C.hint, letterSpacing: '.06em', textTransform: 'uppercase' }),
  subBar: { display: 'flex', background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '0 16px', overflowX: 'auto' },
  subTab: (a) => ({ padding: '12px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: a ? C.violetLight : C.muted, borderBottom: a ? `2px solid ${C.violet}` : '2px solid transparent', letterSpacing: '.02em', marginBottom: '-1px', transition: 'color .15s', whiteSpace: 'nowrap' }),
  pill: (a) => ({ flex: '1', padding: '9px', textAlign: 'center', fontSize: '12px', fontWeight: '600', borderRadius: '20px', cursor: 'pointer', userSelect: 'none', background: a ? C.violet : 'transparent', color: a ? '#fff' : C.muted, transition: 'all .2s' }),
  savBtn: { width: '100%', background: C.violet, border: 'none', borderRadius: '12px', padding: '14px', fontSize: '13px', fontWeight: '600', color: '#fff', textAlign: 'center', cursor: 'pointer', marginTop: '4px', userSelect: 'none' },
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
// Solo rotazioni — input da foto/video, nessun campo numerico nell'app
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
export const todayStr = () => new Date().toISOString().split('T')[0]
export const fmtDate  = () => {
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
