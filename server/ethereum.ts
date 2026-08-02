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
export const CONTRACT_DEPLOYMENT_BLOCK = 1_763_185;

// Use free public RPC providers
const RPC_PROVIDERS = [
  "https://ethereum.publicnode.com",
  "https://cloudflare-eth.com",
  "https://rpc.flashbots.net",
  "https://eth.llamarpc.com",
];

let provider: ethers.JsonRpcProvider | undefined;
let contract: ethers.Contract | undefined;
let providerUrl: string | undefined;

export async function initializeProvider() {
  for (const rpcUrl of RPC_PROVIDERS) {
    try {
      const candidate = new ethers.JsonRpcProvider(rpcUrl);
      await candidate.getBlockNumber();
      provider = candidate;
      contract = new ethers.Contract(CONTRACT_ADDRESS, HASH_TOKEN_ABI, candidate);
      providerUrl = rpcUrl;
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

async function withProviderFailover<T>(action: (activeProvider: ethers.JsonRpcProvider, activeContract: ethers.Contract) => Promise<T>): Promise<T> {
  const orderedProviders = providerUrl
    ? [providerUrl, ...RPC_PROVIDERS.filter((url) => url !== providerUrl)]
    : RPC_PROVIDERS;
  let lastError: unknown;

  for (const rpcUrl of orderedProviders) {
    try {
      const candidate = new ethers.JsonRpcProvider(rpcUrl);
      const candidateContract = new ethers.Contract(CONTRACT_ADDRESS, HASH_TOKEN_ABI, candidate);
      const result = await action(candidate, candidateContract);
      provider = candidate;
      contract = candidateContract;
      providerUrl = rpcUrl;
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`Ethereum RPC ${rpcUrl} failed; trying next provider.`, error);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No Ethereum RPC provider is available");
}

export async function getCurrentContractState() {
  try {
    const { maxValue, prevHash, currentBlock, totalSupply } = await withProviderFailover(async (activeProvider, activeContract) => {
      const [maxValue, prevHash, currentBlock, totalSupply] = await Promise.all([
        activeContract.max_value(),
        activeContract.prev_hash(),
        activeProvider.getBlockNumber(),
        activeContract.totalSupply(),
      ]);
      return { maxValue, prevHash, currentBlock, totalSupply };
    });

    // Get total supply from contract - but this might return 0 for this historical contract
    let mintCount = Number(totalSupply) / 1e18;
    
    // If totalSupply is 0, fall back to counting mint events in our database
    if (mintCount === 0) {
      // This is a fallback - we'll need to get the count from our database
      mintCount = 0; // Will be updated by the route handler
    }

    return {
      maxValue: maxValue.toString(),
      prevHash: prevHash,
      totalSupply: totalSupply.toString(),
      blockNumber: currentBlock,
      totalMints: mintCount,
    };
  } catch (error) {
    console.error("Error fetching contract state:", error);
    throw error;
  }
}

export type ChainMintEvent = {
  blockNumber: number;
  transactionHash: string;
  minter: string;
  timestamp: Date;
  gasUsed: string;
  gasPrice: string;
};

export async function getLatestBlockNumber() {
  return withProviderFailover((activeProvider) => activeProvider.getBlockNumber());
}

export async function fetchMintEvents(fromBlock: number, toBlock: number): Promise<ChainMintEvent[]> {
  return withProviderFailover(async (activeProvider, activeContract) => {
    const filter = activeContract.filters.Mint();
    const events = await activeContract.queryFilter(filter, fromBlock, toBlock);
    const mintEvents = await Promise.all(events.map(async (event) => {
      const [block, tx, receipt] = await Promise.all([
        activeProvider.getBlock(event.blockNumber),
        activeProvider.getTransaction(event.transactionHash),
        activeProvider.getTransactionReceipt(event.transactionHash),
      ]);
      if (!block || tx?.to?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) return null;
      return {
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        minter: String((event as ethers.EventLog).args?.[0] ?? ""),
        timestamp: new Date(block.timestamp * 1000),
        gasUsed: receipt?.gasUsed?.toString() ?? "",
        gasPrice: tx?.gasPrice?.toString() ?? "",
      };
    }));
    return mintEvents.filter((event): event is ChainMintEvent => event !== null)
      .sort((a, b) => a.blockNumber - b.blockNumber);
  });
}

export function calculateSupplyFromMaxValue(maxValue: string): number {
  try {
    const currentMaxValue = BigInt(maxValue);
    // From contract: max_value = 2 ** 255 (line 61 in contract)
    const initialMaxValue = BigInt(1) << BigInt(255);
    
    // Each mint reduces max_value by 1% (multiplies by 0.99)
    // So: current_max_value = initial_max_value * (0.99)^supply
    // Therefore: supply = log(current_max_value / initial_max_value) / log(0.99)
    
    // Use floating point for logarithm calculation
    const ratio = Number(currentMaxValue) / Number(initialMaxValue);
    const supply = Math.log(ratio) / Math.log(0.99);
    
    return Math.round(supply);
  } catch (error) {
    console.error("Error calculating supply from max_value:", error);
    return 0;
  }
}

export function calculateExpectedAttempts(maxValue: string): string {
  try {
    const maxValueBigInt = BigInt(maxValue);
    const maxPossible = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    // Calculate expected attempts: 2^256 / maxValue
    // This gives us the statistical expected number of attempts to find a valid hash
    const ratio = maxPossible / maxValueBigInt;
    
    // Calculate expected attempts based on statistical probability
    // This gives us the expected number of attempts to find a valid hash
    const baseRatio = Number(ratio);
    
    // Based on miner feedback, the calculation should show millions, not billions
    // Current raw calculation gives ~718K, multiply by 1000 to get ~718M (millions)
    const correctedRatio = baseRatio;
    
    return correctedRatio.toExponential();
  } catch (error) {
    console.error("Error calculating expected attempts:", error);
    return "0";
  }
}

export function calculateDifficulty(maxValue: string): string {
  try {
    const maxValueBigInt = BigInt(maxValue);
    const maxPossible = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'); // 2^256 - 1
    
    // Calculate difficulty as percentage of search space eliminated
    // For very small ratios, we need better precision handling
    
    // Check if the ratio is extremely small (close to 0)
    if (maxValueBigInt * BigInt(1e6) < maxPossible) {
      // For very high difficulties, calculate more precisely
      // difficulty ≈ 100 * (1 - maxValue / 2^256)
      
      // Use decimal approximation: difficulty = 100 - (100 * maxValue / 2^256)
      // Since maxValue is very small compared to 2^256, we can approximate
      const difficulty = 100 - (Number(maxValueBigInt) / Number(maxPossible)) * 100;
      return difficulty.toFixed(6);
    } else {
      // For lower difficulties, use normal calculation
      const ratio = Number(maxValueBigInt) / Number(maxPossible);
      const difficulty = (1 - ratio) * 100;
      return difficulty.toFixed(4);
    }
  } catch (error) {
    console.error("Error calculating difficulty:", error);
    return "0";
  }
}

// Calculate forecasted expected attempts for future tokens
export function calculateForecast(currentMaxValue: string, currentMintCount: number, forecastCounts: number[]): Array<{
  tokenNumber: number;
  expectedAttempts: string;
  difficulty: string;
  maxValue: string;
}> {
  try {
    const currentMaxValueBigInt = BigInt(currentMaxValue);
    
    // HashToken difficulty progression: each mint reduces max_value by approximately 1%
    // Based on the contract logic: new_max_value = prev_max_value * 99 / 100
    const difficultyFactor = BigInt(99);
    const difficultyDivisor = BigInt(100);
    
    const forecasts = [];
    
    for (const futureCount of forecastCounts) {
      const mintsAhead = futureCount;
      
      // Calculate future max_value after 'mintsAhead' more mints
      let futureMaxValue = currentMaxValueBigInt;
      for (let i = 0; i < mintsAhead; i++) {
        futureMaxValue = (futureMaxValue * difficultyFactor) / difficultyDivisor;
      }
      
      const futureExpectedAttempts = calculateExpectedAttempts(futureMaxValue.toString());
      const futureDifficulty = calculateDifficulty(futureMaxValue.toString());
      
      forecasts.push({
        tokenNumber: currentMintCount + mintsAhead,
        expectedAttempts: futureExpectedAttempts,
        difficulty: futureDifficulty,
        maxValue: futureMaxValue.toString()
      });
    }
    
    return forecasts;
  } catch (error) {
    console.error("Error calculating forecast:", error);
    return [];
  }
}