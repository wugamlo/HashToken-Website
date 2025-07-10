// Debug script to test hash calculation manually
import pkg from 'js-sha3';
const { keccak256 } = pkg;

// Test values - user's actual contract value
const maxValue = BigInt("178352154310923568934782825455846174252727713524957781003412386523589");
const prevHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

console.log("=== Hash Calculation Debug ===");
console.log("Max Value:", maxValue.toString());
console.log("Max Value Hex:", "0x" + maxValue.toString(16));
console.log("Prev Hash:", prevHash);

// Test a few calculations
for (let i = 1; i <= 5; i++) {
  const testValue = "0x" + i.toString(16).padStart(64, '0');
  console.log(`\n--- Test ${i} ---`);
  console.log("Input Value:", testValue);
  
  // Remove 0x and convert to bytes
  const valueBytes = Buffer.from(testValue.slice(2), 'hex');
  const prevHashBytes = Buffer.from(prevHash.slice(2), 'hex');
  
  // Concatenate and hash
  const combined = Buffer.concat([valueBytes, prevHashBytes]);
  const hashHex = keccak256(combined);
  const fullHash = "0x" + hashHex;
  
  console.log("Combined bytes length:", combined.length);
  console.log("Calculated Hash:", fullHash);
  
  const hashValue = BigInt(fullHash);
  const isValid = hashValue <= maxValue;
  
  console.log("Hash as BigInt:", hashValue.toString());
  console.log("Is Valid (hash <= maxValue):", isValid);
  console.log("Comparison:", hashValue <= maxValue ? "PASS" : "FAIL");
}

// Test the maximum possible hash
const maxPossibleHash = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
const probability = Number(maxValue * BigInt(100000)) / Number(maxPossibleHash) / 100000;
console.log("\n=== Probability Analysis ===");
console.log("Max possible hash:", maxPossibleHash.toString());
console.log("Success probability:", probability);
console.log("Expected attempts:", Math.ceil(1 / probability));