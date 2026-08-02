import { readFile } from "fs/promises";
import { join } from "path";
import { storage } from "./storage";
import type { InsertMintEvent } from "@shared/schema";

type JsonHistory = {
  mintEvents?: Array<{
    blockNumber: number;
    transactionHash: string;
    minter: string;
    timestamp: string | Date;
    gasUsed?: string | null;
    gasPrice?: string | null;
    difficulty?: string | null;
    expectedAttempts?: string | null;
  }>;
};

const BATCH_SIZE = 500;

export async function importJsonHistory(): Promise<number> {
  const filePath = join(process.cwd(), "storage-data.json");
  const contents = await readFile(filePath, "utf8");
  const parsed = JSON.parse(contents) as JsonHistory;
  const events = parsed.mintEvents ?? [];
  let inserted = 0;

  for (let index = 0; index < events.length; index += BATCH_SIZE) {
    const batch: InsertMintEvent[] = events.slice(index, index + BATCH_SIZE).map((event) => ({
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      minter: event.minter,
      timestamp: new Date(event.timestamp),
      gasUsed: event.gasUsed ?? null,
      gasPrice: event.gasPrice ?? null,
      difficulty: event.difficulty ?? null,
      expectedAttempts: event.expectedAttempts ?? null,
    }));
    inserted += await storage.insertMintEvents(batch);
  }

  console.log(`Imported ${inserted} preserved mint records from storage-data.json`);
  return inserted;
}