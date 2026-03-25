# LIFE App

App personale per tracciare allenamento, dieta e performance.

## Stack
- React 18 + Vite
- Supabase (database)
- Chart.js (grafici)
- GitHub Pages (deploy)

## Setup locale

```bash
npm install
npm run dev
```

## Deploy su GitHub Pages

```bash
npm run build
```

Poi carica la cartella `dist/` su GitHub Pages, oppure usa GitHub Actions (vedi sotto).

### GitHub Actions (deploy automatico)

Crea il file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Con questo file, ogni push su `main` fa il build e deploy automatico. Zero lavoro manuale.

## Struttura file

```
src/
├── main.jsx              ← entry point
├── App.jsx               ← root, navbar, routing tra tab
├── index.css             ← stili globali
├── constants.js          ← colori, stili, helpers condivisi
├── data/
│   └── trainingPlan.js   ← piano allenamento completo (4 settimane)
├── lib/
│   └── supabase.js       ← tutte le funzioni DB
└── components/
    ├── Icons.jsx          ← icone SVG
    ├── UI.jsx             ← componenti condivisi (Modal, VideoButton, ecc.)
    ├── Home.jsx           ← schermata home
    ├── Dieta.jsx          ← sezione dieta
    ├── Allenamento.jsx    ← sezione allenamento + test benchmark
    └── Scalate.jsx        ← sezione arrampicata (placeholder)
```

## Supabase — tabelle necessarie

Esegui questo SQL nella tua dashboard Supabase:

```sql
-- già esistenti
-- weekly_plan, food_options, fitness_sessions

-- nuove da creare
create table training_logs (
  id           bigserial primary key,
  log_date     date,
  session_type text,
  exercise_name text,
  sets_done    int,
  reps_done    int,
  weight_kg    numeric,
  rpe_actual   int,
  notes        text,
  created_at   timestamptz default now()
);

create table session_notes (
  id           bigserial primary key,
  note_date    date,
  session_type text,
  note_text    text,
  original_session text,
  created_at   timestamptz default now(),
  unique(note_date, session_type)
);

create table exercise_videos (
  id            bigserial primary key,
  exercise_name text unique,
  video_url     text,
  updated_at    timestamptz default now()
);
```

## Aggiornare il piano allenamento

Quando il coach manda un nuovo piano:
1. Converti il PDF in JSON (chiedi a Claude)
2. Sostituisci il contenuto di `src/data/trainingPlan.js`
3. Push su GitHub → deploy automatico

I log storici in `training_logs` non vengono mai toccati.
