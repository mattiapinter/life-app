# LIFE — Documentazione completa

> Aggiornata al: 13 aprile 2026
> Ultima sessione di sviluppo: 13 aprile 2026
> Repository: `mattiapinter/life-app` → deploy su `mattiapinter.github.io/life-app/`

---

## Panoramica

LIFE è una web app personale pensata come dashboard di vita quotidiana — allenamento, dieta, scalate, misure corporee, HRV, readiness. È ottimizzata per mobile, supporta l'installazione come PWA su iOS, e sincronizza tutti i dati su Supabase con autenticazione utente. I dati di salute arrivano automaticamente da Apple Health tramite Health Auto Export e n8n. Un bot Telegram manda ogni mattina un messaggio con il readiness e i consigli sull'allenamento del giorno.

---

## Stack tecnico

| Tecnologia | Versione | Ruolo |
|---|---|---|
| React | 18 | UI e state management |
| Vite | 5 | Build tool + dev server |
| Supabase JS | 2 | Database cloud + Auth |
| Chart.js | 4 | Grafici andamento fitness |
| Mapbox GL JS | 3.3.0 | Mappa satellite falesie (sezione Scalate) |
| GitHub Actions | — | Deploy automatico su push main |
| n8n | self-hosted | Automazioni dati Apple Health + Telegram |
| Telegram Bot API | — | Messaggi giornalieri e report settimanale |
| Claude API (Anthropic) | claude-sonnet-4-6 | Generazione testi intelligenti per Telegram |
| Health Auto Export | iOS | Export automatico dati Apple Health verso n8n |

**Struttura file:**
```
src/
├── main.jsx
├── App.jsx                ← navigazione macro/sub + auth + caricamento dati
├── index.css
├── constants.js           ← colori, stili, helpers, definizioni test
├── data/trainingPlan.js   ← dettagli sessioni (warmup, esercizi, note coach)
├── lib/supabase.js        ← tutte le funzioni DB + auth + webhook n8n
└── components/
    ├── Icons.jsx
    ├── UI.jsx             ← Modal, VideoButton, CoachNoteModal, ChangeSessionDrawer
    ├── Login.jsx          ← schermata login/signup
    ├── BottomNav.jsx      ← bottom nav ridisegnato con Home al centro
    ├── Home.jsx           ← dashboard mattutina con readiness, caffeina, sonno
    ├── Dieta.jsx
    ├── Allenamento.jsx    ← allenamento completo + sessioni passate con storico
    ├── PesiRow.jsx
    ├── Scalate.jsx
    ├── Corpo.jsx          ← misure corporee + HRV + test fisici + Insights
    ├── FitnessBenchmark.jsx
    ├── MetricGroupLayout.jsx
    └── Insights.jsx       ← 5 grafici incrociati con consigli scientifici
```

**Deploy:** GitHub Actions automatico su push su `main`. Il build gira in circa 25s. Vercel collegato al repo per preview automatiche delle branch.

---

## Infrastruttura

**Supabase:** progetto `hqibitypbemsxlooeqfo.supabase.co`
**UUID utente Mattia:** `6121e75d-3333-414f-9604-1087a6d601d5`

**n8n:** self-hosted su Hetzner `89.167.27.115:5678`
Accesso SSH: `ssh root@89.167.27.115`
Webhook health data: `http://89.167.27.115:5678/webhook/health-data`
Webhook HRV inserito: `http://89.167.27.115:5678/webhook/hrv-inserted`
API key webhook: `x-api-key: life-app-2026-xyz`

**Telegram:**
Token bot: `8648714791:AAHRarn_7SUzF7JF_DpTzgY8NMb5Jobm34c`
Chat ID Mattia: `992429606`

**Health Auto Export (iPhone):**
Automazione: "Life app Daily"
Orario: ogni mattina alle 07:30
Metriche: Body Mass, Resting Heart Rate, Sleep Analysis
URL: `http://89.167.27.115:5678/webhook/health-data`

---

## Dati utente fissi

Hardcoded in `constants.js`:

```js
USER_HEIGHT = 185   // cm
USER_LEG    = 104.5 // cm
```

---

## Autenticazione

Implementata con **Supabase Auth** (email + password).

