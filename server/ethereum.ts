import { ethers } from 'ethers';

// HashToken contract ABI (only the functions we need)
const HASH_TOKEN_ABI = [
  "function max_value() view returns (uint256)",
  "function prev_hash() view returns (bytes32)",
  "function totalSupply() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "event Mint(address indexed minter)"
];

const CONTRACT_ADDRESS = "0xE5544a2A5fA9b175da60D8Eec67adD5582bB31b0";

// Use free public RPC providers
const RPC_PROVIDERS = [
  "https://ethereum.publicnode.com",
  "https://cloudflare-eth.com",
  "https://rpc.flashbots.net",
  "https://eth.llamarpc.com",
];

let provider: ethers.JsonRpcProvider;
let contract: ethers.Contract;

export function initializeProvider() {
  // Try providers in order until one works
  for (const rpcUrl of RPC_PROVIDERS) {
    try {
      provider = new ethers.JsonRpcProvider(rpcUrl);
      contract = new ethers.Contract(CONTRACT_ADDRESS, HASH_TOKEN_ABI, provider);
      console.log(`Connected to Ethereum via ${rpcUrl}`);
      return true;
    } catch (error) {
      console.warn(`Failed to connect to ${rpcUrl}:`, error);
      continue;
    }
  }
  
  console.warn("Could not connect to any Ethereum RPC provider");
  return false;
}

export async function getCurrentContractState() {
  if (!contract) {
    throw new Error("Contract not initialized");
  }

  try {
    const [maxValue, prevHash, totalSupply, currentBlock] = await Promise.all([
      contract.max_value(),
      contract.prev_hash(),
      contract.totalSupply(),
      provider.getBlockNumber()
    ]);

    return {
      maxValue: maxValue.toString(),
      prevHash: prevHash,
      totalSupply: totalSupply.toString(),
      blockNumber: currentBlock,
    };
  } catch (error) {
    console.error("Error fetching contract state:", error);
    throw error;
  }
}

export async function getRecentMintEvents(fromBlock: number = -1000) {
  if (!contract) {
    throw new Error("Contract not initialized");
  }

  try {
    const currentBlock = await provider.getBlockNumber();
    const startBlock = fromBlock < 0 ? currentBlock + fromBlock : fromBlock;
    
    const filter = contract.filters.Mint();
    const events = await contract.queryFilter(filter, startBlock, currentBlock);
    
    const mintEvents = await Promise.all(
      events.map(async (event) => {
        const block = await provider.getBlock(event.blockNumber);
        const tx = await provider.getTransaction(event.transactionHash);
        
        return {
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          minter: event.args?.[0] || "",
          timestamp: new Date(block!.timestamp * 1000),
          gasUsed: tx?.gasLimit?.toString() || "",
          gasPrice: tx?.gasPrice?.toString() || "",
        };
      })
    );

    return mintEvents;
  } catch (error) {
    console.error("Error fetching mint events:", error);
    throw error;
  }
}

export function calculateExpectedAttempts(maxValue: string): string {
  try {
    // Use the same calculation as the frontend
    const maxValueBigInt = BigInt(maxValue);
    const maxPossible = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    // Convert to scientific notation for proper calculation
    const maxValueScientific = Number(maxValueBigInt);
    const maxPossibleScientific = Number(maxPossible);
    const expectedAttempts = maxPossibleScientific / maxValueScientific;
    
    return expectedAttempts.toExponential();
  } catch (error) {
    console.error("Error calculating expected attempts:", error);
    return "0";
  }
}

export function calculateDifficulty(maxValue: string): string {
  try {
    const maxValueBigInt = BigInt(maxValue);
    const maxPossible = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    // Calculate difficulty as a percentage of max possible
    const difficulty = (maxPossible - maxValueBigInt) * BigInt(100) / maxPossible;
    return difficulty.toString();
  } catch (error) {
    console.error("Error calculating difficulty:", error);
    return "0";
  }
}