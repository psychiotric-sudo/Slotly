# Slotly — College Timetable Planner

A fast, offline-friendly web app for building a weekly college timetable. Add classes visually, get automatic color-coding per course, see scheduling overlaps at a glance, and export your schedule as a **JPG**, a print-ready **PDF**, or an **.ics** file for Google Calendar.

## Features

- **Visual weekly grid** — days shown as columns, time as rows; Mon–Fri always visible plus any day you add classes to.
- **Auto colors** — every block of the same course shares one color; override any course's color manually or tap "A" to go back to auto.
- **Overlap detection** — conflicting classes are flagged with an alert badge on the grid and shown with a red border in exports.
- **Evening-aware** — the grid and exports automatically extend past the configured end hour to cover late classes.
- **Study loads** — add a course across multiple days at once (e.g., Tue & Thu), and edit/delete the whole group.
- **Export** — spreadsheet-style JPG, and a PDF that fills the whole A4 page with narrow margins (cells expand to fit, borders intact).
- **Google Calendar** — export your schedule to an `.ics` file, or import an `.ics` from Google Calendar.
- **Import from Gemini AI** — paste a schedule description (or JSON) and let Gemini build the course list.
- **Backup / restore** — one-click JSON backup export and import.
- **Undo / redo** — Ctrl+Z / Ctrl+Shift+Z.
- **Offline-first** — everything is saved to `localStorage`; no account needed.
- **Responsive** — desktop sidebar, and a mobile view with a FAB action menu (add class, imports, demo, etc.).
- **PWA-ready** — web manifest + icons installed.

## Tech Stack

- [React 18](https://react.dev) + [TypeScript](https://www.typescriptlang.org) + [Vite 6](https://vite.dev)
- [html2canvas](https://html2canvas.hertzen.com) for JPG rendering
- [jsPDF](https://github.com/parallax/jsPDF) for PDF rendering
- No backend — pure client-side app

## Getting Started

```bash
npm install
npm run dev       # start dev server (http://localhost:5173)
npm run build     # type-check + production build into dist/
npm run preview   # preview the production build
```

## Project Structure

```
public/                  # static assets (icons, manifest, robots.txt, sitemap)
src/
  components/            # UI: grid, sidebar, modals, drawers, FAB menu
  hooks/                 # useSchedule (state + persistence), useImporters
  utils/                 # colors, conflicts, time, gcal/ics, persistence
  lib/export.ts          # JPG/PDF export pipeline
  App.tsx                # app shell + wiring
```

## Data & Storage

Everything lives in your browser's `localStorage` under the key `schedule_v1` (schema version `1`), so your schedule persists between visits with no sign-up.

- **Backup** → downloads `schedule-backup.json`.
- **Restore** → imports a backup file (validated against the schema).
- Clearing your browser storage erases your schedule — keep a backup if that matters to you.

## Exporting

- **JPG** — a spreadsheet-style image with a white frame.
- **PDF** — single-page A4 (landscape/portrait chosen automatically). The table is scaled so it fills the paper with a narrow margin — cell sizes expand to fill rather than being shrunk to fit.
- **.ics** — download `slotly-schedule.ics` and import it into Google Calendar to add all classes at once.

## SEO / Search Console / Deployment Checklist

The repo ships with SEO scaffolding pointed at `https://slotly-timetable.vercel.app/`. If you deploy elsewhere, update the domain in:

1. **Set your real domain** — search for `slotly-timetable.vercel.app` and replace it in:
   - `index.html` (canonical, Open Graph, Twitter, JSON-LD)
   - `public/robots.txt`
   - `public/sitemap.xml`
2. **Google Search Console** — add your site, verify it (DNS or HTML file), then paste the provided `<meta name="google-site-verification" ...>` tag into `<head>` of `index.html` (a commented placeholder is already there).
3. **Submit your sitemap** — in Search Console → Sitemaps, submit `https://yourdomain.com/sitemap.xml`.
4. **Open Graph image** — `public/og-image.png` (1200×630) is included; replace it if you want a custom preview card.
5. **PWA** — `public/manifest.webmanifest` + `icon-192.png` / `icon-512.png` / `apple-touch-icon.png` are referenced from `index.html`. Install "Add to Home Screen" works once served over HTTPS.

## License

Private project. All rights reserved unless otherwise stated.
