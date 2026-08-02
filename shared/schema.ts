import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Contract state removed - data is now calculated live from blockchain

export const mintEvents = pgTable("mint_events", {
  id: serial("id").primaryKey(),
  blockNumber: integer("block_number").notNull(),
  transactionHash: text("transaction_hash").unique().notNull(),
  minter: text("minter").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  gasUsed: text("gas_used"),
  gasPrice: text("gas_price"),
  difficulty: text("difficulty"),
  expectedAttempts: text("expected_attempts"),
});

export const syncStates = pgTable("sync_states", {
  id: serial("id").primaryKey(),
  chain: text("chain").notNull().unique(),
  lastProcessedBlock: integer("last_processed_block").notNull().default(0),
  lastSuccessfulSyncAt: timestamp("last_successful_sync_at"),
  lastAttemptAt: timestamp("last_attempt_at"),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Contract state schema removed - data is now calculated live

export const insertMintEventSchema = createInsertSchema(mintEvents).pick({
  blockNumber: true,
  transactionHash: true,
  minter: true,
  timestamp: true,
  gasUsed: true,
  gasPrice: true,
  difficulty: true,
  expectedAttempts: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type MintEvent = typeof mintEvents.$inferSelect;
export type InsertMintEvent = z.infer<typeof insertMintEventSchema>;
export type SyncState = typeof syncStates.$inferSelect;
