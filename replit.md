# Hash Calculator Application

## Overview

This is a full-stack TypeScript web application that implements a hash calculator for cryptographic operations. The application uses a modern React frontend with a Node.js/Express backend, designed to calculate hash values using the Keccak-256 algorithm. The project follows a monorepo structure with shared types and utilities.

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

### Hash Calculator Engine
- **Algorithm**: Keccak-256 (SHA-3) hash function
- **Features**: 
  - Random and sequential search methods
  - Real-time progress tracking
  - Configurable solution limits
  - Performance metrics (rate, elapsed time)
  - Export functionality for results

### Database Schema
- **Users Table**: Basic user management with username/password authentication
- **Schema Location**: `shared/schema.ts` for type-safe database operations
- **Migration System**: Drizzle Kit for schema migrations

### API Structure
- **Route Prefix**: All API endpoints use `/api` prefix
- **Storage Interface**: Abstracted storage layer supporting both in-memory and database operations
- **Error Handling**: Centralized error handling with proper HTTP status codes

## Data Flow

1. **Client Request**: React components make API calls using TanStack Query
2. **Server Processing**: Express routes handle requests and interact with storage layer
3. **Database Operations**: Drizzle ORM manages PostgreSQL interactions
4. **Response**: JSON responses with proper error handling and logging
5. **Client Update**: React Query manages cache invalidation and UI updates

### Hash Calculation Flow
1. User inputs parameters (max value, previous hash, solution limit)
2. Client-side validation ensures proper hex format
3. Hash calculator runs in browser using Web Workers for performance
4. Progress updates stream to UI with real-time metrics
5. Results can be exported or cleared as needed

## External Dependencies

### Core Runtime
- **@neondatabase/serverless**: Serverless PostgreSQL driver
- **drizzle-orm**: Type-safe database ORM
- **js-sha3**: Keccak-256 hash implementation

### UI and Styling
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```