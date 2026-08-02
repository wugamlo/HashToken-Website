import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { type User, type InsertUser, type MintEvent, type InsertMintEvent } from "@shared/schema";
import { type IStorage } from "./storage";

interface StorageData {
  users: User[];
  mintEvents: MintEvent[];
  nextIds: {
    users: number;
    mintEvents: number;
  };
}

export class MemoryStorage implements IStorage {
  private data: StorageData = {
    users: [],
    mintEvents: [],
    nextIds: {
      users: 1,
      mintEvents: 1,
    },
  };

  private dataFile = join(process.cwd(), 'storage-data.json');

  constructor() {
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (existsSync(this.dataFile)) {
        const fileContent = readFileSync(this.dataFile, 'utf-8');
        if (fileContent.trim()) {
          this.data = JSON.parse(fileContent, (key, value) => {
            // Convert timestamp strings back to Date objects
            if (key === 'timestamp' || key === 'lastUpdated') {
              return new Date(value);
            }
            return value;
          });
          console.log(`Loaded data from ${this.dataFile}: ${this.data.mintEvents.length} mint events, ${this.data.users.length} users`);
        } else {
          console.log('Empty data file, starting with fresh data');
        }
      }
    } catch (error) {
      console.error('Error loading data from file:', error);
    }
  }

  private saveToFile(): void {
    try {
      writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving data to file:', error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.data.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.data.users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.data.nextIds.users++,
      ...insertUser,
    };
    this.data.users.push(newUser);
    this.saveToFile();
    return newUser;
  }



  async getRecentMintEvents(limit: number = 50): Promise<MintEvent[]> {
    // Sort by timestamp descending and limit results
    const sorted = [...this.data.mintEvents].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return sorted.slice(0, limit);
  }

  async getMintEventsByDateRange(startDate: Date, endDate: Date): Promise<MintEvent[]> {
    const filtered = this.data.mintEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= startDate && eventDate <= endDate;
    });
    // Sort by timestamp descending
    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async insertMintEvent(event: InsertMintEvent): Promise<MintEvent> {
    const newEvent: MintEvent = {
      id: this.data.nextIds.mintEvents++,
      ...event,
      gasUsed: event.gasUsed ?? null,
      gasPrice: event.gasPrice ?? null,
      difficulty: event.difficulty ?? null,
      expectedAttempts: event.expectedAttempts ?? null,
    };
    this.data.mintEvents.push(newEvent);
    this.saveToFile();
    return newEvent;
  }

  // Batch insert for better performance during migration
  async insertMintEventsBatch(events: InsertMintEvent[]): Promise<MintEvent[]> {
    const newEvents: MintEvent[] = events.map(event => ({
      id: this.data.nextIds.mintEvents++,
      ...event,
      gasUsed: event.gasUsed ?? null,
      gasPrice: event.gasPrice ?? null,
      difficulty: event.difficulty ?? null,
      expectedAttempts: event.expectedAttempts ?? null,
    }));
    this.data.mintEvents.push(...newEvents);
    this.saveToFile();
    return newEvents;
  }

  async getMintEventByHash(hash: string): Promise<MintEvent | undefined> {
    return this.data.mintEvents.find(event => event.transactionHash === hash);
  }

  async insertMintEvents(events: InsertMintEvent[]): Promise<number> {
    const newEvents = events.filter((event) => !this.data.mintEvents.some(
      (existing) => existing.transactionHash === event.transactionHash,
    ));
    await this.insertMintEventsBatch(newEvents);
    return newEvents.length;
  }

  async getMintEventCount(): Promise<number> {
    return this.data.mintEvents.length;
  }

  async getEarliestMintBlock(): Promise<number | undefined> {
    if (!this.data.mintEvents.length) return undefined;
    return this.data.mintEvents.reduce(
      (minimum, event) => Math.min(minimum, event.blockNumber),
      Number.MAX_SAFE_INTEGER,
    );
  }

  async getSyncState() {
    return undefined;
  }

  async saveSyncSuccess(): Promise<never> {
    throw new Error("MemoryStorage does not support durable sync checkpoints");
  }

  async saveSyncFailure(): Promise<void> {
    // Kept only for backwards compatibility; MemoryStorage is no longer active.
  }

  // Utility methods for data migration
  async exportToJSON(): Promise<StorageData> {
    return JSON.parse(JSON.stringify(this.data));
  }

  async importFromJSON(data: StorageData): Promise<void> {
    this.data = data;
    this.saveToFile();
  }

  async clearAllData(): Promise<void> {
    this.data = {
      users: [],
      mintEvents: [],
      nextIds: {
        users: 1,
        mintEvents: 1,
      },
    };
    this.saveToFile();
  }
}