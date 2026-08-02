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
  const earliestStoredEvent = options.recentFirst
    ? Number.MAX_SAFE_INTEGER
    : (await storage.getRecentMintEvents(10000))
      .reduce((minimum, event) => Math.min(minimum, event.blockNumber), Number.MAX_SAFE_INTEGER);
  const startBlock = options.recentFirst
    ? Math.max(CONTRACT_DEPLOYMENT_BLOCK, latestBlock - RECENT_WINDOW_BLOCKS)
    : checkpoint
      ? Math.max(CONTRACT_DEPLOYMENT_BLOCK, checkpoint - REORG_OVERLAP_BLOCKS)
      : Math.max(
        CONTRACT_DEPLOYMENT_BLOCK,
        Number.isFinite(earliestStoredEvent) ? earliestStoredEvent - REORG_OVERLAP_BLOCKS : CONTRACT_DEPLOYMENT_BLOCK,
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

export async function syncMintHistory(options: {
  fullBackfill?: boolean;
  recentFirst?: boolean;
} = {}): Promise<SyncResult> {
  if (activeSync) return activeSync;

  activeSync = (async () => {
    const recentResult = options.recentFirst
      ? await runSync(RECENT_WINDOW_BLOCKS, { recentFirst: true })
      : null;
    const backfillResult = await runSync(
      options.fullBackfill ? INITIAL_BACKFILL_BLOCKS_PER_RUN : CHUNK_SIZE,
    );
    if (!recentResult) return backfillResult;
    return {
      running: false,
      processedFromBlock: backfillResult.processedFromBlock,
      processedToBlock: recentResult.processedToBlock,
      chunks: recentResult.chunks + backfillResult.chunks,
      discovered: recentResult.discovered + backfillResult.discovered,
      inserted: recentResult.inserted + backfillResult.inserted,
      hasMoreHistory: backfillResult.hasMoreHistory,
    };
  })()
    .finally(() => {
      activeSync = null;
    });
  return activeSync;
}

export async function getMintSyncStatus() {
  const [state, recentState, eventCount] = await Promise.all([
    storage.getSyncState(BACKFILL_CURSOR),
    storage.getSyncState(RECENT_CURSOR),
    storage.getMintEventCount(),
  ]);
  return {
    status: activeSync ? "syncing" : state?.lastError || recentState?.lastError ? "error" : "ready",
    eventCount,
    checkpointBlock: state?.lastProcessedBlock ?? null,
    recentCheckpointBlock: recentState?.lastProcessedBlock ?? null,
    lastSuccessfulSyncAt: recentState?.lastSuccessfulSyncAt ?? state?.lastSuccessfulSyncAt ?? null,
    lastAttemptAt: recentState?.lastAttemptAt ?? state?.lastAttemptAt ?? null,
    lastError: recentState?.lastError ?? state?.lastError ?? null,
  };
}