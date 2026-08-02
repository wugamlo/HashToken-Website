import { type User, type InsertUser, type MintEvent, type InsertMintEvent, type SyncState, users, mintEvents, syncStates } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Mint events methods
  getRecentMintEvents(limit?: number): Promise<MintEvent[]>;
  getMintEventsByDateRange(startDate: Date, endDate: Date): Promise<MintEvent[]>;
  insertMintEvent(event: InsertMintEvent): Promise<MintEvent>;
  insertMintEvents(events: InsertMintEvent[]): Promise<number>;
  getMintEventByHash(hash: string): Promise<MintEvent | undefined>;
  getMintEventCount(): Promise<number>;
  getEarliestMintBlock(): Promise<number | undefined>;
  getSyncState(chain?: string): Promise<SyncState | undefined>;
  saveSyncSuccess(lastProcessedBlock: number, chain?: string): Promise<SyncState>;
  saveSyncFailure(message: string, chain?: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }



  async getRecentMintEvents(limit: number = 50): Promise<MintEvent[]> {
    const events = await db
      .select()
      .from(mintEvents)
      .orderBy(desc(mintEvents.timestamp))
      .limit(limit);
    return events;
  }

  async getMintEventsByDateRange(startDate: Date, endDate: Date): Promise<MintEvent[]> {
    const events = await db
      .select()
      .from(mintEvents)
      .where(
        and(gte(mintEvents.timestamp, startDate), lte(mintEvents.timestamp, endDate))
      )
      .orderBy(desc(mintEvents.timestamp));
    return events;
  }

  async insertMintEvent(event: InsertMintEvent): Promise<MintEvent> {
    const [newEvent] = await db
      .insert(mintEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async insertMintEvents(events: InsertMintEvent[]): Promise<number> {
    if (!events.length) return 0;

    const inserted = await db
      .insert(mintEvents)
      .values(events)
      .onConflictDoNothing({ target: mintEvents.transactionHash })
      .returning({ id: mintEvents.id });
    return inserted.length;
  }

  async getMintEventByHash(hash: string): Promise<MintEvent | undefined> {
    const [event] = await db
      .select()
      .from(mintEvents)
      .where(eq(mintEvents.transactionHash, hash));
    return event || undefined;
  }

  async getMintEventCount(): Promise<number> {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(mintEvents);
    return row?.count ?? 0;
  }

  async getEarliestMintBlock(): Promise<number | undefined> {
    const [row] = await db
      .select({ min: sql<number | null>`min(${mintEvents.blockNumber})::int` })
      .from(mintEvents);
    return row?.min ?? undefined;
  }

  async getSyncState(chain: string = "ethereum-mainnet"): Promise<SyncState | undefined> {
    const [state] = await db
      .select()
      .from(syncStates)
      .where(eq(syncStates.chain, chain));
    return state;
  }

  async saveSyncSuccess(lastProcessedBlock: number, chain: string = "ethereum-mainnet"): Promise<SyncState> {
    const now = new Date();
    const [state] = await db
      .insert(syncStates)
      .values({
        chain,
        lastProcessedBlock,
        lastSuccessfulSyncAt: now,
        lastAttemptAt: now,
        lastError: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: syncStates.chain,
        set: {
          lastProcessedBlock,
          lastSuccessfulSyncAt: now,
          lastAttemptAt: now,
          lastError: null,
          updatedAt: now,
        },
      })
      .returning();
    return state;
  }

  async saveSyncFailure(message: string, chain: string = "ethereum-mainnet"): Promise<void> {
    const now = new Date();
    await db
      .insert(syncStates)
      .values({
        chain,
        lastAttemptAt: now,
        lastError: message.slice(0, 1000),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: syncStates.chain,
        set: {
          lastAttemptAt: now,
          lastError: message.slice(0, 1000),
          updatedAt: now,
        },
      });
  }
}

export const storage = new DatabaseStorage();