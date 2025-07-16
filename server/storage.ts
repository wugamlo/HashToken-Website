import { type User, type InsertUser, type MintEvent, type InsertMintEvent } from "@shared/schema";
import { MemoryStorage } from "./memory-storage";
// Keep the old DatabaseStorage for migration purposes if needed
import { users, mintEvents } from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Mint events methods
  getRecentMintEvents(limit?: number): Promise<MintEvent[]>;
  getMintEventsByDateRange(startDate: Date, endDate: Date): Promise<MintEvent[]>;
  insertMintEvent(event: InsertMintEvent): Promise<MintEvent>;
  getMintEventByHash(hash: string): Promise<MintEvent | undefined>;
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
        gte(mintEvents.timestamp, startDate)
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

  async getMintEventByHash(hash: string): Promise<MintEvent | undefined> {
    const [event] = await db
      .select()
      .from(mintEvents)
      .where(eq(mintEvents.transactionHash, hash));
    return event || undefined;
  }
}

export const storage = new MemoryStorage();