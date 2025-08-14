# HashToken Information Website

## Overview

This project is a full-stack TypeScript web application providing comprehensive information about HashToken (HTK), the first Ethereum token to implement a self-limiting Proof-of-Work model. It serves as an educational and analytical platform, showcasing live contract data, mining history, and analytics for this pioneering 2016 token with exponential difficulty scaling. The application includes both an informational website and an original hash calculator for educational purposes, highlighting HTK's unique approach to scarcity through computational work.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components (New York style, neutral base)
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Build Tool**: Vite
- **UI/UX**: Mobile-first responsive design, leveraging Radix UI primitives for accessibility.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Data Storage**: In-memory with JSON file persistence for mint events
- **Session Management**: Memory-based

### Core Features & Technical Implementations
- **Ethereum Integration**: Real-time contract state, mining events, and difficulty analysis via Ethers.js. Utilizes multiple RPC providers for reliability.
- **Hash Calculator Engine**: Keccak-256 (SHA-3) implementation for educational purposes, featuring random/sequential search, progress tracking, and performance metrics, optimized with Web Workers.
- **Data Model**: Primarily focuses on mint events stored in-memory and backed by a JSON file. Contract data is derived live from the blockchain.
- **API Structure**: Standard `/api` prefix with an abstracted storage layer and centralized error handling.
- **Data Flow**: Server fetches live contract data from Ethereum, which is then displayed by React components. The educational hash calculator operates client-side. Automatic periodic refreshing is implemented for all data (contract state, mint events, price data).
- **Supply Calculation**: Authoritative supply calculation is based on `max_value` from the blockchain, providing a precise token count.
- **Difficulty Forecast**: Includes a system to predict expected attempts for future tokens, visualizing exponential difficulty progression.

## External Dependencies

- **@neondatabase/serverless**: (Though now in-memory, initially used for PostgreSQL driver)
- **drizzle-orm**: (Though now in-memory, initially used for ORM)
- **ethers**: Ethereum blockchain interaction library
- **js-sha3**: Keccak-256 hash function implementation
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library
- **recharts**: Data visualization and charting
- **date-fns**: Date formatting and manipulation
- **DexScreener API**: For live price, market cap, liquidity, and volume data.
- **vite**: Frontend build tool
- **typescript**: Language and type checking
- **esbuild**: Backend bundling