- Login persistente — token JWT con refresh automatico
- Schermata `Login.jsx` — saluto "Ciao, Pinter 👋", toggle login/signup
- `App.jsx` gestisce lo stato `user` (undefined = caricamento, null = non loggato, object = loggato)
- Tutti i dati filtrati per `user_id`
- UUID utente: `6121e75d-3333-414f-9604-1087a6d601d5`

---

## Navigazione principale

**Bottom nav** con 5 tab:

| Posizione | Tab | Icona |
|---|---|---|
| Sinistra 1 | Allenamento | fitness_center |
| Sinistra 2 | Scalate | landscape |
| Centro | HOME (cerchio gradiente) | home |
| Destra 1 | Dati | science |
| Destra 2 | Dieta | restaurant |

Home al centro è più grande, in un cerchio con gradiente primary, senza label.

**SubNav interno per ogni tab:**

| Tab | Sotto-tab |
|---|---|
| Home | nessuna |
| Allenamento | Oggi · Piano · Storico · Esercizi · Corsa |
| Scalate | Falesie · Tiri · Progetti · Stats |
| Dieta | Piano · Spesa · Opzioni |
| Dati | Biometria · HRV · Test fisici · Insights |

---

## Sezione: Home (`Home.jsx`)

Dashboard mattutina attiva. Struttura verticale dall'alto al basso:

**1. Banner avviso HRV mancante**
Appare se non è stato inserito l'HRV oggi. Scompare automaticamente dopo l'inserimento. Ha un pulsante che scrolla al widget HRV.

**2. Daily Readiness Score**
Arco SVG semicircolare 0-100 con colore semaforo. Verde sopra 80, giallo 60-79, rosso sotto 60.
Dati letti da `daily_scores` in Supabase (calcolati da n8n).
Breakdown sotto con: HRV oggi vs media 28gg, sonno profondo in minuti, battito a riposo.
Consiglio coach scientifico contestuale.

Testi consiglio:
- Readiness sopra 80: "Sistema nervoso in forma ottimale. Spingi forte oggi (Kiviniemi et al., 2007)."
- Readiness 60-79: "Condizione nella norma. Aspettati RPE soggettivamente più alto (Fullagar et al., 2015)."
- Readiness sotto 60: "Il sistema nervoso non ha recuperato completamente. Riduci il volume (Plews et al., 2013)."

**3. Card Briefing (coach message)**
Card con icona `psychiatry` che mostra il `coach_message` del giorno da `daily_scores`.
Il testo viene generato da Claude API nel workflow n8n Health Auto Export.
Tono da coach diretto, 3-4 frasi dense, max 80 parole, niente emoji, niente saluti.
Adattato alla sessione specifica del giorno e al contesto HRV/sonno.

**4. Allenamento oggi**
Card con sessione pianificata, badge readiness contestuale verde/giallo/rosso (position absolute, top right).

**5. Card caffeina e sonno**
Tre orari calcolati da `daily_scores`:
- Prima tazza: `first_coffee`
- Ultima tazza: `last_coffee` (cap a 14:30, basata su bedtime meno 10 ore)
- Dormi entro: `bedtime` (dinamico basato su sleep_deep medio)
Consiglio sonno da `bedtime_note`.
Basato su Walker 2017 e cronobiologia del sonno.

**6. Card dati stanotte**
Dati dell'ultima notte da `health_logs`.
Mostra: totale, profondo, REM, leggero in minuti.
Ora addormentamento e sveglia.
Barra orizzontale proporzionale alle fasi: profondo viola, REM blu, leggero grigio.

**7. HRV Widget evoluto**
Media 28gg come baseline. Trend ultimi 14 giorni con colorazione per zona. Indicatore direzione ultimi 3 giorni. Inserimento manuale come prima.
Dopo il salvataggio HRV, il webhook n8n non viene più chiamato direttamente dall'app (rimosso per evitare problemi HTTPS/HTTP mixed content). Il trigger ora arriva da Health Auto Export che chiama n8n direttamente server-to-server.

**8. Pasti**
Invariato.

**9. Prossimi allenamenti**
Strip 7 giorni, legge da `training_calendar` su Supabase.

