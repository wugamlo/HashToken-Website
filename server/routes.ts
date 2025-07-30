import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeProvider, getCurrentContractState, getRecentMintEvents, calculateExpectedAttempts, calculateDifficulty, calculateForecast, calculateSupplyFromMaxValue } from "./ethereum";
import { migrateHistoricalTransactions } from "./csv-parser";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Ethereum provider
  try {
    initializeProvider();
  } catch (error) {
    console.warn("Failed to initialize Ethereum provider:", error);
  }
  
  // Get current contract state
  app.get("/api/contract/state", async (req, res) => {
    try {
      const state = await getCurrentContractState();
      const expectedAttempts = calculateExpectedAttempts(state.maxValue);
      const difficulty = calculateDifficulty(state.maxValue);
      
      // Calculate supply from max_value (authoritative blockchain state)
      const supplyFromMaxValue = calculateSupplyFromMaxValue(state.maxValue);
      
      // Get transaction count from memory storage (for analytics)
      const mintEvents = await storage.getRecentMintEvents(9999);
      const transactionCount = mintEvents.length;
      
      console.log(`Supply from max_value: ${supplyFromMaxValue}, Transaction count: ${transactionCount}`);
      
      // Use max_value-based supply as the authoritative source
      res.json({
        ...state,
        expectedAttempts,
        difficulty,
        totalMints: supplyFromMaxValue, // Authoritative supply from blockchain state
        totalSupply: supplyFromMaxValue.toString(), // Main supply display
        transactionCount: transactionCount, // Available for analytics
      });
    } catch (error) {
      console.error("Error fetching contract state:", error);
      
      // Return fallback data with historical information
      const fallbackState = {
        blockNumber: 21425000, // Approximate current block
        maxValue: "460766", // Approximate current max_value based on historical data
        prevHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        totalSupply: "3214", // Current estimated supply
        expectedAttempts: "2.47e14", // 247 trillion attempts
        difficulty: "99.99", // Very high difficulty
        totalMints: 3214, // Current estimated supply
        transactionCount: 3214, // Same as mints for fallback
        isOffline: true, // Indicate data is not live
      };
      
      res.json(fallbackState);
    }
  });
  
  // Get recent mint events
  app.get("/api/contract/mint-events", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const events = await storage.getRecentMintEvents(limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching mint events:", error);
      res.status(500).json({ error: "Failed to fetch mint events" });
    }
  });
  
  // Get token price from DexScreener API using specific pair
  app.get("/api/contract/price", async (req, res) => {
    try {
      // Use the correct API endpoint format as suggested
      const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0x01c0aeaee4f9b9417237aef3556bc1d7bd00ec52');
      const data = await response.json();
      
      if (data.pairs && data.pairs.length > 0) {
        const pair = data.pairs[0]; // Get first pair as suggested
        res.json({
          priceUsd: pair.priceUsd,
          priceNative: pair.priceNative, // Price in ETH
          priceChange24h: pair.priceChange?.h24,
          liquidity: pair.liquidity?.usd,
          volume24h: pair.volume?.h24,
          marketCap: pair.marketCap,
          pairAddress: pair.pairAddress,
          dexId: pair.dexId,
          baseToken: pair.baseToken,
          quoteToken: pair.quoteToken
        });
        return;
      }
      
      // If no pairs found, try token endpoint as fallback
      const tokenResponse = await fetch('https://api.dexscreener.com/tokens/v1/ethereum/0xE5544a2A5fA9b175da60D8Eec67adD5582bB31b0');
      const tokenData = await tokenResponse.json();
      
      if (tokenData.pairs && tokenData.pairs.length > 0) {
        const bestPair = tokenData.pairs.reduce((best, current) => 
          (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best
        );
        
        res.json({
          priceUsd: bestPair.priceUsd,
          priceNative: bestPair.priceNative,
          priceChange24h: bestPair.priceChange?.h24,
          liquidity: bestPair.liquidity?.usd,
          volume24h: bestPair.volume?.h24,
          marketCap: bestPair.marketCap,
          pairAddress: bestPair.pairAddress,
          dexId: bestPair.dexId
        });
      } else {
        res.status(404).json({ error: "No trading pairs found" });
      }
    } catch (error) {
      console.error("Error fetching price data:", error);
      res.status(500).json({ error: "Failed to fetch price data" });
    }
  });

  // Get historical contract states
  app.get("/api/contract/history", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const endDate = new Date();
      
      const events = await storage.getMintEventsByDateRange(startDate, endDate);
      res.json(events);
    } catch (error) {
      console.error("Error fetching contract history:", error);
      res.status(500).json({ error: "Failed to fetch contract history" });
    }
  });
  
  // Get all miners with their mint counts
  app.get("/api/contract/miners", async (req, res) => {
    try {
      const events = await storage.getRecentMintEvents(10000); // Get all events
      
      // Group by miner and count mints
      const minerCounts = new Map<string, number>();
      events.forEach(event => {
        const current = minerCounts.get(event.minter) || 0;
        minerCounts.set(event.minter, current + 1);
      });
      
      // Convert to array and sort by count (descending)
      const miners = Array.from(minerCounts.entries())
        .map(([address, count]) => ({ address, count }))
        .sort((a, b) => b.count - a.count);
      
      res.json(miners);
    } catch (error) {
      console.error("Error fetching miners:", error);
      res.status(500).json({ error: "Failed to fetch miners" });
    }
  });
  
  // Sync recent mint events from blockchain
  app.post("/api/contract/sync", async (req, res) => {
    try {
      const fromBlock = req.body.fromBlock || -50000;
      const events = await getRecentMintEvents(fromBlock);
      let syncedCount = 0;
      
      for (const event of events) {
        // Check if event already exists
        const existing = await storage.getMintEventByHash(event.transactionHash);
        if (!existing) {
          // Calculate realistic difficulty progression
          // Start from lower difficulty and increase progressively
          const mintIndex = await storage.getRecentMintEvents(9999);
          const baseDifficulty = 90; // Start from 90%
          const difficultyIncrement = 0.001; // 0.1% per mint
          const simulatedDifficulty = (baseDifficulty + (mintIndex.length * difficultyIncrement)).toFixed(4);
          
          await storage.insertMintEvent({
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            minter: event.minter,
            timestamp: event.timestamp,
            gasUsed: event.gasUsed,
            gasPrice: event.gasPrice,
            difficulty: simulatedDifficulty,
            expectedAttempts: calculateExpectedAttempts("100000"), // Placeholder
          });
          syncedCount++;
        }
      }
      
      res.json({ 
        synced: syncedCount, 
        total: events.length, 
        message: `Sync completed: ${syncedCount} new events added` 
      });
    } catch (error) {
      console.error("Error syncing mint events:", error);
      res.status(500).json({ error: "Failed to sync mint events" });
    }
  });

  // Auto-sync endpoint for regular background sync
  app.post("/api/contract/auto-sync", async (req, res) => {
    try {
      // Use smaller block range for regular sync
      const events = await getRecentMintEvents(-2000);
      let syncedCount = 0;
      
      for (const event of events) {
        const existing = await storage.getMintEventByHash(event.transactionHash);
        if (!existing) {
          const mintIndex = await storage.getRecentMintEvents(9999);
          const baseDifficulty = 90;
          const difficultyIncrement = 0.001;
          const simulatedDifficulty = (baseDifficulty + (mintIndex.length * difficultyIncrement)).toFixed(4);
          
          await storage.insertMintEvent({
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            minter: event.minter,
            timestamp: event.timestamp,
            gasUsed: event.gasUsed,
            gasPrice: event.gasPrice,
            difficulty: simulatedDifficulty,
            expectedAttempts: calculateExpectedAttempts("100000"),
          });
          syncedCount++;
        }
      }
      
      res.json({ 
        synced: syncedCount, 
        total: events.length, 
        message: `Auto-sync completed: ${syncedCount} new events added` 
      });
    } catch (error) {
      console.error("Error in auto-sync:", error);
      res.status(500).json({ error: "Failed to auto-sync mint events" });
    }
  });

  // Get difficulty forecast for future tokens
  app.get("/api/contract/forecast", async (req, res) => {
    try {
      const state = await getCurrentContractState();
      
      // Use max_value-based supply calculation (authoritative)
      const currentMintCount = calculateSupplyFromMaxValue(state.maxValue);
      
      // Forecast for next 10, 20, and 50 tokens
      const forecastCounts = [10, 20, 50];
      const forecasts = calculateForecast(state.maxValue, currentMintCount, forecastCounts);
      
      res.json({
        currentMintCount,
        currentMaxValue: state.maxValue,
        currentExpectedAttempts: calculateExpectedAttempts(state.maxValue),
        currentDifficulty: calculateDifficulty(state.maxValue),
        forecasts
      });
    } catch (error) {
      console.error("Error calculating forecast:", error);
      res.status(500).json({ error: "Failed to calculate forecast" });
    }
  });

  // Migration endpoint to import historical transactions
  app.post("/api/migrate-historical", async (req, res) => {
    try {
      const migratedCount = await migrateHistoricalTransactions();
      res.json({ 
        success: true,
        migratedCount,
        message: `Successfully migrated ${migratedCount} historical transactions to database` 
      });
    } catch (error) {
      console.error("Error during migration:", error);
      res.status(500).json({ error: "Failed to migrate historical transactions" });
    }
  });

  // Migration endpoint to move data from PostgreSQL to memory storage
  app.post("/api/migrate-to-memory", async (req, res) => {
    try {
      const { migrateToMemoryStorage } = await import("./migrate-to-memory");
      await migrateToMemoryStorage();
      res.json({ 
        success: true,
        message: "Successfully migrated data from PostgreSQL to memory storage" 
      });
    } catch (error) {
      console.error("Error during memory migration:", error);
      res.status(500).json({ error: "Failed to migrate to memory storage" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
