import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const contractState = pgTable("contract_state", {
  id: serial("id").primaryKey(),
  blockNumber: integer("block_number").notNull(),
  maxValue: text("max_value").notNull(),
  prevHash: text("prev_hash").notNull(),
  totalSupply: text("total_supply").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertContractStateSchema = createInsertSchema(contractState).pick({
  blockNumber: true,
  maxValue: true,
  prevHash: true,
  totalSupply: true,
});

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
export type ContractState = typeof contractState.$inferSelect;
export type InsertContractState = z.infer<typeof insertContractStateSchema>;
export type MintEvent = typeof mintEvents.$inferSelect;
export type InsertMintEvent = z.infer<typeof insertMintEventSchema>;