**Props ricevute da App.jsx:**
`weeklyPlan`, `fitSessions`, `setTab`, `setSub`, `sessionNotes`, `hrvLogs`, `onHrvSaved`, `healthLogs`, `dailyScoreToday`, `dailyScores`, `trainingCalendar`

---

## Sezione: Dieta (`Dieta.jsx`)

3 sotto-tab: **Piano · Spesa · Opzioni**

### Piano
Pianificazione pasti giornaliera con navigazione giorno. Toggle Endurance. Menu a tendina per categoria. Pulsante Random. Pulsante Azzera settimana.

### Spesa
Lista della spesa aggregata automaticamente dai pasti della settimana.

### Opzioni
Configurazione pool alimentari per modo Normal/Endurance. Salvate su Supabase.

---

## Sezione: Allenamento (`Allenamento.jsx`)

5 sotto-tab: **Oggi · Piano · Storico · Esercizi · Corsa**

Il piano allenamento viene letto da Supabase (`training_calendar`) invece che dal file statico. `trainingPlan.js` rimane per i dettagli delle sessioni (warmup, esercizi, note coach).

### Sub-tab: Oggi
- Card sessione oggi con badge readiness
- Strip questa settimana
- Card nota coach (collassata di default, espandibile)
- Card ultima volta con questa sessione (carichi storici)
- Rimosso BenchmarkWidget (spostato in Dati)

### Sub-tab: Piano
Calendario 4 settimane letto da Supabase. Sessioni passate cliccabili aprono `PastSessionDetail` con storico dati. Se non ci sono dati permette di registrarli.

### Sub-tab: Storico
Sessioni raggruppate per data+tipo, espandibili. RPE badge colorato. Elimina sessione.

### Sub-tab: Esercizi
Lista esercizi con ultimo peso, grafico andamento.

### Sub-tab: Corsa
Storico uscite con KPI, grafici passo vs FC e volume settimanale.

### Fix navigazione
Quando si apre una sessione e si clicca il SubNav, la sessione si chiude e cambia tab correttamente.

### PesiRow
Propagazione set con feedback visivo verde al blur.

---

## Sezione: Dati (`Corpo.jsx` + `Insights.jsx`)

4 sotto-tab: **Biometria · HRV · Test fisici · Insights**

### Biometria
Misure corporee (peso, circonferenze), grafici sparkline, composizione corporea stimata con Navy Method.

### HRV
Storico HRV con grafico andamento, media 7gg, semaforo stato. Inserimento manuale.

### Test fisici
Form inserimento test benchmark (mobilità + forza). Storico sessioni editabile.

### Insights
5 grafici incrociati, tutti collassabili. Se dati insufficienti rimangono compressi con titolo in tono su tono.

**Grafico 1 — Readiness vs RPE**
Scatter plot. Correlazione tra readiness del giorno e RPE sessione. Linea tendenza colorata verde se correlazione corretta. Basato su Esco e Flatt 2014.

**Grafico 2 — Sonno profondo vs volume settimanale**
Grafico duale. Barre sessioni, linea sonno profondo. Verde sopra 60 min, rosso sotto. Basato su Dattilo et al. 2011.

**Grafico 3 — Power/Weight trend**
Linea P/W nel tempo con annotazioni settimane scarico. Formula: (media tacca_sx e tacca_dx + peso) diviso peso. Soglie: sotto 1.3 rosso, 1.3-1.5 giallo, 1.5-1.7 verde, sopra 1.7 blu. Basato su MacLeod et al. 2007.

**Grafico 4 — Readiness vs grado arrampicata**
Scatter readiness vs grado convertito in indice numerico. Solo prime salite.

**Grafico 5 — HRR trend**
Visibile solo con almeno 3 ascents con `hrr_bpm`. Linea con media mobile 4 sessioni. Basato su Buchheit et al. 2010.

---

## Flusso dati automatico

```
COROS/Fitdays → Apple Health
    ↓
Health Auto Export (iPhone, 07:30)
    ↓
n8n Workflow "Health Auto Export" (webhook /health-data)
    → salva health_logs
    → salva body_measurements
    → legge HRV oggi + media 28gg + training_calendar
    → calcola daily_scores completo (HRV + sonno)
    → upsert daily_scores
    → Claude genera coach_message
    → salva coach_message in daily_scores

Mattia inserisce HRV nell'app
    → salva su Supabase (hrv_logs)
    → NON chiama più webhook n8n (rimosso per mixed content HTTPS/HTTP)
    → il ricalcolo avviene al prossimo export Health Auto Export

App legge daily_scores al caricamento
```

