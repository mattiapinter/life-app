import React from 'react'
import { C, ss } from '../constants'

// Placeholder strutturato — pronto da sviluppare
// Struttura prevista:
//   sub-tab: Sessioni | Progretti | Stats
//   Sessioni: log vie scalate (grado, stile, completata sì/no, note)
//   Progetti: via su cui stai lavorando, giri fatti, note
//   Stats: grafici volume per stile (placca/strapiombo), gradi max nel tempo

export default function ScalateSection() {
  return (
    <div>
      <div style={ss.hdr}>
        <div style={ss.eyebrow}>arrampicata · performance</div>
        <div style={ss.title}>Scalate</div>
        <div style={ss.subtitle}>sezione in sviluppo</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'55vh', textAlign:'center', padding:'24px' }}>
        <div style={{ fontSize:'52px', marginBottom:'20px' }}>🧗</div>
        <div style={{ fontSize:'16px', fontWeight:'700', color:C.text, marginBottom:'10px' }}>In arrivo</div>
        <div style={{ fontSize:'13px', color:C.muted, maxWidth:'260px', lineHeight:'1.7' }}>
          Questa sezione registrerà le tue sessioni di arrampicata — vie scalate, gradi, progetti, volume per stile.
        </div>
        <div style={{ marginTop:'24px', fontSize:'11px', color:C.hint, lineHeight:'1.7' }}>
          Previsto:<br />
          Log sessioni · Tracker progetti<br />
          Grafici gradi nel tempo · Volume per stile
        </div>
      </div>
    </div>
  )
}
