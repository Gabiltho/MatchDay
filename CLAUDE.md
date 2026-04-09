# MatchDay — Development Guide

European football results tracking app. No authentication required — public access.

## Stack

| Layer    | Technology           |
|----------|----------------------|
| Frontend | Angular 17 (standalone components) |
| Backend  | .NET 8.0 ASP.NET Core |
| Database | SQLite (embedded, Docker volume) |
| Mobile   | Capacitor 5 (Android APK) |
| CI/CD    | GitHub Actions → GHCR → Docker |
| API      | football-data.org (proxy via backend) |

## Quick Start (dev)

```bash
./start.sh dev                # starts backend + frontend (SQLite auto-created)
```

- Frontend: http://localhost:4200
- Backend API: http://localhost:5000
- Swagger: http://localhost:5000/swagger

## Project Structure

```
MatchDay/
├── backend/           # .NET 8 API
│   ├── src/MatchDay.Api/
│   │   ├── Controllers/   # CompetitionController, TeamController, MatchController, StandingController, FootballDataController
│   │   ├── Data/          # AppDbContext
│   │   ├── Models/        # Entities + DTOs (Competition, Team, Match, Standing)
│   │   ├── Services/      # Business logic + FootballData proxy
│   │   └── Middleware/    # ExceptionHandlingMiddleware
│   ├── Dockerfile
│   └── Dockerfile.dev
├── frontend/          # Angular 17
│   ├── src/app/
│   │   ├── views/         # dashboard, league-dashboard, matches, standings, calendar, global-calendar
│   │   ├── services/      # FootballDataService, StateService
│   │   ├── models/        # TypeScript interfaces
│   │   ├── interceptors/  # Cache dedup + error handling
│   │   └── utils/         # Constants
│   ├── Dockerfile
│   └── Dockerfile.dev
├── .github/workflows/ # CI, deploy
├── docker-compose.yml      # dev
└── docker-compose.prod.yml # prod (port 8087)
```

## Domain Model

- **Competition** — football competition (PL, La Liga, Bundesliga, Serie A, Ligue 1, Champions League)
- **Team** — football team with name, abbreviation, crest, venue
- **Match** — match between two teams (home/away, score, status, matchday)
- **Standing** — league table entry (position, points, W/D/L, goals)

## Leagues Tracked

| Code | Name             | Country  |
|------|------------------|----------|
| PL   | Premier League   | England  |
| PD   | La Liga          | Spain    |
| BL1  | Bundesliga       | Germany  |
| SA   | Serie A          | Italy    |
| FL1  | Ligue 1          | France   |
| CL   | Champions League | Europe   |

## Backend Commands

```bash
cd backend/src/MatchDay.Api
dotnet run                    # dev server
dotnet ef migrations add Name # add migration
dotnet ef database update     # apply migrations
```

## Frontend Commands

```bash
cd frontend
npm install
npm start                     # dev server (proxies /api to localhost:5000)
npm run build:prod            # production build
```

## Deployment

```bash
./start.sh prod               # starts prod containers from GHCR images (port 8087)
./start.sh prod logs          # tail logs
./start.sh prod down          # stop
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ConnectionStrings__DefaultConnection` | SQLite path (`Data Source=/app/data/matchday.db`) |
| `FootballData__ApiKey` | football-data.org API key (free tier) |
| `GITHUB_OWNER` | GitHub username (lowercase) for GHCR pull |

## External API

The app proxies requests to [football-data.org](https://www.football-data.org/) through the backend to:
- Avoid CORS issues
- Cache responses (memory cache with TTL)
- Centralize API key management

Free tier: 10 requests/minute. Register at https://www.football-data.org/client/register