**Nota architetturale:** il webhook `hrv-inserted` è stato rimosso dalla funzione `saveHrvLog` in `supabase.js` perché l'app è su HTTPS (GitHub Pages) e n8n è su HTTP (Hetzner) — il browser bloccava la chiamata per mixed content. Il flusso definitivo è tutto server-to-server tramite Health Auto Export.

---

## daily_scores — struttura e logica di calcolo

```
readiness       — 0-100
                  se HRV e sonno: HRV_score × 0.55 + Sleep_score × 0.45
                  se solo sonno: Sleep_score
                  se solo HRV: HRV_score

HRV_score       = (hrv_oggi / media_hrv_28gg) × 100
                  cappato tra 40 e 120

Sleep_score     = (sleep_deep / 90 × 60) + (sleep_total / 480 × 40)
                  cappato a 100

first_coffee    — sveglia media + 90 minuti (Lovallo et al. 2005)
last_coffee     — bedtime meno 10 ore, cap assoluto a 14:30 (Walker 2017)
bedtime         — sveglia media meno 7.5 ore (5 cicli da 90 min)
                  anticipa di 30 min se sleep_deep medio sotto 60 min
                  anticipa di 45 min se sleep_deep medio sotto 45 min
                  anticipa di 30 min ulteriori se sleep_total sotto 360 min
                  cap minimo 21:00, cap massimo 01:00
bedtime_note    — testo consiglio contestuale
coach_message   — testo generato da Claude, 3-4 frasi, max 80 parole
                  contestuale a HRV, sonno e sessione del giorno
```

**Fasce HRV usate da Claude per coach_message:**
Basate su Kiviniemi 2007, Plews 2013, Fullagar 2015, Flatt 2017, Buchheit 2014. 6 fasce rispetto alla media 28gg. 4 fasce sonno profondo basate su Walker 2017 e Dattilo 2011. Battito a riposo come segnale aggiuntivo.

---

## Bot Telegram — Centro di Controllo

Workflow n8n: `LIFE Bot — Centro di Controllo`
Funziona con **polling ogni minuto** via Schedule Trigger + `getUpdates` manuale (non usa Telegram Trigger perché richiede HTTPS).
Il polling usa `offset=-1` per leggere sempre solo l'ultimo messaggio ricevuto.

**Comandi disponibili:**
- `/piano` — risponde chiedendo di mandare il PDF del piano
- `/status` — legge daily_scores + hrv_logs + training_calendar e manda stato del giorno
- `/report` — placeholder, da implementare
- `/help` — lista comandi
- PDF ricevuto → avvia flusso import piano

**Flusso import piano da PDF (stato: in sviluppo, non ancora funzionante):**
1. Telegram manda il PDF
2. `Parsa aggiornamenti` rileva `type: pdf` e passa il `fileId`
3. `Ottieni URL PDF` — chiama `getFile` su Telegram API
4. `Scarica PDF` — scarica il file (il formato di risposta base64 è ancora da verificare)
5. `Claude legge PDF` — manda il PDF all'API Anthropic con prompt strutturato
6. `Parsa JSON piano` — estrae il JSON dalla risposta Claude
7. `Crea nuovo piano` — inserisce in `training_plans` su Supabase
8. `Prepara calendario` + `Inserisci calendario` — popola `training_calendar`
9. `Disattiva vecchi piani` — PATCH `is_active: false` sui piani precedenti
10. `Conferma piano` — manda messaggio Telegram di conferma

**Problema aperto:** il nodo "Scarica PDF" con `responseFormat: base64` restituisce un campo `data` vuoto. Da verificare esattamente cosa ritorna n8n ispezionando l'output del nodo (aggiungere un Code node di debug tra Scarica PDF e Claude legge PDF per fare `console.log` di `Object.keys(item.json)` e `Object.keys(item.binary || {})`).

