# HashToken Information Website

## Overview

This is a comprehensive full-stack TypeScript web application that provides detailed information about HashToken (HTK), the first Ethereum token with proof-of-work minting logic. The application features live contract data, mining history, analytics, and an educational interface about this historic 2016 token. It includes both an information website and the original hash calculator for educational purposes.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL-backed sessions

### UI Component System
- **Base**: shadcn/ui components built on Radix UI primitives
- **Theme**: New York style with neutral base colors
- **Responsive Design**: Mobile-first approach with responsive breakpoints

## Key Components

### Ethereum Integration
- **Contract Address**: 0xE5544a2A5fA9b175da60D8Eec67adD5582bB31b0
- **Live Data**: Real-time contract state, mining events, and difficulty analysis
- **Multiple RPC Providers**: Fallback system for reliable blockchain connectivity
- **Historical Data**: Tracking and analysis of mining events over time

### Hash Calculator Engine (Educational)
- **Algorithm**: Keccak-256 (SHA-3) hash function
- **Features**: 
  - Random and sequential search methods
  - Real-time progress tracking
  - Configurable solution limits
  - Performance metrics (rate, elapsed time)
  - Export functionality for results

### Database Schema
- **Users Table**: Basic user management with username/password authentication
- **Contract State Table**: Stores historical contract states and difficulty progression
- **Mint Events Table**: Records all mining events with gas usage, timestamps, and miner addresses
- **Schema Location**: `shared/schema.ts` for type-safe database operations
- **Migration System**: Drizzle Kit for schema migrations

### API Structure
- **Route Prefix**: All API endpoints use `/api` prefix
- **Storage Interface**: Abstracted storage layer supporting both in-memory and database operations
- **Error Handling**: Centralized error handling with proper HTTP status codes

## Data Flow

### Information Website Flow
1. **Live Contract Data**: Server fetches real-time contract state from Ethereum
2. **Database Storage**: Contract states and mining events stored for historical analysis
3. **Client Display**: React components display live and historical data with charts
4. **Auto-refresh**: Users can manually refresh data or view cached historical information

### Hash Calculator Flow (Educational)
1. User inputs parameters (max value, previous hash, solution limit)
2. Client-side validation ensures proper hex format
3. Hash calculator runs in browser using Web Workers for performance
4. Progress updates stream to UI with real-time metrics
5. Results can be exported or cleared as needed

### Ethereum Integration Flow
1. **Multiple RPC Providers**: Fallback system tries multiple public Ethereum nodes
2. **Contract Interaction**: Ethers.js library handles contract calls and event queries
3. **Data Persistence**: Mining events and contract states stored in PostgreSQL
4. **Real-time Updates**: Live difficulty calculations and expected attempt estimates

## External Dependencies

### Core Runtime
- **@neondatabase/serverless**: Serverless PostgreSQL driver
- **drizzle-orm**: Type-safe database ORM
- **ethers**: Ethereum library for blockchain interactions
- **js-sha3**: Keccak-256 hash implementation

### UI and Styling
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library
- **recharts**: Data visualization and charting library
- **date-fns**: Date formatting and manipulation

### Development Tools
- **vite**: Fast build tool and dev server
- **typescript**: Type checking and compilation
- **esbuild**: Fast bundler for production builds

## Deployment Strategy

### Development
- **Dev Server**: Vite dev server with HMR for frontend
- **Backend**: tsx for TypeScript execution with auto-restart
- **Database**: Drizzle push for schema synchronization

### Production
- **Build Process**: 
  1. Vite builds optimized frontend bundle
  2. esbuild bundles backend with external dependencies
  3. Static assets served from `dist/public`
- **Server**: Node.js process serving both API and static files
- **Database**: PostgreSQL with connection pooling

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment flag for development/production modes
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple

## Changelog

```
Changelog:
- July 08, 2025. Initial setup with HashToken mint calculator
- July 08, 2025. Fixed hash validation logic (hash ≤ max_value for success)
- July 08, 2025. Improved UI visibility for dark theme dropdowns
- July 08, 2025. Added difficulty analysis to warn about restrictive max_values
- July 08, 2025. Optimized calculation performance for high-difficulty scenarios
- July 10, 2025. Fixed critical probability calculation bug - was showing 649M instead of 649B expected attempts
- July 10, 2025. Replaced Node.js Buffer with browser-compatible Uint8Array operations
- July 10, 2025. Updated difficulty analysis to correctly show billions of attempts for restrictive max_values
- July 10, 2025. MAJOR PIVOT: Transformed into comprehensive HashToken information website
- July 10, 2025. Added PostgreSQL database with contract state and mint events tables
- July 10, 2025. Implemented live Ethereum contract integration with multiple RPC providers
- July 10, 2025. Created tabbed information interface with overview, mining history, analytics, and educational content
- July 10, 2025. Added navigation system with separate hash calculator page for educational purposes
- July 10, 2025. Integrated data visualization with charts and real-time contract state display
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```