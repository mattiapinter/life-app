export const TRAINING_PLAN = {
  meta: {
    athlete: 'Mattia Brigadoi',
    start_date: '2026-03-25',
    goal: 'Adattamento anatomico',
    duration_weeks: 4,
  },

  coach_notes: {
    general: "Fase di adattamento anatomico: prepara il corpo agli stimoli futuri. Il 90% dell'arrampicata sarà sotto il limite per costruire volume e base. Niente sospensione o fingerboard per ora: massimo tempo sulla roccia.",
    sessions: {
      PALESTRA: "Blocchi singoli di riscaldamento (RPE 4→8, recupero completo). Poi blocchi ripetuti: trova un blocco che chiudi flash con media fatica, ripetilo 4 volte: devi cadere alla 4a. Se arrivi facile era troppo facile, se cadi al 2° era troppo difficile. Finisci con EMOM trazioni e via semplice di defaticamento RPE tra 5 e 6.",
      PESI: "Due circuiti. Circuito 1: mobilità/attivazione, uguale per tutte le settimane. Circuito 2: adattamento anatomico con progressione tra settimane: da 1 a 2 aumentano le reps a parità di carico, da 2 a 3 aumenta il carico. Recupero 20s tra esercizi, 3 min a fine giro. Tempi 3, 2, 2: fase negativa, fermo, fase positiva. La fase negativa è quella in cui allunghi il muscolo (es. discesa nello squat). RPE target: 8.",
      CORSA: "Easy run Z2/Z3 bassa. Test della chiacchiera: devi poter parlare senza affanno durante tutta la corsa. Quando finisci devi sentirti rinvigorito, quasi fresco, non stanco.",
      PLACCA_VERTICALE: "Vie doppie: scala da primo senza fermarti fino in catena, fatti calare, rifai subito da secondo. Al 2° giro devi cadere nella seconda metà o chiudere con fatica estrema (RPE 9 e 10). Recupero ~15 min tra le vie. Per vie nuove: circa 1 o 1.5 gradi sotto il tuo limite a vista. Per vie già conosciute puoi salire fino al limite.",
      STRAPIOMBO: "Stessa struttura delle vie doppie in placca. I gradi sono ancora più indicativi: hai poca esperienza su strapiombo. Regolati sull'intensità richiesta (cadere nella seconda metà al 2° giro), non sul numero del grado.",
      STRAPIOMBO_TRAZIONI_SETT4: "Settimana 4 speciale: usa la struttura della tabella BLU (blocchi palestra) poi aggiungi l'EMOM trazioni come da tabella settimana 4.",
      DAY_PROJECT: "Solo settimana 2 e 3. Una via che credi di chiudere in giornata, max 3 giri completi con recupero completo. Prima: via di scaldo + via di attivazione RPE 8. Dopo: via di defaticamento. Gradi super indicativi. Solo sett. 2: aggiungi EMOM trazioni a casa.",
      REST: "Giorno di riposo. Nessuna attività fisica. Il recupero è parte dell'allenamento.",
    },
  },

  calendar: [
    // SETTIMANA 1: inizia mercoledì 25/03
    { week:1, day_date:'2026-03-25', session_type:'PESI' },
    { week:1, day_date:'2026-03-26', session_type:'PALESTRA' },
    { week:1, day_date:'2026-03-27', session_type:'CORSA' },
    { week:1, day_date:'2026-03-28', session_type:'REST' },
    { week:1, day_date:'2026-03-29', session_type:'STRAPIOMBO' },
    { week:1, day_date:'2026-03-30', session_type:'PESI' },
    { week:1, day_date:'2026-03-31', session_type:'REST' },
    { week:1, day_date:'2026-04-01', session_type:'PLACCA_VERTICALE' },

    // SETTIMANA 2: inizia giovedì 02/04
    { week:2, day_date:'2026-04-02', session_type:'PALESTRA' },
    { week:2, day_date:'2026-04-03', session_type:'PESI' },
    { week:2, day_date:'2026-04-04', session_type:'STRAPIOMBO' },
    { week:2, day_date:'2026-04-05', session_type:'REST' },
    { week:2, day_date:'2026-04-06', session_type:'PLACCA_VERTICALE' },
    { week:2, day_date:'2026-04-07', session_type:'CORSA' },
    { week:2, day_date:'2026-04-08', session_type:'PLACCA_VERTICALE', also:'PESI' },
    { week:2, day_date:'2026-04-09', session_type:'CORSA' },

    // SETTIMANA 3: inizia venerdì 10/04
    { week:3, day_date:'2026-04-10', session_type:'PALESTRA' },
    { week:3, day_date:'2026-04-11', session_type:'REST' },
    { week:3, day_date:'2026-04-12', session_type:'STRAPIOMBO' },
    { week:3, day_date:'2026-04-13', session_type:'PESI' },
    { week:3, day_date:'2026-04-14', session_type:'PALESTRA' },
    { week:3, day_date:'2026-04-15', session_type:'CORSA' },
    { week:3, day_date:'2026-04-16', session_type:'PLACCA_VERTICALE', also:'PESI' },
    { week:3, day_date:'2026-04-17', session_type:'CORSA' },

    // SETTIMANA 4 SCARICO: inizia sabato 18/04
    { week:4, day_date:'2026-04-18', session_type:'STRAPIOMBO',              scarico:true },
    { week:4, day_date:'2026-04-19', session_type:'REST',                    scarico:true },
    { week:4, day_date:'2026-04-20', session_type:'PLACCA_VERTICALE', also:'PESI', scarico:true },
    { week:4, day_date:'2026-04-21', session_type:'CORSA',                   scarico:true },
    { week:4, day_date:'2026-04-22', session_type:'PALESTRA',                scarico:true },
    { week:4, day_date:'2026-04-23', session_type:'PESI',                    scarico:true },
    { week:4, day_date:'2026-04-24', session_type:'STRAPIOMBO_TRAZIONI_SETT4', scarico:true },
    { week:4, day_date:'2026-04-25', session_type:'REST',                    scarico:true },
  ],

  sessions: {
    PALESTRA: {
      blocks_working: [
        { week:1, sets:2, reps:4, rest_min:5 },
        { week:2, sets:3, reps:4, rest_min:5 },
        { week:3, sets:3, reps:4, rest_min:5 },
        { week:4, sets:4, reps:4, rest_min:5 },
      ],
      pullups_emom: [
        { week:1, duration_min:10, reps:2 },
        { week:2, duration_min:12, reps:2 },
        { week:3, duration_min:9,  reps:3 },
        { week:4, duration_min:7,  reps:3 },
      ],
    },
    PESI: {
      circuit_1: [
        { name:'Palo press MOD con elastico 5kg',                   sets:2, duration:'30s x lato' },
        { name:'Dorsiflessione caviglie in cavaliere elastico 5kg',  sets:1, duration:'1 min x lato' },
        { name:'Spine cars',                                         sets:1, reps:6 },
        { name:'Lift of',                                            sets:1, duration:'15s x lato', rest:'1 min' },
      ],
      circuit_2: [
        { name:'Goblet squat',        tempo:'3-2-2', bodyweight:false, weeks:[{week:1,sets:2,reps:12,rpe:8},{week:2,sets:3,reps:9,rpe:8},{week:3,sets:3,reps:7,rpe:8},{week:4,sets:2,reps:7,rpe:8}] },
        { name:'Panca piana bilanciere', tempo:'3-2-2', bodyweight:false, weeks:[{week:1,sets:2,reps:12,rpe:8},{week:2,sets:3,reps:9,rpe:8},{week:3,sets:3,reps:7,rpe:8},{week:4,sets:2,reps:7,rpe:8}] },
        { name:'Crunch libretto',     tempo:'3-2-2', bodyweight:true,  weeks:[{week:1,sets:2,reps:12},{week:2,sets:3,reps:10},{week:3,sets:3,reps:12},{week:4,sets:2,reps:12}] },
        { name:'Stacco da terra',     tempo:'3-0-2', bodyweight:false, weeks:[{week:1,sets:2,reps:12,rpe:8},{week:2,sets:3,reps:9,rpe:8},{week:3,sets:3,reps:7,rpe:8},{week:4,sets:2,reps:7,rpe:8}] },
        { name:'Rematore manubri',    tempo:'3-2-2', bodyweight:false, weeks:[{week:1,sets:2,reps:12,rpe:8},{week:2,sets:3,reps:9,rpe:8},{week:3,sets:3,reps:7,rpe:8},{week:4,sets:2,reps:7,rpe:8}] },
        { name:'Arch body',           tempo:'3-2-2', bodyweight:true,  weeks:[{week:1,sets:2,reps:12},{week:2,sets:3,reps:10},{week:3,sets:3,reps:12},{week:4,sets:2,reps:12}] },
      ],
    },
    CORSA: {
      weeks: [
        { week:1, duration_min:30, zone:'Z2/Z3' },
        { week:2, duration_min:20, zone:'Z2' },
        { week:3, duration_min:30, zone:'Z2' },
        { week:4, duration_min:40, zone:'Z2' },
      ],
    },
    PLACCA_VERTICALE: {
      weeks: [
        { week:1, double_routes:2 },
        { week:2, double_routes:2 },
        { week:3, double_routes:3 },
        { week:4, double_routes:2 },
      ],
    },
    STRAPIOMBO: {
      weeks: [
        { week:1, double_routes:2 },
        { week:2, double_routes:2 },
        { week:3, double_routes:3 },
        { week:4, double_routes:2 },
      ],
    },
    DAY_PROJECT: { available_weeks:[2,3] },
    STRAPIOMBO_TRAZIONI_SETT4: {},
    REST: {},
  },

  warmup_1: {
    duration_min: 20,
    exercises: [
      { name:'T-raise',                        sets:1, duration:'45s',         note:'Lento e controllato' },
      { name:'Ponte',                           sets:1, duration:'45s',         note:'Lento e controllato' },
      { name:'Push up gamba in abduzione',      sets:1, duration:'45s',         note:'Lento e controllato' },
      { name:'Underswitch',                     sets:1, reps:'6 x lato',        note:'Lento e controllato' },
      { name:'Piramide',                        sets:1, duration:'45s',         note:'Lento e controllato' },
      { name:'Cavaliere',                       sets:1, duration:'45s',         note:'Lento e controllato' },
      { name:'Plank frontale',                  sets:1, duration:'30s',         note:'Retroversione del bacino' },
      { name:'Plank obliquo',                   sets:1, duration:'30s x lato',  note:'Talloni, anche e spalle in linea' },
      { name:'Riscaldamento al trave',          sets:1, duration:'10 min',      note:'Vedi dettaglio trave sotto' },
    ],
    trave: [
      { grip:'Tacca 20mm',                          protocol:'10"/50"', exercise:'Pallof Press MOD DX, elastico 5kg',      load:'scarico 20% BW' },
      { grip:'Tacca 20mm',                          protocol:'10"/50"', exercise:'Pallof Press MOD SX, elastico 5kg',      load:'scarico 20% BW' },
      { grip:'Tacca 20mm',                          protocol:'10"/50"', exercise:'Curl bicipiti, elastico 15kg',            load:'scarico 20% BW' },
      { grip:'Tacca 45/50mm 3 dita',               protocol:'10"/50"', exercise:'French press tricipiti, elastico 15kg',  load:'scarico 20% BW' },
      { grip:'Tacca 45/50mm 3 dita',               protocol:'10"/50"', exercise:'Spinte in alto spalle, elastico 15kg',   load:'scarico 20% BW' },
      { grip:'Tacca 45/50mm 3 dita',               protocol:'10"/50"', exercise:'Pull down dorsali, elastico 15kg',       load:'scarico 20% BW' },
      { grip:'Bidito 45/50mm anulare+medio',        protocol:'10"/50"', exercise:'Spinte avanti pettorali, elastico 15kg', load:'scarico 50% BW' },
      { grip:'Bidito 45/50mm medio+indice',         protocol:'10"/50"', exercise:'Trazioni orizzontali',                   load:'scarico 50% BW' },
      { grip:'Tacca 15mm anulare+medio half crimp', protocol:'10"/50"', exercise:'Nulla',                                  load:'scarico 80% BW' },
      { grip:'Tacca 15mm medio+indice half crimp',  protocol:'10"',     exercise:'Nulla',                                  load:'scarico 80% BW' },
    ],
  },

  warmup_2: {
    duration_min: 23,
    exercises: [
      { name:'Shake',                              duration:'1-2 min',     note:'Sul sentiero, avvicinandoti alla falesia' },
      { name:'Flessioni/estensioni polsi e dita',  duration:'2-3 min' },
      { name:'Decoaptazione dita',                 duration:'2 min',       note:'2-3 tirate per dito' },
      { name:'Circonduzione spalle',               sets:1, duration:'1 min x lato', note:'Lento e controllato' },
      { name:'Air squat',                          sets:1, duration:'1 min' },
      { name:'Torsioni busto',                     sets:1, duration:'1 min', note:'Lento e controllato' },
      { name:'Flessioni laterali alternate busto', sets:1, duration:'1 min', note:'Lento e controllato' },
      { name:'Curl loop band',                     sets:1, reps:12 },
      { name:'French press elastico',              sets:1, reps:12 },
      { name:'Trazioni orizzontali elastico',      sets:1, reps:12 },
      { name:'Spinte avanti elastico',             sets:1, reps:12 },
      { name:'Plank sui polsi',                    sets:1, duration:'30s',  note:'Retroversione bacino' },
      { name:'Spider plank',                       sets:1, duration:'30s',  note:'Retroversione bacino' },
      { name:'Travetto 20mm half crimp',           sets:6, protocol:'4" ON / 3" OFF', load:'50% BW', rest_after:'3-5 min' },
      { name:'Travetto 20mm half crimp',           sets:4, protocol:'4" ON / 3" OFF', load:'70% BW', rest_after:'3-5 min' },
      { name:'Travetto 20mm half crimp',           sets:2, protocol:'5" ON / 3" OFF', load:'80% BW' },
    ],
  },

  cooldown: {
    duration_min: 15,
    exercises: [
      { name:'Divaricata frontale',                        sets:1, duration:'2 min' },
      { name:'Allungamento emilati al rack',               sets:1, duration:'30s x lato' },
      { name:'Estensione braccia dietro la schiena',       sets:1, duration:'30s' },
      { name:'Glutei',                                     sets:1, duration:'30s x lato' },
      { name:'Quadrupedia flessione polsi',                sets:1, duration:'1 min' },
      { name:'Cavaliere gamba SX avanti',                  sets:1, duration:'30s psoas + 30s quadricipite' },
      { name:'Cavaliere gamba DX avanti',                  sets:1, duration:'30s psoas + 30s quadricipite' },
      { name:'Cobra pose',                                 sets:1, duration:'30s' },
      { name:'Child pose',                                 sets:1, duration:'30s' },
      { name:'Tricipiti',                                  sets:1, duration:'30s x lato' },
      { name:'Gran pettorale al palo',                     sets:1, duration:'30s x lato' },
    ],
  },
}

export const getTodayCalEntry = () => {
  const today = new Date().toISOString().split('T')[0]
  return TRAINING_PLAN.calendar.find(e => e.day_date === today) || null
}