**Prompt Claude per import PDF:**
```
Leggi questo piano di allenamento e restituisci SOLO un JSON valido, senza markdown,
senza backtick, senza testo aggiuntivo.
{
  "plan": { "athlete": "nome", "goal": "obiettivo", "duration_weeks": 4, "start_date": "YYYY-MM-DD" },
  "calendar": [{ "week": 1, "day_date": "YYYY-MM-DD", "session_type": "TIPO", "also": null, "scarico": false }]
}
session_type: PESI, PALESTRA, CORSA, PLACCA_VERTICALE, STRAPIOMBO,
STRAPIOMBO_TRAZIONI_SETT4, DAY_PROJECT, REST
```

**Messaggio giornaliero:**
Non più attivo come workflow separato. Il `coach_message` viene generato nel workflow Health Auto Export e salvato in `daily_scores`. L'app lo legge e lo mostra nella card Briefing in Home.

**Report settimanale:**
Workflow archiviato temporaneamente. Da sistemare: trigger arrivava tutti i giorni invece che solo domenica. Da aggiornare per leggere da `daily_scores`.

---

## Tabelle Supabase

```sql
-- Esistenti
weekly_plan
food_options
fitness_sessions
training_logs
session_notes
exercise_videos
running_logs
hrv_logs              -- upsert su (log_date, user_id)
body_measurements     -- upsert su (measured_at, user_id)
user_profiles
crags
climbing_sessions
ascents               -- campi aggiuntivi: notes, quality_stars, hrr_bpm, hr_peak
projects
project_attempts

-- Aggiunte nella sessione 08/04
health_logs           -- dati Apple Health (sonno, battito, peso)
training_plans        -- metadati piano allenamento
training_calendar     -- calendario sessioni (letto da app invece di trainingPlan.js)
daily_scores          -- readiness, caffeina, sonno calcolati da n8n

-- Aggiunta nella sessione 13/04
daily_scores.coach_message  -- colonna text aggiunta con ALTER TABLE
```

**Schema tabelle nuove:**

```sql
create table health_logs (
  id           bigserial primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  log_date     date not null,
  resting_hr   integer,
  sleep_total  integer,
  sleep_deep   integer,
  sleep_rem    integer,
  sleep_light  integer,
  sleep_start  time,
  sleep_end    time,
  source       text default 'health_auto_export',
  created_at   timestamptz default now(),
  unique(log_date, user_id)
);

create table training_plans (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade,
  name            text not null,
  goal            text,
  start_date      date not null,
  duration_weeks  integer,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

create table training_calendar (
  id           bigserial primary key,
  plan_id      integer references training_plans(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  week         integer not null,
  day_date     date not null,
  session_type text not null,
  also         text,
  scarico      boolean default false,
  created_at   timestamptz default now(),
  unique(plan_id, day_date)
);

create table daily_scores (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade,
  score_date      date not null,
  readiness       integer,
  hrv_value       integer,
  hrv_score       numeric,
  sleep_score     numeric,
  sleep_deep      integer,
  sleep_total     integer,
  resting_hr      integer,
  first_coffee    text,
  last_coffee     text,
  bedtime         text,
  bedtime_note    text,
  coach_message   text,
  created_at      timestamptz default now(),
  unique(score_date, user_id)
);

-- Aggiunta colonna coach_message (se tabella già esistente):
ALTER TABLE daily_scores ADD COLUMN IF NOT EXISTS coach_message text;
```

---

## Funzioni `supabase.js`

