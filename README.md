# WG Hub Monorepo

Leichtgewichtiges Fullstack-Setup für eine WG-App auf einem Raspberry Pi 3 im lokalen Netzwerk.

Tech-Stack:
- Frontend: React + Vite
- Backend: Node.js + Express
- Datenbank: SQLite
- Deployment: ohne Docker, Backend liefert Frontend-Build statisch aus

## Projektstruktur

```text
skat-wg-hub/
  backend/
	data/
	src/
	  db/
	  routes/
	  services/
	  app.js
	  server.js
	package.json
  frontend/
	src/
	  components/
	  App.jsx
	  main.jsx
	  styles.css
	index.html
	package.json
	vite.config.js
  .gitignore
  package.json
  README.md
```

## Warum jede Datei existiert

- `package.json`: Root-Workspace und zentrale Skripte (`dev`, `build`, `start`) für das gesamte Monorepo.
- `.gitignore`: Ignoriert Abhängigkeiten, Build-Artefakte und lokale SQLite-Dateien.
- `backend/package.json`: Backend-Abhängigkeiten und Skripte (`dev`, `start`).
- `backend/src/server.js`: Startpunkt des Express-Servers auf `0.0.0.0:3000`.
- `backend/src/app.js`: Middleware, CORS, API-Router, Fehlerbehandlung, statische Auslieferung vom Frontend-Build.
- `backend/src/routes/health.js`: Beispiel-Endpunkt `GET /api/health`.
- `backend/src/routes/tasks.js`: CRUD-Endpunkte für Aufgaben.
- `backend/src/routes/residents.js`: CRUD-Endpunkte für Bewohner.
- `backend/src/routes/absences.js`: CRUD-Endpunkte für Abwesenheiten.
- `backend/src/routes/wasteDates.js`: CRUD-Endpunkte für Muelltermine.
- `backend/src/services/healthService.js`: Health-Logik getrennt von der Route.
- `backend/src/services/taskService.js`: Aufgaben-Logik inkl. CRUD-Operationen.
- `backend/src/services/residentService.js`: Bewohner-Logik inkl. CRUD-Operationen.
- `backend/src/services/absenceService.js`: Abwesenheits-Logik inkl. CRUD-Operationen.
- `backend/src/services/wasteDateService.js`: Muelltermin-Logik inkl. CRUD-Operationen.
- `backend/src/db/index.js`: SQLite-Verbindung, Query-Helper, Tabellen, Migration und Seed-Daten.
- `backend/data/.gitkeep`: Hält den Datenordner im Repository, DB-Datei bleibt lokal.
- `frontend/package.json`: Frontend-Abhängigkeiten und Vite-Skripte.
- `frontend/index.html`: Einstiegspunkt für die Vite-App.
- `frontend/vite.config.js`: Vite-Konfiguration inkl. API-Proxy auf das Backend.
- `frontend/src/main.jsx`: React-Bootstrap.
- `frontend/src/App.jsx`: Navigation zwischen Dashboard und Datenbereichen.
- `frontend/src/components/Header.jsx`: App-Header mit Burger-Menu für Unterseiten.
- `frontend/src/components/DashboardCard.jsx`: wiederverwendbare Kartenkomponente.
- `frontend/src/components/DashboardOverview.jsx`: Dashboard mit Live-Daten aus der API.
- `frontend/src/components/ResidentsSection.jsx`: Anzeige der vier festen Bewohner.
- `frontend/src/components/TasksSection.jsx`: Aufgabentypen, Zyklen und Wochenrotation.
- `frontend/src/components/AbsencesSection.jsx`: Anzeige/Erfassung von Abwesenheiten.
- `frontend/src/components/WasteDatesSection.jsx`: Anzeige/Erfassung von Muellterminen.
- `frontend/src/api.js`: leichter Fetch-Helper für API-Aufrufe.
- `frontend/src/styles.css`: Darkmode-Styling für Dashboard, Formulare und Tabellen.

## Schnellstart (lokal)

Voraussetzungen:
- Node.js 20+ empfohlen (Node.js 18 sollte ebenfalls funktionieren)

1. Abhängigkeiten installieren

```powershell
npm install
```

2. Entwicklungsmodus starten (Frontend + Backend parallel)

```powershell
npm run dev
```

Dann erreichbar unter:
- Frontend (Vite): `http://localhost:5173`
- Backend API: `http://localhost:3000/api/health`

## Build + Produktion (Pi / LAN)

1. Frontend bauen

```powershell
npm run build
```

2. Backend starten (liefert Frontend-Build aus)

```powershell
npm run start
```

Im Netzwerk erreichbar unter:
- `http://<pi-ip>:3000`

## Datenmodelle (aktueller Stand)

- `residents`: feste Bewohner (Tomasz, Finn, Nele, Leila)
- `task_types`: Aufgabentypen mit Zyklus (`once`, `weekly`, `monthly`)
- `task_type_residents`: Zuordnung, welche Bewohner pro Aufgabentyp berücksichtigt werden
- `weekly_assignments`: automatisch generierte Wochenzuweisungen mit fairer Rotation
- `absences`: Abwesenheiten (Person/Resident, Zeitraum, Notiz)
- `waste_dates`: Muelltermine (Typ, Datum, Notiz), aktuell als fester Plan für 2026

## API-Endpunkte

- Health
  - `GET /api/health`
- Bewohner
  - `GET /api/residents`
  - `GET /api/residents/:id`
  - `PUT /api/residents/:id`
  - `PATCH /api/residents/:id`
  - `POST /api/residents` (aktuell bewusst blockiert)
  - `DELETE /api/residents/:id` (aktuell bewusst blockiert)
- Aufgabentypen
  - `GET /api/task-types`
  - `GET /api/task-types/:id`
  - `POST /api/task-types`
  - `PUT /api/task-types/:id`
  - `PATCH /api/task-types/:id`
  - `DELETE /api/task-types/:id`
- Wochenzuweisungen
  - `GET /api/weekly-assignments`
  - `POST /api/weekly-assignments/generate`
  - `PATCH /api/weekly-assignments/:id`
- Kalender
  - `GET /api/calendar?year=2026`
- Abwesenheiten
  - `GET /api/absences`
  - `GET /api/absences/:id`
  - `POST /api/absences`
  - `PUT /api/absences/:id`
  - `PATCH /api/absences/:id`
  - `DELETE /api/absences/:id`
- Muelltermine
  - `GET /api/waste-dates`
  - `GET /api/waste-dates/:id`
  - `POST /api/waste-dates`
  - `PUT /api/waste-dates/:id`
  - `PATCH /api/waste-dates/:id`
  - `DELETE /api/waste-dates/:id`

## Hinweise für den naechsten Ausbau

- Muelltermine werden aktuell in `backend/src/db/index.js` als fester Jahresplan gepflegt.
- Die Wochenaufgabe `Müll rausbringen` enthält automatisch den Hinweis auf Strassentermine innerhalb derselben Woche.
- Optional: API für Bulk-Import von Muellabholplan ergaenzen.
- Optional: Uebersteuerung einzelner Wochenzuweisungen (manuelles Tauschen) einbauen.

