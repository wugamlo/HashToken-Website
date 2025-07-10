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
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      // Fallback for Node.js environment
      for (let i = 0; i < 32; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private generateIncrementalValue(attempt: number): string {
    // Convert attempt number to hex and pad to 32 bytes
    const hex = attempt.toString(16).padStart(64, '0');
    return '0x' + hex;
  }

  private calculateHash(value: string, prevHash: string): string {
    try {
      // Remove 0x prefix for calculation
      const valueHex = value.startsWith('0x') ? value.slice(2) : value;
      const prevHashHex = prevHash.startsWith('0x') ? prevHash.slice(2) : prevHash;
      
      // Validate hex strings
      if (!/^[0-9a-fA-F]+$/.test(valueHex) || !/^[0-9a-fA-F]+$/.test(prevHashHex)) {
        throw new Error(`Invalid hex format: value=${valueHex.slice(0,10)}..., prevHash=${prevHashHex.slice(0,10)}...`);
      }
      
      // Convert hex strings to Uint8Array (browser-compatible)
      const valueBytes = new Uint8Array(valueHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
      const prevHashBytes = new Uint8Array(prevHashHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
      
      // Concatenate bytes (value + prevHash as per contract sha3(value, prev_hash))
      const combined = new Uint8Array(valueBytes.length + prevHashBytes.length);
      combined.set(valueBytes, 0);
      combined.set(prevHashBytes, valueBytes.length);
      
      // Calculate keccak256 hash
      const hashHex = keccak256(combined);
      return '0x' + hashHex;
    } catch (error) {
      console.error('Hash calculation failed:', error);
      throw error;
    }
  }

  private isValidSolution(calculatedHash: string, maxValue: BigInt): boolean {
    try {
      // Convert hash to BigInt for comparison
      const hashValue = BigInt(calculatedHash);
      // CRITICAL FIX: Contract logic is "if (uint(sha3(value, prev_hash)) > max_value) { throw; }"
      // This means for SUCCESS, we need hash <= max_value
      // But the contract SUCCEEDS when hash <= max_value, so our validation is correct
      const isValid = hashValue <= maxValue;
      
      // Enhanced debug logging for early attempts
      if (this.attempts <= 5 || (this.attempts % 50000 === 0)) {
        console.log(`Validation attempt ${this.attempts}:`, {
          calculatedHash,
          hashValue: hashValue.toString().slice(0, 20) + '...',
          maxValue: maxValue.toString().slice(0, 20) + '...',
          isValid,
          note: 'Contract succeeds when hash <= max_value'
        });
      }
      
      return isValid;
    } catch (error) {
      console.error('Hash validation error:', error);
      return false;
    }
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
    
    try {
      // Parse parameters with better error handling
      const maxValueStr = params.maxValue.trim();
      
      // Handle both hex and decimal formats
      if (maxValueStr.startsWith('0x')) {
        this.maxValue = BigInt(maxValueStr);
      } else if (/^\d+$/.test(maxValueStr)) {
        // Pure decimal number
        this.maxValue = BigInt(maxValueStr);
      } else {
        throw new Error(`Invalid max_value format: ${maxValueStr}. Use decimal number or hex (0x...)`);
      }
      
      // Normalize prev_hash
      const prevHashStr = params.prevHash.trim();
      if (!prevHashStr.startsWith('0x')) {
        throw new Error(`prev_hash must start with 0x: ${prevHashStr}`);
      }
      this.prevHash = this.normalizeHexString(prevHashStr);
      
      this.maxSolutions = params.maxSolutions;
      this.searchMethod = params.searchMethod;
      
      console.log('Calculation parameters:', {
        maxValue: this.maxValue.toString(),
        maxValueHex: '0x' + this.maxValue.toString(16),
        prevHash: this.prevHash,
        maxSolutions: this.maxSolutions,
        searchMethod: this.searchMethod
      });

      // Calculate probability of finding a valid solution
      const maxPossibleHash = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      // Convert to scientific notation for proper calculation (as done by other analysis)
      const maxValueScientific = Number(this.maxValue);
      const maxPossibleScientific = Number(maxPossibleHash);
      const expectedAttempts = maxPossibleScientific / maxValueScientific;
      const probability = 1.0 / expectedAttempts;
      console.log('Expected probability of finding valid hash:', probability);
      console.log('Expected attempts needed:', expectedAttempts.toExponential());
      console.log('Expected attempts (billions):', (expectedAttempts / 1e9).toFixed(1), 'billion');
    } catch (error) {
      console.error('Parameter parsing error:', error);
      throw new Error(`Invalid parameters: ${error.message}`);
    }

    // Start calculation loop
    return new Promise((resolve) => {
      const calculate = () => {
        if (!this.isRunning) {
          resolve();
          return;
        }

        // Process batch of attempts (larger batch for better performance)
        const batchSize = 1000;
        for (let i = 0; i < batchSize && this.isRunning; i++) {
          this.attempts++;

          try {
            // Generate input value based on search method
            const inputValue = this.searchMethod === 'random' 
              ? this.generateRandomBytes32()
              : this.generateIncrementalValue(this.attempts);

            // Calculate hash
            const calculatedHash = this.calculateHash(inputValue, this.prevHash);

            // Debug logging for first few attempts
            if (this.attempts <= 3) {
              const isValid = this.isValidSolution(calculatedHash, this.maxValue);
              console.log(`Attempt ${this.attempts}: input=${inputValue.slice(0, 10)}..., hash=${calculatedHash.slice(0, 10)}..., isValid=${isValid}`);
            }

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
          } catch (error) {
            console.error('Hash calculation error:', error);
            // Continue with next attempt
          }

          // Stop if we've tried too many attempts (increased limit)
          if (this.attempts >= 10000000) {
            this.isRunning = false;
            this.updateProgress();
            console.log('Stopped after 10M attempts. This may indicate the max_value is too restrictive.');
            resolve();
            return;
          }
        }

        // Update progress
        this.updateProgress();

        // Continue calculation (reduced delay for faster processing)
        if (this.isRunning) {
          setTimeout(calculate, 1);
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