```js
// Auth
getUser()
onAuthChange(cb)

// Weekly plan
syncPlanToSupabase(weeklyPlan)
loadPlanFromSupabase()

// Food options
syncFoodOptionsToSupabase(foodOptions)
loadFoodOptionsFromSupabase()

// Fitness sessions
saveFitnessSession(session)
loadFitnessSessions()
updateFitnessSession(id, session)
deleteFitnessSession(id)

// Training logs
saveTrainingLog(log)
loadTrainingLogs()
deleteSessionLogs(date, sessionType)
deleteExerciseLogs(exerciseName)
deleteSessionNote(date, sessionType)
deleteAllTrainingData()

// Session notes
saveSessionNote(note)
loadSessionNotes()

// Exercise videos
saveExerciseVideo(exerciseName, url)
loadExerciseVideos()

// Running logs
saveRunningLog(log)
loadRunningLogs()
deleteRunningLog(id)

// HRV logs — salva su Supabase, NON chiama più webhook n8n (rimosso per mixed content)
saveHrvLog(log)
loadHrvLogs()

// Body measurements
saveBodyMeasurement(entry)
loadBodyMeasurements()
deleteBodyMeasurement(id)
updateBodyMeasurement(id, entry)

// Health logs (da Apple Health via n8n)
loadHealthLogs()        // ultimi 30 giorni
loadHealthLogToday()    // record di oggi

// Daily scores (calcolati da n8n)
loadDailyScoreToday()   // record di oggi
loadDailyScores()       // ultimi 30 giorni

// Training plans e calendar
loadActivePlan()
loadTrainingCalendar()

// Crags
loadCrags()
saveCrag(crag)
deleteCrag(id)

// Climbing sessions
loadClimbingSessions()
saveClimbingSession(session)
deleteClimbingSession(id)
fetchWeatherForSession(lat, lng, dateStr)

// Ascents
loadAscents()
saveAscent(ascent)
deleteAscent(id)

// Projects
loadProjects()
saveProject(project)
updateProject(id, updates)

// Project attempts
loadProjectAttempts()
saveProjectAttempt(attempt)

// User profile
loadUserProfile()
saveUserProfile(profile)
```

---

## Piano allenamento (`data/trainingPlan.js`)

Il file rimane intatto per i dettagli delle sessioni (warmup, esercizi, note coach, cooldown). Il calendario è ora su Supabase in `training_calendar`.

Piano attuale: Mesociclo 1 Mar/Apr 2026, 4 settimane, obiettivo adattamento anatomico. Inizio 25/03/2026, fine 25/04/2026.

**Settimana 1** (dal 25/03):
25/03 PESI · 26/03 PALESTRA · 27/03 CORSA · 28/03 REST · 29/03 STRAPIOMBO · 30/03 PESI · 31/03 REST · 01/04 PLACCA_VERTICALE

**Settimana 2** (dal 02/04):
02/04 PALESTRA · 03/04 PESI · 04/04 STRAPIOMBO · 05/04 REST · 06/04 PLACCA_VERTICALE · 07/04 CORSA · 08/04 PLACCA_VERTICALE+PESI · 09/04 CORSA

**Settimana 3** (dal 10/04):
10/04 PALESTRA · 11/04 REST · 12/04 STRAPIOMBO · 13/04 PESI · 14/04 PALESTRA · 15/04 CORSA · 16/04 PLACCA_VERTICALE+PESI · 17/04 CORSA

**Settimana 4 Scarico** (dal 18/04):
18/04 STRAPIOMBO · 19/04 REST · 20/04 PLACCA_VERTICALE+PESI · 21/04 CORSA · 22/04 PALESTRA · 23/04 PESI · 24/04 STRAPIOMBO_TRAZIONI_SETT4 · 25/04 REST

### Tipi sessione

| Tipo | Colore | Descrizione |
|---|---|---|
| `PESI` | Viola | Circuito 1 mobilità + Circuito 2 pesi |
| `PALESTRA` | Blu | Blocchi arrampicata + EMOM trazioni |
| `CORSA` | Arancio | Corsa endurance |
| `PLACCA_VERTICALE` | Verde | Falesia placca verticale |
| `STRAPIOMBO` | Verde | Falesia strapiombo |
| `DAY_PROJECT` | Ambra | Giornata sul progetto |
| `STRAPIOMBO_TRAZIONI_SETT4` | Verde | Variante scarico settimana 4 |
| `REST` | Grigio | Riposo |

---

## Bugs risolti (storico completo)

