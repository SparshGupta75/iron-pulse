# IronPulse

An offline-first workout tracker PWA: routines, live set logging, rest timers, personal records and progress charts. All data stays on your device (IndexedDB).

## Features

- **Home** – feed of finished workouts, weekly training strip and week streak
- **Workout** – start an empty workout or a routine; routines grouped in folders
- **Logger** – set table with previous values, warm-up / failure / drop sets, per-exercise rest timer, supersets, RPE, plate calculator, live record medals; survives reloads and can be minimised
- **Profile** – 12-week duration / volume / reps chart, statistics, exercise library, body measures, calendar
- **Exercise pages** – demo photos, how-to steps, progress charts, personal records, best weight per rep count
- **Extras** – edit past workouts, timed/distance exercises, drag-to-reorder, share-card image, weekly/monthly reports, calendar reminders
- **Import** – bring in workout history from a CSV export (Settings)

## Develop

```bash
npm install
npm run dev
```

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `dist/`.
In the repository settings, set **Pages → Source** to **GitHub Actions**.

## Install on your phone

Open the published URL, then:

- **iPhone (Safari)** – Share → *Add to Home Screen*
- **Android (Chrome)** – menu → *Install app*

Data is stored per browser and per URL; use Settings to export a backup before clearing site data.

## Credits

Exercise photos and instructions come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain, Unlicense).
