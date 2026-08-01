# HashToken Website

A full-stack informational and analytical website about **HashToken (HTK)** — one of the earliest Ethereum tokens (2016) to implement a self-limiting Proof-of-Work minting model with exponentially increasing difficulty.

The site provides live on-chain data, mining history, difficulty analytics, price information, and an educational hash calculator.

---

## Features

- **Live Contract State**  
  Real-time data from the HashToken smart contract (max_value, supply calculation, difficulty, previous hash, etc.) via public Ethereum RPC endpoints.

- **Mint Event History & Analytics**  
  Historical mint transactions, miner statistics, and related metrics stored and served from local persistence.

- **Difficulty Forecast**  
  Projection of expected attempts and difficulty for future tokens based on the contract’s 1% reduction model.

- **Price & Market Data**  
  Live price, liquidity, volume and market cap data pulled from DexScreener.

- **Educational Hash Calculator**  
  Client-side Keccak-256 (SHA-3) tool that lets users experiment with the kind of hashing used in the original mining process.

- **Automatic Background Sync**  
  The server periodically checks for new mint events (every 5 minutes) and updates the local history.

---

## Tech Stack

| Layer          | Technology                                      |
|----------------|-------------------------------------------------|
| Frontend       | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Wouter, TanStack Query |
| Backend        | Node.js, Express, TypeScript                    |
| Ethereum       | ethers.js v6                                    |
| Data Storage   | In-memory store with JSON file persistence (`storage-data.json`) |
| Build Tools    | Vite (client) + esbuild (server)                |

**Note:** The project originally used Neon PostgreSQL + Drizzle ORM but was later migrated to a pure in-memory + JSON file approach for simplicity.

---

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/          # Main pages (HashToken info + Hash Calculator)
│   │   ├── components/     # UI components (shadcn/ui)
│   │   ├── hooks/
│   │   └── lib/            # Hash calculator logic, utilities
│   └── public/
├── server/                 # Express backend
│   ├── ethereum.ts         # Contract interaction & calculations
│   ├── memory-storage.ts   # In-memory + JSON persistence
│   ├── routes.ts           # API endpoints
│   └── index.ts            # Server entry point
├── shared/                 # Shared TypeScript types/schema
├── attached_assets/        # Images, historical CSVs, notes
├── storage-data.json       # Persistent mint event history (important!)
├── package.json
└── ...
```

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
git clone https://github.com/wugamlo/HashToken-Website.git
cd HashToken-Website
npm install
```

### Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

---

## Production Build

```bash
npm run build
npm start
```

- `npm run build` builds the React client into `dist/public` and bundles the server into `dist/index.js`.
- `npm start` runs the production server on **port 5000**.

---

## Hosting & Portability

This project was originally developed and hosted on Replit. It is designed to be easily portable.

### Current Assessment (as of August 2026)

**Can it be hosted elsewhere without major changes?**  
**Yes — with only very minor adjustments.**

#### What works out of the box
- Standard Node.js full-stack application
- Clean build & start scripts
- Uses free public Ethereum RPC providers (no API keys required)
- No hard dependency on Replit runtime in production

#### Small adjustments usually required

1. **Port is hardcoded to 5000**  
   Many hosting platforms inject the port via `process.env.PORT`.  
   On a classic VPS you can simply use port 5000 (or put Nginx/Caddy in front).  
   For platforms that require dynamic ports, a 2-line change is needed.

2. **Filesystem persistence**  
   All mint history lives in `storage-data.json`.  
   This works perfectly on any host that provides a **persistent disk** (VPS, Railway, Render, Fly.io, DigitalOcean, etc.).  
   It will **not** work on pure serverless platforms (Vercel serverless functions, Cloudflare Workers, etc.) without further changes.

### Recommended Hosting Options

| Platform              | Suitability | Notes                                      |
|-----------------------|-------------|--------------------------------------------|
| Classic VPS           | Excellent   | Full control, persistent disk, easy        |
| Railway / Render / Fly.io | Very Good | Persistent volume recommended             |
| DigitalOcean App Platform | Good     | Easy, supports persistent storage          |
| Pure Serverless (Vercel, etc.) | Not recommended | Requires rewriting storage layer        |

### VPS Deployment Notes (Recommended Path)

Typical workflow:
1. Develop locally (e.g. on a Mac Mini)
2. Push to GitHub
3. Pull on the VPS
4. `npm install && npm run build && npm start` (preferably under pm2 or systemd)

**History preservation:**  
The file `storage-data.json` is committed to the repository. On first deploy the full existing history is therefore present.  
As the application runs on the VPS it will continue to discover and append new mint events to the local copy of this file.

**Recommendation after first successful deploy:**  
Treat `storage-data.json` as runtime data. Consider either:
- Stopping further commits of this file, or
- Moving it outside the project directory (e.g. `/var/lib/hashtoken/storage-data.json`) and updating the path in `server/memory-storage.ts`.

This prevents accidental overwrites when pulling future code changes.

---

## Important Data Notes

- **Primary data store:** `storage-data.json` (mint events + some metadata)
- The application also has legacy Drizzle / Neon database code, but it is no longer active. The live storage layer is `MemoryStorage`.
- Supply numbers shown on the site are calculated from the on-chain `max_value` (authoritative), not purely from the local event count.

---

## API Endpoints (Overview)

| Endpoint                        | Method | Description                          |
|---------------------------------|--------|--------------------------------------|
| `/api/contract/state`           | GET    | Current contract state + calculated metrics |
| `/api/contract/mint-events`     | GET    | Recent mint events                   |
| `/api/contract/price`           | GET    | Price & market data from DexScreener |
| `/api/contract/miners`          | GET    | Aggregated miner statistics          |
| `/api/contract/forecast`        | GET    | Difficulty forecast                  |
| `/api/contract/auto-sync`       | POST   | Background sync of new mint events   |
| `/api/contract/sync`            | POST   | Manual sync                          |

---

## License

MIT

---

*This README was generated based on a full analysis of the repository in August 2026. It reflects the current architecture after the migration from Replit and from PostgreSQL to in-memory + JSON persistence.*
