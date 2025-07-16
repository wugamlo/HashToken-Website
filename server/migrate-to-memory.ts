import { DatabaseStorage } from "./storage";
import { MemoryStorage } from "./memory-storage";

export async function migrateToMemoryStorage(): Promise<void> {
  console.log("Starting migration from PostgreSQL to memory storage...");
  
  const dbStorage = new DatabaseStorage();
  const memoryStorage = new MemoryStorage();
  
  try {
    // Clear existing memory storage
    await memoryStorage.clearAllData();
    
    // Migrate mint events
    console.log("Migrating mint events...");
    const allMintEvents = await dbStorage.getRecentMintEvents(10000); // Get all events
    console.log(`Found ${allMintEvents.length} mint events to migrate`);
    
    // Process in batches for better performance
    const batchSize = 100;
    for (let i = 0; i < allMintEvents.length; i += batchSize) {
      const batch = allMintEvents.slice(i, i + batchSize);
      const insertEvents = batch.map(event => ({
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        minter: event.minter,
        timestamp: event.timestamp,
        gasUsed: event.gasUsed || '',
        gasPrice: event.gasPrice || '',
        difficulty: event.difficulty || '',
        expectedAttempts: event.expectedAttempts || '',
      }));
      
      await memoryStorage.insertMintEventsBatch(insertEvents);
      if (i % 500 === 0) {
        console.log(`Migrated ${i + batch.length} of ${allMintEvents.length} events`);
      }
    }
    
    // Note: We're not migrating users since they're likely not critical
    // and authentication can be rebuilt if needed
    // Note: Contract states are no longer stored - they're calculated live from blockchain
    
    console.log("Migration completed successfully!");
    console.log(`- ${allMintEvents.length} mint events migrated`);
    
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToMemoryStorage()
    .then(() => {
      console.log("Migration script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}