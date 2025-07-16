import { storage } from "./storage";
import { readFileSync } from "fs";
import { join } from "path";

interface CSVMintTransaction {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  status: string;
  method: string;
}

// Store historical transaction hashes to avoid double counting
let historicalTransactionHashes: Set<string> | null = null;

export function loadHistoricalTransactionHashes(): Set<string> {
  if (historicalTransactionHashes) {
    return historicalTransactionHashes;
  }
  
  try {
    const transactionHashes = new Set<string>();
    
    // Load the main CSV file (correction file has 100% overlap with main file)
    const csvFiles = [
      'export-0xE5544a2A5fA9b175da60D8Eec67adD5582bB31b0 (3)_1752637289868.csv'
    ];
    
    let totalProcessed = 0;
    
    for (const csvFile of csvFiles) {
      const csvPath = join(process.cwd(), 'attached_assets', csvFile);
      const csvContent = readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n');
      
      // Skip header line, process each transaction
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV line - handle both quoted and unquoted formats
        const fields = line.split(',');
        if (fields.length >= 16) {
          const transactionHash = fields[0].replace(/"/g, ''); // Remove quotes if present
          const status = fields[13].replace(/"/g, ''); // Status field (index 13)
          const errCode = fields[14].replace(/"/g, ''); // ErrCode field (index 14)
          const method = fields[15].replace(/"/g, ''); // Method field (index 15)
          
          // Only count successful mint transactions (Status = blank, ErrCode = blank, Method = Mint)
          if (method === 'Mint' && status === '' && errCode === '') {
            transactionHashes.add(transactionHash.toLowerCase());
          }
        }
      }
      
      totalProcessed += lines.length - 1;
      console.log(`Processed ${lines.length - 1} lines from ${csvFile}`);
    }
    
    console.log(`Total processed ${totalProcessed} lines from ${csvFiles.length} CSV files, found ${transactionHashes.size} successful mint transactions`);
    
    historicalTransactionHashes = transactionHashes;
    console.log(`Loaded ${transactionHashes.size} historical transaction hashes from CSV files`);
    return transactionHashes;
  } catch (error) {
    console.error("Error loading historical transaction hashes:", error);
    historicalTransactionHashes = new Set();
    return historicalTransactionHashes;
  }
}

export function getHistoricalMintCount(): number {
  const hashes = loadHistoricalTransactionHashes();
  return hashes.size;
}

export function isHistoricalTransaction(transactionHash: string): boolean {
  const hashes = loadHistoricalTransactionHashes();
  return hashes.has(transactionHash.toLowerCase());
}

export async function migrateHistoricalTransactions(): Promise<number> {
  try {
    let migratedCount = 0;
    
    // Process the main CSV file (correction file has 100% overlap with main file)
    const csvFiles = [
      'export-0xE5544a2A5fA9b175da60D8Eec67adD5582bB31b0 (3)_1752637289868.csv'
    ];
    
    for (const csvFile of csvFiles) {
      const csvPath = join(process.cwd(), 'attached_assets', csvFile);
      const csvContent = readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n');
      
      // Skip header line, process each transaction
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV line - handle both quoted and unquoted formats
        const fields = line.split(',');
        if (fields.length >= 16) {
          const transactionHash = fields[0].replace(/"/g, ''); // Remove quotes if present
          const blockNumber = parseInt(fields[1].replace(/"/g, ''));
          const timestamp = parseInt(fields[2].replace(/"/g, ''));
          const from = fields[4].replace(/"/g, '');
          const status = fields[13].replace(/"/g, ''); // Status field (index 13)
          const method = fields[15].replace(/"/g, ''); // Method field (index 15)
          
          // Only migrate successful mint transactions (Status = blank, Method = Mint)
          if (method === 'Mint' && status === '') {
            // Check if transaction already exists in database
            const existing = await storage.getMintEventByHash(transactionHash);
            if (!existing) {
              // Insert the historical transaction
              await storage.insertMintEvent({
                blockNumber,
                transactionHash,
                minter: from,
                timestamp: new Date(timestamp * 1000),
                gasUsed: '',
                gasPrice: '',
                difficulty: '',
                expectedAttempts: '',
              });
              migratedCount++;
            }
          }
        }
      }
      
      console.log(`Processed ${csvFile} for migration`);
    }
    
    console.log(`Successfully migrated ${migratedCount} historical transactions to database`);
    return migratedCount;
  } catch (error) {
    console.error("Error migrating historical transactions:", error);
    return 0;
  }
}