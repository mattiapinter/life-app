# Modifiche recenti (changelog sintetico)

Documento di riferimento per le ultime modifiche funzionali alla **life-app**.  
Data di aggiornamento: allineata all’ultimo commit che include questo file.

---

## 1. Scalate — autocomplete nome via nel form nuova sessione

**File:** `src/components/Scalate.jsx`

- Aggiunta la funzione `buildCragRouteHints`: per la **falesia selezionata** vengono considerati tutti i `climbing_sessions` con quel `crag_id` e le **ascents** collegate; si raccolgono i **nomi via** (trim, univoci in modo case-insensitive) e per ciascuno il **grado più recente** in base alla data sessione.
- Il form **Nuova sessione** (`SessionForm`) riceve le props `savedSessions` e `savedAscents` (sia dalla lista falesie sia dal dettaglio falesia).
- Il campo “Nome via” usa un **`<datalist>`** nativo collegato all’`input` (`list=…`), con `fontSize: 16px` e `autoComplete="off"` per un uso più stabile su **iOS**.
- Se il testo coincide con una via già registrata su quella falesia, il **grado** viene aggiornato automaticamente; per vie nuove il grado resta quello scelto dall’utente.

---

## 2. Allenamento — sezione Corsa (dashboard)

**File:** `src/components/Allenamento.jsx`

- Registrato **Legend** di Chart.js (oltre ai controller già usati).
- Aggiunte funzioni di supporto: `runningPaceToSec`, `runningSecToPaceStr`, `runningDateMinusDays`.
- **Tre KPI** in header:
  - **Km totali** nelle ultime **4 settimane** (finestra 28 giorni da oggi);
  - **Passo medio** (mm:ss/km) sulle uscite con `pace_avg` valido nello stesso periodo;
  - **Passo migliore di sempre** (minimo tempo/km tra tutte le uscite con passo valido).
- **Grafico “Passo nel tempo”**: linea del passo (sec/km) su tutte le uscite con passo valido; seconda serie **media mobile a 4 sessioni** (tratteggio); asse Y in secondi/km con **valori più bassi in basso** (= più veloce). Tooltip con formato mm:ss/km.
- **Volume settimanale**: grafico a **barre** (km per settimana, lunedì come inizio settimana), anche con una sola settimana se è l’unica disponibile.
- **Storico**: tabella più **compatta** (data, km, durata, passo, FC, dislivello, RPE, note).

Dati usati: `distance_km`, `pace_avg`, `hr_avg`, `elevation_m`, `duration_min`, `rpe`, `notes` dai running log.

---

## 3. Dati — tab Insights (grafici e testi)

**File:** `src/components/Insights.jsx`

### Aggiunte

- **HRV ultimi 30 giorni**: serie giornaliera + **media mobile 7 giorni**; testo guida su confronto tra punti e trend.
- **Distribuzione allenamento (30 giorni)**: grafico **donut** per tipo di `session_type`; ogni fetta conta i **giorni distinti** in cui è stato registrato almeno un log per quel tipo (deduplica per coppia `log_date` + `session_type`). Colori da `SESSION_COLORS` (`constants.js`).
- **Progressione gradi**: per ogni mese calendario, grado **massimo** tra salite in stile **a vista** o **flash** e **completate**; linea con step; etichette grado su asse Y (scala gradi allineata a `CLIMB_GRADES`).

### Registrazioni Chart.js

- Aggiunti: `DoughnutController`, `ArcElement`, `Legend`.
- Rimossi dall’uso in questo file: `BarController`, `BarElement` (non più necessari).

### Modifiche / rimozioni

- **Readiness vs RPE**: soglia minima per mostrare il grafico portata a **3** sessioni (messaggio aggiornato); nota esplicativa se i punti sono **meno di 8**.
- **Rimossi** i blocchi e i grafici: *Sonno profondo vs volume*, *Readiness vs grado arrampicata* (scatter), *HRR nel tempo*.
- **Mantenuti**: *Readiness vs RPE* (scatter + regressione), *Power to Weight trend* (linea + plugin fasce scarico da piano).

### Testo introduttivo

- Aggiornato il paragrafo di apertura della sezione per riflettere il focus su trend operativi e correlazioni chiave.

---

## File toccati in questo commit

| File | Ruolo |
|------|--------|
| `src/components/Scalate.jsx` | Autocomplete vie + prefill grado |
| `src/components/Allenamento.jsx` | Corsa: KPI, grafici, storico compatto |
| `src/components/Insights.jsx` | Nuovi grafici HRV / donut / gradi; rimozioni varie |
| `MODIFICHE.md` | Questo documento |

---

Per il dettaglio riga-per-riga usare `git show` o il confronto su GitHub dopo il push.
