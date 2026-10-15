# Gastos

A simple, private expense tracker for your phone. *Gastos* means "expenses" in Filipino and Spanish.

Built with [Expo](https://expo.dev) (React Native) and Expo Router. Everything is stored on the
device in SQLite. There is no account, server or sync.

## Features

- **Today** is the landing screen: log an expense in a few seconds (amount, optional note, category). Each one is stored with its date and time.
- **History** groups expenses by day, with a month picker, monthly total, a daily/monthly spending chart, a category breakdown and search across all months.
- **Edit** any expense: change the amount, note, category or date (handy for backfilling), or delete it.
- **Monthly budget** with a progress bar and a per-day allowance for the rest of the month.
- **Recurring expenses** (weekly or monthly) are logged automatically on the due day, including days the app wasn't opened. Tap one to edit it, pause it (resuming never back-logs the paused days) or stop it.
- **Custom categories**: add your own, remove the ones you don't use.
- **Currency**: pick a symbol (or none) in Settings.
- **CSV export** of all expenses as a real `.csv` file you can save, email or open in Excel/Sheets (with a fallback to plain text if file sharing isn't available).
- **Backup and restore**: "Export backup" shares all expenses, categories and recurring items as JSON text; "Restore from backup" pastes it back and only adds what is missing. Android's automatic cloud backup is turned off (`android.allowBackup` in `app.json`), so this is how you move to a new phone.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) on your phone (same Wi-Fi as your computer, or use `npx expo start --tunnel`).

## Project layout

```
src/app/          Screens (Expo Router): index.tsx = Today, history.tsx = History
src/components/   UI pieces, including the edit and settings sheets
src/context/      ExpensesProvider: loads data and exposes add/update/delete
src/lib/          Pure logic (money, dates, grouping, budget, recurrence) and the SQLite layer (db.ts)
```

The database schema is versioned in `src/lib/db.ts` (`migrate`). When you change the schema, bump
`SCHEMA_VERSION` and add a new `version < N` block so existing data is upgraded in place.

## Checks

```bash
npx tsc --noEmit
npx expo lint
npm test
```

`npm test` runs the logic and database tests and needs Node 22.13 or newer (the database tests use `node:sqlite`).

Note: `expo-sqlite` is not set up for the web target, so run the app on a phone or emulator.
