import { storage } from "./storage";
import {
  CONTRACT_DEPLOYMENT_BLOCK,
  fetchMintEvents,
  getLatestBlockNumber,
  type ChainMintEvent,
} from "./ethereum";
import type { InsertMintEvent } from "@shared/schema";

// Cloudflare's public mainnet endpoint accepts log ranges of at most 800 blocks.
// Keeping chunks below that limit lets it act as the free fallback provider.
const CHUNK_SIZE = 750;
const REORG_OVERLAP_BLOCKS = 24;
const INITIAL_BACKFILL_BLOCKS_PER_RUN = 15_000;
const RECENT_WINDOW_BLOCKS = 15_000;
const BACKFILL_CURSOR = "ethereum-mainnet";
const RECENT_CURSOR = "ethereum-mainnet-recent";
// Walks backwards from the earliest stored mint toward the 2016 deployment
// block, so pre-snapshot history is eventually recovered.
const HISTORY_CURSOR = "ethereum-mainnet-history";
const HISTORY_BLOCKS_PER_RUN = 3_000;

export type SyncResult = {
  running: boolean;
  processedFromBlock: number;
  processedToBlock: number;
  chunks: number;
  discovered: number;
  inserted: number;
  hasMoreHistory: boolean;
};

let activeSync: Promise<SyncResult> | null = null;

function asInsertEvent(event: ChainMintEvent): InsertMintEvent {
  return {
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
    minter: event.minter,
    timestamp: event.timestamp,
    gasUsed: event.gasUsed,
    gasPrice: event.gasPrice,
    difficulty: null,
    expectedAttempts: null,
  };
}

async function runSync(
  maxBlocks: number,
  options: { recentFirst?: boolean } = {},
): Promise<SyncResult> {
  const latestBlock = await getLatestBlockNumber();
  const cursor = options.recentFirst ? RECENT_CURSOR : BACKFILL_CURSOR;
  const savedState = await storage.getSyncState(cursor);
  const checkpoint = savedState?.lastProcessedBlock ?? 0;
  const earliestStoredBlock = options.recentFirst
    ? undefined
    : await storage.getEarliestMintBlock();
  const startBlock = options.recentFirst
    ? Math.max(CONTRACT_DEPLOYMENT_BLOCK, latestBlock - RECENT_WINDOW_BLOCKS)
    : checkpoint
      ? Math.max(CONTRACT_DEPLOYMENT_BLOCK, checkpoint - REORG_OVERLAP_BLOCKS)
      : Math.max(
        CONTRACT_DEPLOYMENT_BLOCK,
        earliestStoredBlock !== undefined ? earliestStoredBlock - REORG_OVERLAP_BLOCKS : CONTRACT_DEPLOYMENT_BLOCK,
      );
  const targetBlock = Math.min(latestBlock, startBlock + maxBlocks - 1);

  if (startBlock > latestBlock) {
    return {
      running: false,
      processedFromBlock: startBlock,
      processedToBlock: latestBlock,
      chunks: 0,
      discovered: 0,
      inserted: 0,
      hasMoreHistory: false,
    };
  }

  let inserted = 0;
  let discovered = 0;
  let chunks = 0;

  try {
    for (let fromBlock = startBlock; fromBlock <= targetBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, targetBlock);
      const events = await fetchMintEvents(fromBlock, toBlock);
      discovered += events.length;
      inserted += await storage.insertMintEvents(events.map(asInsertEvent));

      // A checkpoint only advances after this entire range has been fetched and committed.
      await storage.saveSyncSuccess(toBlock, cursor);
      chunks++;
    }

    return {
      running: false,
      processedFromBlock: startBlock,
      processedToBlock: targetBlock,
      chunks,
      discovered,
      inserted,
      hasMoreHistory: targetBlock < latestBlock,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await storage.saveSyncFailure(message, cursor);
    throw error;
  }
}

/**
 * Recovers pre-snapshot history by scanning DESCENDING from the earliest
 * covered block toward the contract deployment block. The checkpoint stores
 * the lowest block already scanned; it only moves down after committed writes.
 */
