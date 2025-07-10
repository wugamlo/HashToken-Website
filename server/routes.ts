import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeProvider, getCurrentContractState, getRecentMintEvents, calculateExpectedAttempts, calculateDifficulty } from "./ethereum";
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
      
      // Get total mint count from database (single source of truth)
      const mintEvents = await storage.getRecentMintEvents(9999);
      const totalMints = mintEvents.length;
      
      console.log(`Total mints from database: ${totalMints}`);
      
      // Store in database
      await storage.updateContractState({
        blockNumber: state.blockNumber,
        maxValue: state.maxValue,
        prevHash: state.prevHash,
        totalSupply: totalMints.toString(),
      });
      
      res.json({
        ...state,
        expectedAttempts,
        difficulty,
        totalMints: totalMints,
        totalSupply: totalMints.toString(), // Each mint = 1 HTK
      });
    } catch (error) {
      console.error("Error fetching contract state:", error);
      
      // Return fallback data with historical information
      const fallbackState = {
        blockNumber: 21425000, // Approximate current block
        maxValue: "460766", // Approximate current max_value based on historical data
        prevHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        totalSupply: "200000000000000000000000", // 200,000 HTK
        expectedAttempts: "2.47e14", // 247 trillion attempts
        difficulty: "99.99", // Very high difficulty
        totalMints: 200000, // Approximate total mints
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

  const httpServer = createServer(app);

  return httpServer;
}
