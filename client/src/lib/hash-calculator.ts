import { keccak256 } from 'js-sha3';

export interface CalculationParams {
  maxValue: string;
  prevHash: string;
  maxSolutions: number;
  searchMethod: string;
}

export interface HashSolution {
  inputValue: string;
  calculatedHash: string;
  hashValue: string;
  isValid: boolean;
}

export interface CalculationProgress {
  attempts: number;
  solutions: HashSolution[];
  isRunning: boolean;
  progress: number;
  rate: number;
  elapsedTime: number;
}

export class HashCalculator {
  private isRunning = false;
  private startTime = 0;
  private attempts = 0;
  private solutions: HashSolution[] = [];
  private onProgressUpdate?: (progress: CalculationProgress) => void;
  private maxValue = BigInt(0);
  private prevHash = '';
  private maxSolutions = 5;
  private searchMethod = 'random';

  constructor(onProgressUpdate?: (progress: CalculationProgress) => void) {
    this.onProgressUpdate = onProgressUpdate;
  }

  private normalizeHexString(hex: string): string {
    // Remove 0x prefix if present
    hex = hex.startsWith('0x') ? hex.slice(2) : hex;
    // Pad to 64 characters (32 bytes)
    return '0x' + hex.padStart(64, '0');
  }

  private generateRandomBytes32(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private generateIncrementalValue(attempt: number): string {
    // Convert attempt number to hex and pad to 32 bytes
    const hex = attempt.toString(16).padStart(64, '0');
    return '0x' + hex;
  }

  private calculateHash(value: string, prevHash: string): string {
    // Remove 0x prefix for calculation
    const valueHex = value.startsWith('0x') ? value.slice(2) : value;
    const prevHashHex = prevHash.startsWith('0x') ? prevHash.slice(2) : prevHash;
    
    // Convert hex strings to bytes
    const valueBytes = Buffer.from(valueHex, 'hex');
    const prevHashBytes = Buffer.from(prevHashHex, 'hex');
    
    // Concatenate bytes (value + prevHash as per contract sha3(value, prev_hash))
    const combined = Buffer.concat([valueBytes, prevHashBytes]);
    
    // Calculate keccak256 hash
    const hashHex = keccak256(combined);
    return '0x' + hashHex;
  }

  private isValidSolution(calculatedHash: string, maxValue: BigInt): boolean {
    // Convert hash to BigInt for comparison
    const hashValue = BigInt(calculatedHash);
    return hashValue > maxValue;
  }

  private updateProgress(): void {
    if (!this.onProgressUpdate) return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = elapsed > 0 ? Math.floor(this.attempts / elapsed) : 0;
    const progress = Math.min((this.attempts / 100000) * 100, 100);

    this.onProgressUpdate({
      attempts: this.attempts,
      solutions: [...this.solutions],
      isRunning: this.isRunning,
      progress,
      rate,
      elapsedTime: Math.floor(elapsed)
    });
  }

  async startCalculation(params: CalculationParams): Promise<void> {
    this.isRunning = true;
    this.startTime = Date.now();
    this.attempts = 0;
    this.solutions = [];
    
    // Parse parameters
    this.maxValue = BigInt(params.maxValue.startsWith('0x') ? params.maxValue : params.maxValue);
    this.prevHash = this.normalizeHexString(params.prevHash);
    this.maxSolutions = params.maxSolutions;
    this.searchMethod = params.searchMethod;

    // Start calculation loop
    return new Promise((resolve) => {
      const calculate = () => {
        if (!this.isRunning) {
          resolve();
          return;
        }

        // Process batch of attempts
        const batchSize = 100;
        for (let i = 0; i < batchSize && this.isRunning; i++) {
          this.attempts++;

          // Generate input value based on search method
          const inputValue = this.searchMethod === 'random' 
            ? this.generateRandomBytes32()
            : this.generateIncrementalValue(this.attempts);

          // Calculate hash
          const calculatedHash = this.calculateHash(inputValue, this.prevHash);

          // Check if valid
          if (this.isValidSolution(calculatedHash, this.maxValue)) {
            const solution: HashSolution = {
              inputValue,
              calculatedHash,
              hashValue: calculatedHash,
              isValid: true
            };
            
            this.solutions.push(solution);

            // Stop if we found enough solutions
            if (this.solutions.length >= this.maxSolutions) {
              this.isRunning = false;
              this.updateProgress();
              resolve();
              return;
            }
          }

          // Stop if we've tried too many attempts
          if (this.attempts >= 1000000) {
            this.isRunning = false;
            this.updateProgress();
            resolve();
            return;
          }
        }

        // Update progress
        this.updateProgress();

        // Continue calculation
        if (this.isRunning) {
          setTimeout(calculate, 10);
        } else {
          resolve();
        }
      };

      calculate();
    });
  }

  stopCalculation(): void {
    this.isRunning = false;
  }

  getCurrentProgress(): CalculationProgress {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = elapsed > 0 ? Math.floor(this.attempts / elapsed) : 0;
    const progress = Math.min((this.attempts / 100000) * 100, 100);

    return {
      attempts: this.attempts,
      solutions: [...this.solutions],
      isRunning: this.isRunning,
      progress,
      rate,
      elapsedTime: Math.floor(elapsed)
    };
  }
}