async function runBackwardHistorySync(maxBlocks: number): Promise<SyncResult> {
  const savedState = await storage.getSyncState(HISTORY_CURSOR);
  let upperBound: number;
  if (savedState?.lastProcessedBlock) {
    upperBound = savedState.lastProcessedBlock;
  } else {
    const earliestStoredBlock = await storage.getEarliestMintBlock();
    if (earliestStoredBlock === undefined) {
      // Nothing stored yet; the forward cursor starts at deployment and covers everything.
      return {
        running: false,
        processedFromBlock: CONTRACT_DEPLOYMENT_BLOCK,
        processedToBlock: CONTRACT_DEPLOYMENT_BLOCK,
        chunks: 0,
        discovered: 0,
        inserted: 0,
        hasMoreHistory: false,
      };
    }
    upperBound = earliestStoredBlock + REORG_OVERLAP_BLOCKS;
  }

  if (upperBound <= CONTRACT_DEPLOYMENT_BLOCK) {
    return {
      running: false,
      processedFromBlock: CONTRACT_DEPLOYMENT_BLOCK,
      processedToBlock: upperBound,
      chunks: 0,
      discovered: 0,
      inserted: 0,
      hasMoreHistory: false,
    };
  }

  const lowerTarget = Math.max(CONTRACT_DEPLOYMENT_BLOCK, upperBound - maxBlocks);
  let inserted = 0;
  let discovered = 0;
  let chunks = 0;

  try {
    for (let toBlock = upperBound - 1; toBlock >= lowerTarget; toBlock -= CHUNK_SIZE) {
      const fromBlock = Math.max(lowerTarget, toBlock - CHUNK_SIZE + 1);
      const events = await fetchMintEvents(fromBlock, toBlock);
      discovered += events.length;
      inserted += await storage.insertMintEvents(events.map(asInsertEvent));

      // Checkpoint only moves down after this chunk is fully committed.
      await storage.saveSyncSuccess(fromBlock, HISTORY_CURSOR);
      chunks++;
    }

    return {
      running: false,
      processedFromBlock: lowerTarget,
      processedToBlock: upperBound,
      chunks,
      discovered,
      inserted,
      hasMoreHistory: lowerTarget > CONTRACT_DEPLOYMENT_BLOCK,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await storage.saveSyncFailure(message, HISTORY_CURSOR);
    throw error;
  }
}

export async function syncMintHistory(options: {
  fullBackfill?: boolean;
  recentFirst?: boolean;
} = {}): Promise<SyncResult> {
  if (activeSync) return activeSync;

  activeSync = (async () => {
    const recentResult = options.recentFirst
      ? await runSync(RECENT_WINDOW_BLOCKS, { recentFirst: true })
      : null;
    let backfillResult: SyncResult;
    try {
      backfillResult = await runSync(
        options.fullBackfill ? INITIAL_BACKFILL_BLOCKS_PER_RUN : CHUNK_SIZE,
      );
    } catch (error) {
      // The historical backfill needs archive-capable providers and may fail on
      // free RPCs. That must never block or discard a successful recent scan.
      if (!recentResult) throw error;
      console.warn("Historical backfill failed (recent scan succeeded):", error instanceof Error ? error.message.split("\n")[0] : error);
      backfillResult = {
        running: false,
        processedFromBlock: recentResult.processedFromBlock,
        processedToBlock: recentResult.processedFromBlock,
        chunks: 0,
        discovered: 0,
        inserted: 0,
        hasMoreHistory: true,
      };
    }
    let historyResult: SyncResult | null = null;
    try {
      historyResult = await runBackwardHistorySync(HISTORY_BLOCKS_PER_RUN);
    } catch (error) {
      // Pre-snapshot recovery may need archive-capable providers; failure here
      // must never discard the recent or forward progress already committed.
      if (!recentResult && !backfillResult.chunks) throw error;
      console.warn("Backward history recovery failed this run:", error instanceof Error ? error.message.split("\n")[0] : error);
    }

    if (!recentResult && !historyResult) return backfillResult;
    return {
      running: false,
      processedFromBlock: historyResult?.processedFromBlock ?? backfillResult.processedFromBlock,
      processedToBlock: recentResult?.processedToBlock ?? backfillResult.processedToBlock,
      chunks: (recentResult?.chunks ?? 0) + backfillResult.chunks + (historyResult?.chunks ?? 0),
      discovered: (recentResult?.discovered ?? 0) + backfillResult.discovered + (historyResult?.discovered ?? 0),
      inserted: (recentResult?.inserted ?? 0) + backfillResult.inserted + (historyResult?.inserted ?? 0),
      hasMoreHistory: backfillResult.hasMoreHistory || (historyResult?.hasMoreHistory ?? true),
    };
  })()
    .finally(() => {
      activeSync = null;
    });
  return activeSync;
}

export async function getMintSyncStatus() {
  const [state, recentState, historyState, eventCount] = await Promise.all([
    storage.getSyncState(BACKFILL_CURSOR),
    storage.getSyncState(RECENT_CURSOR),
    storage.getSyncState(HISTORY_CURSOR),
    storage.getMintEventCount(),
  ]);
  return {
    status: activeSync ? "syncing" : recentState?.lastError ? "error" : "ready",
    eventCount,
    checkpointBlock: state?.lastProcessedBlock ?? null,
    recentCheckpointBlock: recentState?.lastProcessedBlock ?? null,
    historyCheckpointBlock: historyState?.lastProcessedBlock ?? null,
    lastSuccessfulSyncAt: recentState?.lastSuccessfulSyncAt ?? state?.lastSuccessfulSyncAt ?? null,
    lastAttemptAt: recentState?.lastAttemptAt ?? state?.lastAttemptAt ?? null,
    lastError: recentState?.lastError ?? state?.lastError ?? null,
  };
}