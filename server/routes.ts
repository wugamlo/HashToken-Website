import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeProvider, getCurrentContractState, getRecentMintEvents, calculateExpectedAttempts, calculateDifficulty } from "./ethereum";

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
      
      // Store in database
      await storage.updateContractState({
        blockNumber: state.blockNumber,
        maxValue: state.maxValue,
        prevHash: state.prevHash,
        totalSupply: state.totalSupply,
      });
      
      res.json({
        ...state,
        expectedAttempts,
        difficulty,
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
  
  // Sync recent mint events from blockchain
  app.post("/api/contract/sync", async (req, res) => {
    try {
      const events = await getRecentMintEvents();
      let syncedCount = 0;
      
      for (const event of events) {
        // Check if event already exists
        const existing = await storage.getMintEventByHash(event.transactionHash);
        if (!existing) {
          await storage.insertMintEvent({
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            minter: event.minter,
            timestamp: event.timestamp,
            gasUsed: event.gasUsed,
            gasPrice: event.gasPrice,
            difficulty: "99", // High difficulty for display
            expectedAttempts: "1e12", // Placeholder
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

  const httpServer = createServer(app);

  return httpServer;
}
