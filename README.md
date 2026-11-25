# ⚔️ RiftArena

### Real-Time Competitive Tactical RPG

RiftArena is a full-stack multiplayer tactical RPG featuring
server-authoritative turn-based combat, character collection,
strategic team building, ranked matchmaking and real-time
player communication.

The project explores multiplayer system design, state
synchronization, transactional consistency and secure
full-stack development.

[![CI](https://github.com/aox-cmd/RiftArena/actions/workflows/ci.yml/badge.svg)](https://github.com/aox-cmd/RiftArena/actions)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socket.io)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)

## Live Demo

| Resource | Link |
|---|---|
| Web Application | [Play RiftArena](https://rift-arena-self.vercel.app) |
| Backend API | [Render](https://riftarena-oazk.onrender.com) |
| API Health | [Health Check](https://riftarena-oazk.onrender.com/api/health) |
| CI Pipeline | [GitHub Actions](https://github.com/aox-cmd/RiftArena/actions) |

> The backend uses free-tier hosting and may require
> approximately one minute to wake up after inactivity.
> Multiplayer demonstrations require two separate accounts.

## Features

### Tactical Combat

- Real-time 3v3 turn-based PvP battles
- Server-authoritative combat engine
- Six playable characters and 18 unique abilities
- Damage, healing and shield mechanics
- Energy management and ability cooldowns
- Speed-based turn ordering
- Automatic actions after turn expiration
- Surrender and victory detection

### Multiplayer

- Socket.IO bidirectional communication
- Quick and ranked matchmaking
- Rating-aware opponent selection
- Real-time battle state synchronization
- Active-match reconnection
- Authenticated in-game chat
- Battle version validation

### Competitive Progression

- Elo-based rating calculation
- Ranked divisions from Bronze to Legend
- Global leaderboard
- Persistent win/loss statistics
- Match history
- Transactional ranked result processing

### Character and Deck Management

- Character ownership system
- Three-character formations
- Interactive deck builder
- Formation editing and activation
- Character statistics and ability inspection

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS, Framer Motion |
| State Management | Zustand |
| Backend | Node.js, Express, TypeScript |
| Real-Time Communication | Socket.IO |
| Database | MySQL-compatible TiDB Cloud |
| ORM | Prisma |
| Authentication | JWT, bcrypt |
| Validation | Zod |
| Logging | Pino |
| Testing | Node.js Test Runner, Integration Tests |
| CI | GitHub Actions |
| Deployment | Vercel, Render, TiDB Cloud |

## System Architecture

```mermaid
flowchart TD
    A[Player A] --> C[React Frontend]
    B[Player B] --> C

    C <-->|HTTPS REST API| D[Express Server]
    C <-->|WebSocket| E[Socket.IO]

    D --> F[Authentication and Validation]
    F --> G[Application Services]

    E --> H[Matchmaking Manager]
    H --> I[Authoritative Battle Engine]
    I --> J[Ranking Service]

    G --> K[Prisma ORM]
    I --> K
    J --> K

    K --> L[(TiDB Cloud)]
```

## Battle Lifecycle

```mermaid
sequenceDiagram
    participant A as Player A
    participant S as Game Server
    participant B as Player B
    participant DB as Database

    A->>S: Join matchmaking
    B->>S: Join matchmaking
    S->>DB: Create match
    S-->>A: Battle found
    S-->>B: Battle found

    loop Until battle ends
        A->>S: Submit action
        S->>S: Validate turn and ability
        S->>S: Calculate combat result
        S->>DB: Persist battle state
        S-->>A: Updated battle state
        S-->>B: Updated battle state
    end

    S->>DB: Finalize match and ranked result
    S-->>A: Battle ended
    S-->>B: Battle ended
```

## Engineering Decisions

### Server-Authoritative Combat

Clients submit intended actions rather than calculated
damage or modified character statistics.

The server validates ownership, turn order, ability
availability, energy, cooldowns and target selection
before calculating combat outcomes.

This establishes the server as the source of truth and
reduces opportunities for client-side manipulation.

### State Versioning

Each battle state contains a version number.

Actions include the expected version, allowing the
server to reject stale or duplicated requests.

This helps prevent inconsistent state updates caused
by delayed network messages or repeated submissions.

### Transactional Ranked Updates

Match completion, winner assignment and ranked rating
updates are handled using database transactions.

Conditional match updates prevent completed matches
from being finalized repeatedly.

### Concurrency Management

Multiplayer state mutations are serialized within
the authoritative server process.

Database transactions also protect deck activation
and ranked result consistency.

### Relational Database Design

Persistent entities include:

- User
- Character
- PlayerCharacter
- Deck
- DeckCharacter
- Match

The data model separates character definitions,
player ownership, team composition and match records.

## Security

RiftArena implements multiple application-level
security controls:

| Mechanism | Purpose |
|---|---|
| JWT authentication | Authenticated API and socket access |
| bcrypt hashing | Password protection |
| Zod validation | Request and event validation |
| Ownership checks | Prevent unauthorized resource access |
| Helmet | HTTP security headers |
| CORS configuration | Restrict allowed frontend origins |
| Rate limiting | Reduce request and chat abuse |
| State versioning | Reject stale and duplicate actions |
| Database transactions | Protect persistent consistency |
| Server-side combat | Reject invalid gameplay actions |
| Log redaction | Reduce accidental credential exposure |

## REST API

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register an account |
| POST | /api/auth/login | Authenticate |
| GET | /api/auth/me | Current player profile |

### Characters

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/characters | Character catalog |
| GET | /api/characters/owned | Owned characters |
| GET | /api/characters/:id | Character details |

### Decks

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/decks | List formations |
| POST | /api/decks | Create formation |
| PUT | /api/decks/:id | Update formation |
| PATCH | /api/decks/:id/activate | Activate formation |
| DELETE | /api/decks/:id | Delete formation |

### Competitive

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/ranking/leaderboard | Global rankings |
| GET | /api/ranking/history | Player match history |
| GET | /api/health | Service health |

## WebSocket Protocol

### Client Events

| Event | Purpose |
|---|---|
| queue:join | Enter matchmaking |
| queue:leave | Cancel matchmaking |
| battle:action | Submit a combat action |
| battle:surrender | Surrender an active match |
| chat:send | Send a battle message |

### Server Events

| Event | Purpose |
|---|---|
| queue:waiting | Matchmaking confirmation |
| queue:left | Queue cancellation |
| battle:found | Match initialization |
| battle:state | Authoritative state update |
| battle:reconnected | Restore active match |
| battle:ended | Final battle result |
| chat:message | Deliver chat message |

## Project Structure

```text
RiftArena/
├── .github/
│   └── workflows/
│       └── ci.yml
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── stores/
│   │   └── types/
│   └── package.json
├── server/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── scripts/
│   ├── src/
│   │   ├── config/
│   │   ├── game/
│   │   │   ├── abilities/
│   │   │   ├── chat/
│   │   │   ├── data/
│   │   │   ├── engine/
│   │   │   ├── matchmaking/
│   │   │   └── ranking/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sockets/
│   │   └── utils/
│   └── package.json
└── README.md
```

## Local Development

### Prerequisites

- Node.js 24
- npm
- MySQL 8-compatible database
- Git

Docker is not required.

### Clone the Repository

```bash
git clone https://github.com/aox-cmd/RiftArena.git
cd RiftArena
```

### Backend

```bash
cd server
npm ci
```

Create a `.env` file using `.env.example`.

```env
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/riftarena
JWT_SECRET=replace_with_a_secure_random_secret
JWT_EXPIRES_IN=7d
LOG_LEVEL=info
```

Create the local database, then run:

```bash
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

### Frontend

In a second terminal:

```bash
cd client
npm ci
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

Start the application:

```bash
npm run dev
```

Open http://localhost:5173.

## Testing

The project includes automated tests covering combat,
ranking calculations, API authorization and competitive
multiplayer workflows.

```bash
cd server

npm run build
npm run test:battle
npm run test:ranking
```

With the backend running against a development
or dedicated test database:

```bash
npm run test:security
npm run test:competitive
```

Integration tests create test accounts and match records.
Do not run them against the production database.

## Continuous Integration

GitHub Actions provides automated checks for:

- Dependency installation
- Prisma schema validation
- Database migrations
- Character seeding
- TypeScript compilation
- Combat and ranking tests
- API security tests
- Multiplayer integration tests
- Frontend production builds

The pipeline uses an isolated MySQL database.

## Deployment

| Service | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | TiDB Cloud |
| Continuous Integration | GitHub Actions |

## Known Limitations and Future Improvements

RiftArena is a portfolio-oriented multiplayer MVP.

- Active battle state is managed by a single server.
- Server restarts can interrupt active matches.
- Free-tier backend hosting introduces cold starts.
- Ranked matchmaking requires periodic queue evaluation.
- Chat history is currently temporary.
- Horizontal scaling requires distributed battle coordination.
- Production load testing remains future work.

## Future Roadmap

- Distributed matchmaking and session management
- Redis-backed battle coordination
- Battle recovery after server restarts
- Spectator mode and battle replays
- Seasonal competitive rankings
- Expanded character and ability systems
- Performance benchmarking and observability

## Author

Developed as a full-stack software engineering
portfolio project.

[GitHub Profile](https://github.com/aox-cmd)

