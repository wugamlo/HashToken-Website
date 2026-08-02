import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  initializeProvider,
  getCurrentContractState,
  calculateExpectedAttempts,
  calculateDifficulty,
  calculateForecast,
  calculateSupplyFromMaxValue,
} from "./ethereum";
import { getMintSyncStatus, syncMintHistory } from "./mint-indexer";

export async function registerRoutes(app: Express): Promise<Server> {
  void initializeProvider().catch((error) => {
    console.warn("Failed to initialize Ethereum provider:", error);
  });

  app.get("/api/contract/state", async (_req, res) => {
    try {
      const state = await getCurrentContractState();
      const supplyFromMaxValue = calculateSupplyFromMaxValue(state.maxValue);
      const transactionCount = await storage.getMintEventCount();

      res.json({
        ...state,
        expectedAttempts: calculateExpectedAttempts(state.maxValue),
        difficulty: calculateDifficulty(state.maxValue),
        totalMints: supplyFromMaxValue,
        totalSupply: supplyFromMaxValue.toString(),
        transactionCount,
      });
    } catch (error) {
      console.error("Error fetching contract state:", error);
      res.status(503).json({
        error: "Live contract state is temporarily unavailable",
        isOffline: true,
      });
    }
  });

  app.get("/api/contract/mint-events", async (req, res) => {
    try {
      const requestedLimit = Number.parseInt(req.query.limit as string, 10) || 10;
      const events = await storage.getRecentMintEvents(Math.min(Math.max(requestedLimit, 1), 500));
      res.json(events);
    } catch (error) {
      console.error("Error fetching mint events:", error);
      res.status(500).json({ error: "Failed to fetch mint events" });
    }
  });

  app.get("/api/contract/history", async (req, res) => {
    try {
      const days = Math.min(Math.max(Number.parseInt(req.query.days as string, 10) || 30, 1), 3650);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      res.json(await storage.getMintEventsByDateRange(startDate, endDate));
    } catch (error) {
      console.error("Error fetching contract history:", error);
      res.status(500).json({ error: "Failed to fetch contract history" });
    }
  });

  app.get("/api/contract/miners", async (_req, res) => {
    try {
      const events = await storage.getRecentMintEvents(10000);
      const counts = new Map<string, number>();
      for (const event of events) {
        counts.set(event.minter, (counts.get(event.minter) || 0) + 1);
      }
      res.json(
        Array.from(counts, ([address, count]) => ({ address, count }))
          .sort((left, right) => right.count - left.count),
      );
    } catch (error) {
      console.error("Error fetching miners:", error);
      res.status(500).json({ error: "Failed to fetch miners" });
    }
  });

  app.get("/api/contract/sync-status", async (_req, res) => {
    try {
      res.json(await getMintSyncStatus());
    } catch (error) {
      console.error("Error retrieving mint sync status:", error);
      res.status(500).json({ error: "Failed to retrieve mint sync status" });
    }
  });

  app.post("/api/contract/sync", async (req, res) => {
    try {
      res.json(await syncMintHistory({ fullBackfill: Boolean(req.body?.fullBackfill) }));
    } catch (error) {
      console.error("Error syncing mint events:", error);
      res.status(502).json({ error: "Failed to synchronize mints from Ethereum" });
    }
  });

  app.post("/api/contract/auto-sync", async (_req, res) => {
    try {
      res.json(await syncMintHistory({ fullBackfill: true }));
    } catch (error) {
      console.error("Error in automatic mint sync:", error);
      res.status(502).json({ error: "Failed to synchronize mints from Ethereum" });
    }
  });

  app.get("/api/contract/forecast", async (_req, res) => {
    try {
      const state = await getCurrentContractState();
      const currentMintCount = calculateSupplyFromMaxValue(state.maxValue);
      res.json({
        currentMintCount,
        currentMaxValue: state.maxValue,
        currentExpectedAttempts: calculateExpectedAttempts(state.maxValue),
        currentDifficulty: calculateDifficulty(state.maxValue),
        forecasts: calculateForecast(state.maxValue, currentMintCount, [10, 20, 50]),
      });
    } catch (error) {
      console.error("Error calculating forecast:", error);
      res.status(502).json({ error: "Failed to calculate forecast from live contract state" });
    }
  });

  app.get("/api/contract/price", async (_req, res) => {
    try {
      const pairResponse = await fetch("https://api.dexscreener.com/latest/dex/pairs/ethereum/0x01c0aeaee4f9b9417237aef3556bc1d7bd00ec52");
      const pairData = await pairResponse.json() as { pairs?: Array<Record<string, any>> };
      const pair = pairData.pairs?.[0];
      if (!pair) {
        res.status(404).json({ error: "No trading pairs found" });
        return;
      }
      res.json({
        priceUsd: pair.priceUsd,
        priceNative: pair.priceNative,
        priceChange24h: pair.priceChange?.h24,
        liquidity: pair.liquidity?.usd,
        volume24h: pair.volume?.h24,
        marketCap: pair.marketCap,
        pairAddress: pair.pairAddress,
        dexId: pair.dexId,
        baseToken: pair.baseToken,
        quoteToken: pair.quoteToken,
      });
    } catch (error) {
      console.error("Error fetching price data:", error);
      res.status(502).json({ error: "Failed to fetch price data" });
    }
  });

  return createServer(app);
}