| Data | Bug | Fix |
|---|---|---|
| 13/04 | Bot Telegram non vedeva messaggi nuovi | `getUpdates` senza offset ritornava sempre gli stessi messaggi vecchi — fix con `offset=-1` per leggere solo l'ultimo |
| 13/04 | Router comandi non instradava correttamente | Condizioni Switch node erano vuote — rifatto con condizioni esplicite su `$json.type` per ogni ramo |
| 13/04 | Code node usava `fetch` non disponibile | n8n non espone `fetch` nei Code node — sostituito con nodi HTTP Request separati |
| 13/04 | Code node usava `require('https')` bloccato | n8n blocca i moduli Node nei Code node — sostituito con nodi HTTP Request separati |
| 13/04 | Code node usava `$helpers` non definito | `$helpers` non esiste nei Code node — sostituito con nodi HTTP Request separati |
| 13/04 | `binaryToBuffer` non supportato | n8n su filesystem-v2 non espone il buffer direttamente — da risolvere verificando il formato output di Scarica PDF |
| 08/04 | Sessioni passate nel Piano non mostravano storico | Aggiunto componente PastSessionDetail |
| 08/04 | SubNav non cambiava tab con sessione aperta | changeSub resetta selectedEntry e showMetrics |
| 08/04 | daily_scores upsert falliva con bad request | Cambiato specifyBody da raw a json in n8n |
| 08/04 | Webhook HRV senza autenticazione | Aggiunta credenziale Header Auth al nodo Webhook |
| 02/04 | hrv_logs 400 Bad Request (upsert) | Mancava UNIQUE constraint su (log_date, user_id) |
| 02/04 | session_notes 400 Bad Request (upsert) | Mancava UNIQUE constraint su (note_date, session_type, user_id) |
| 02/04 | Dati non visibili dopo login | user_id = null su dati precedenti — migrati con UPDATE SQL |
| 27/03 | App non si caricava dopo refactor env vars | Variabili Supabase non aggiunte in GitHub Actions Variables |
| 27/03 | todayStr() restituiva data sbagliata | toISOString() è UTC — fix con ora locale |
| 27/03 | Burger menu inaccessibile su iPhone 15 PWA | Safe area con env(safe-area-inset-top) |
| — | Tastiera iOS chiude l'input | PesiRow estratto come componente standalone |
| — | Video non visibile in PWA | Rilevamento window.navigator.standalone, schema youtube:// |
| — | Sessioni modificate non riflesse in Home | sessionNotes passato come prop, logica badge ambra ovunque |

---

## Design system

**Font:** Inter (body), Manrope (headline)
**Tema:** dark — sfondo `#131313`, surface `#1c1b1b`, accento primario `#c6bfff`

I token colore completi sono in `constants.js` e i colori Tailwind in `index.html`.

**Regole stilistiche globali:**
Mai usare trattini, dash o lineette di nessun tipo in nessun testo dell'app. I consigli scientifici citano sempre autore e anno in modo naturale nel testo.

**Max width:** 448px — centrata, mobile-first
**PWA:** apple-mobile-web-app-capable + status-bar-style black-translucent
**Safe area:** viewport-fit=cover + env(safe-area-inset-top/bottom)

---

## Note operative

- **Deploy:** push su `main` → GitHub Actions fa il resto in circa 30s
- **Variabili d'ambiente GitHub:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_MAPBOX_TOKEN` in Settings → Secrets and variables → Actions → Variables (non Secrets)
- **UUID utente Mattia:** `6121e75d-3333-414f-9604-1087a6d601d5`
- **Anteprima locale:** `npm run dev` → localhost:5173
- **SSH Hetzner:** `ssh root@89.167.27.115`
- **Test webhook n8n:** `curl -X POST http://localhost:5678/webhook-test/NOME -H "Content-Type: application/json" -d '{...}'`
- La versione localStorage è `'2'` — cambiarla a `'3'` pulisce i dati locali al primo avvio

---

## Prossimi sviluppi

| Feature | Priorità | Note |
|---|---|---|
| Bug app da sistemare | Alta | Da definire nella prossima sessione |
| Fix import PDF da Telegram | Media | Il flusso è quasi completo — manca solo capire il formato output del nodo "Scarica PDF" (base64 vuoto). Aggiungere Code node di debug tra Scarica PDF e Claude legge PDF per ispezionare `item.json` e `item.binary` |
| Fix report settimanale Telegram | Media | Trigger arriva tutti i giorni, va impostato solo domenica. Va aggiornato per leggere da daily_scores |
| GIF esercizi automatiche | Media | ExerciseDB open source, sostituisce link video manuali per gli esercizi di palestra |
| Widget iPhone Scriptable | Bassa | Mostra readiness, sessione oggi, HRV nella schermata home iPhone |
| Login multi-utente | Futuro | Struttura già pronta con user_id |
| Notifiche push PWA | Futuro | iOS 16.4+ supporta notifiche da PWA installata |
