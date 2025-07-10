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
    // Load the CSV file and extract transaction hashes for successful mints
    const csvPath = join(process.cwd(), 'attached_assets', 'export-0xe5544a2a5fa9b175da60d8eec67add5582bb31b0 (2)_1752124024243.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    const transactionHashes = new Set<string>();
    
    // Skip header line, process each transaction
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line - simple split by comma (fields are quoted)
      const fields = line.split(',');
      if (fields.length >= 16) {
        const transactionHash = fields[0].replace(/"/g, ''); // Remove quotes
        const status = fields[13].replace(/"/g, ''); // Status field (index 13)
        const method = fields[15].replace(/"/g, ''); // Method field (index 15)
        
        // Only count successful mint transactions (Status = blank, Method = Mint)
        if (method === 'Mint' && status === '') {
          transactionHashes.add(transactionHash.toLowerCase());
        }
      }
    }
    
    console.log(`Processed ${lines.length - 1} lines from CSV, found ${transactionHashes.size} successful mint transactions`);
    
    historicalTransactionHashes = transactionHashes;
    console.log(`Loaded ${transactionHashes.size} historical transaction hashes from CSV`);
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
    const csvPath = join(process.cwd(), 'attached_assets', 'export-0xe5544a2a5fa9b175da60d8eec67add5582bb31b0 (2)_1752124024243.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    let migratedCount = 0;
    
    // Skip header line, process each transaction
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line - simple split by comma (fields are quoted)
      const fields = line.split(',');
      if (fields.length >= 16) {
        const transactionHash = fields[0].replace(/"/g, ''); // Remove quotes
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
    
    console.log(`Successfully migrated ${migratedCount} historical transactions to database`);
    return migratedCount;
  } catch (error) {
    console.error("Error migrating historical transactions:", error);
    return 0;
  }
}