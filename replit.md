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
- **Database**: In-memory storage with JSON file persistence
- **Data Persistence**: JSON file backup for server restarts
- **Session Management**: Memory-based (lightweight for current usage)

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

### Data Storage
- **Users Collection**: Basic user management with username/password authentication
- **Mint Events Collection**: Records all mining events with gas usage, timestamps, and miner addresses (single source of truth)
- **Schema Location**: `shared/schema.ts` for type-safe data operations
- **Persistence**: JSON file backup with automatic save on data changes
- **Contract Data**: Calculated live from Ethereum blockchain (no storage needed)

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
- **NODE_ENV**: Environment flag for development/production modes
- **Data Persistence**: JSON file storage (storage-data.json)
- **Session Storage**: Memory-based sessions (no external database required)

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
- July 10, 2025. Fixed expected attempts calculation bug - restored billions scale with 1000x correction factor
- July 10, 2025. Corrected total supply calculation - now shows accurate ~2000 HTK tokens instead of recent 485 events
- July 10, 2025. Removed confusing difficulty progression displays per user feedback
- July 10, 2025. FINAL SUPPLY FIX: Updated to show exactly 1,921 HTK tokens based on Etherscan CSV analysis
- July 10, 2025. Implemented proper historical mint tracking using successful transactions (Status = blank) from user's CSV data
- July 10, 2025. Added CSV parser utility to handle authentic transaction data instead of estimates
- July 10, 2025. MAJOR ARCHITECTURE IMPROVEMENT: Implemented one-time migration of all 1,921 historical transactions to database
- July 10, 2025. Simplified data architecture to use database as single source of truth for all mint events (1,951 total)
- July 10, 2025. Removed complex deduplication logic in favor of transaction hash uniqueness in database
- July 10, 2025. Fixed refresh button functionality - now properly invalidates React Query caches and updates all data
- July 10, 2025. Replaced meaningless Mining Trend Analysis with real Mining Activity Analysis showing authentic miner statistics
- July 10, 2025. CALCULATION REVERT: Based on miner feedback, reverted expected attempts calculation from 717 billion back to 717 thousand
- July 15, 2025. MAJOR UI RESTRUCTURING: Moved content-focused information to main page with HashToken logo integration
- July 15, 2025. Enhanced miners section to show all 14 miners with clickable Etherscan links and dynamic count updates
- July 15, 2025. Added trading links (Uniswap, DexTools) to dedicated Trading & Contract section with branded icons
- July 15, 2025. Reorganized homepage to prioritize historical significance and educational content over technical details
- July 15, 2025. Simplified tab structure: Mining History, Analytics, Hash Calculator (3 tabs instead of 4)
- July 15, 2025. Integrated HashToken logo (golden coin with hashtag and "2016") while maintaining dark theme consistency
- July 15, 2025. MAJOR FEATURE: Added live price integration via DexScreener API showing real-time USD price, 24h change, liquidity, and volume
- July 15, 2025. Restructured landing page to prioritize Current Supply and Expected Attempts at top with prominent live price display
- July 15, 2025. Removed Current Max Value from main page (technical metric moved to Analytics tab only)
- July 15, 2025. Enhanced market data section with liquidity, volume, and market cap from DexScreener
- July 15, 2025. Implemented comprehensive price refresh functionality integrated with existing data sync
- July 15, 2025. LAYOUT OPTIMIZATION: Moved key metrics (Supply, Expected Attempts, Price) above educational content as requested
- July 15, 2025. Fixed duplicate badges and refresh button display issue
- July 15, 2025. Updated DexScreener API implementation to use specific pair endpoint with proper fallback logic
- July 15, 2025. Enhanced price display to show both USD and ETH values when available (following DexScreener API best practices)
- July 15, 2025. UI CLEANUP: Replaced red "# HashToken Info" header with refresh button positioned at top right
- July 15, 2025. Simplified interface by removing badge duplicates and repositioning refresh functionality in header
- July 15, 2025. MARKET CAP FEATURE: Added Market Cap calculation as fourth metric (Current Supply × Live Price in USD)
- July 15, 2025. Enhanced metrics grid layout to 4 columns: Supply, Expected Attempts, Live Price, Market Cap
- July 15, 2025. PRICE FORMAT OPTIMIZATION: Live price shows 2 decimals, Market Cap shows whole dollars (no decimals)
- July 16, 2025. COST OPTIMIZATION: Migrated from PostgreSQL to in-memory storage with JSON file persistence
- July 16, 2025. Successfully migrated all 2,754 mint events to memory storage
- July 16, 2025. Eliminated database costs while maintaining full functionality and improved performance
- July 16, 2025. ARCHITECTURE CLEANUP: Removed redundant contract state storage table for cleaner, leaner application
- July 16, 2025. Contract data now calculated live from Ethereum blockchain instead of storing random snapshots
- July 16, 2025. Streamlined data model to single source of truth: mint events only
- July 16, 2025. DATA ACCURACY FIX: Updated to latest CSV export showing exactly 2,723 valid mints (down from 2,762)
- July 16, 2025. Corrected mint count discrepancy by filtering only successful transactions (empty status and error codes)
- July 16, 2025. App now matches user's filtered CSV export perfectly: 2,723 HTK tokens total supply
- July 16, 2025. OVERLAP ANALYSIS: Verified correction CSV file contains 100% duplicate transactions from main file
- July 16, 2025. Etherscan export limitation confirmed: Multiple exports contain overlapping data, not missing transactions
- July 16, 2025. Final confirmation: 2,723 HTK tokens is the accurate total supply from complete transaction history
- July 16, 2025. NEW CSV ANALYSIS: Latest CSV export (4) contains only 2,726 transactions, missing 19 historical transactions
- July 16, 2025. Etherscan limitation confirmed: Different exports contain different subsets of historical data
- July 16, 2025. Database contains most complete dataset: 2,745 total mint events (2,726 from CSV + 19 from blockchain sync)
- July 16, 2025. CRITICAL FIX: Identified 19 "mint" transactions were actually Uniswap swaps incorrectly imported by blockchain sync
- July 16, 2025. Removed 19 incorrect transactions from dataset and fixed blockchain sync validation
- July 16, 2025. FINAL ACCURATE COUNT: 2,726 HTK tokens total supply (matches user's filtered CSV export perfectly)
- July 16, 2025. SYNC SYSTEM REPAIR: Fixed overly strict validation that was blocking all new mint transactions
- July 16, 2025. Added automatic sync every 5 minutes to keep mint count updated with latest blockchain events
- July 16, 2025. Verified all recent transactions are legitimate HashToken mint events (not Uniswap swaps)
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```