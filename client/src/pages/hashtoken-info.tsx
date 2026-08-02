import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ExternalLink, RefreshCw, Clock, Hash, TrendingUp, Activity, Database, Zap, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import hashTokenLogo from "@assets/image_1757206689096.png";

interface ContractState {
  blockNumber: number;
  maxValue: string;
  prevHash: string;
  totalSupply: string;
  expectedAttempts: string;
  difficulty: string;
  totalMints?: number;
  isOffline?: boolean;
}

interface MintEvent {
  id: number;
  blockNumber: number;
  transactionHash: string;
  minter: string;
  timestamp: string;
  gasUsed?: string;
  gasPrice?: string;
  difficulty?: string;
  expectedAttempts?: string;
}

interface SyncStatus {
  status: "ready" | "syncing" | "error";
  eventCount: number;
  checkpointBlock: number | null;
  recentCheckpointBlock?: number | null;
  lastSuccessfulSyncAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
}

export default function HashTokenInfo() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: contractState, isLoading: stateLoading, refetch: refetchState } = useQuery<ContractState>({
    queryKey: ['/api/contract/state'],
    refetchInterval: 1 * 60 * 1000, // Refetch every 1 minute (more frequent for supply updates)
    staleTime: 0, // Always consider data stale to force fresh fetches
    refetchOnWindowFocus: true, // Refresh when user focuses the page
    refetchOnMount: true, // Always fetch fresh data on component mount
    gcTime: 0, // Don't cache old data
  });

  const { data: mintEvents, isLoading: eventsLoading, refetch: refetchMintEvents } = useQuery<MintEvent[]>({
    queryKey: ['/api/contract/mint-events'],
    queryFn: () => fetch('/api/contract/mint-events?limit=50').then(res => res.json()),
    refetchInterval: 1 * 60 * 1000, // Refetch every 1 minute
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true, // Refresh when user focuses the page
    refetchOnMount: true, // Always fetch fresh data on component mount
  });

  const { data: historyEvents, refetch: refetchHistory } = useQuery<MintEvent[]>({
    queryKey: ['/api/contract/history'],
    queryFn: () => fetch('/api/contract/history?days=30').then(res => res.json()),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes (less frequent)
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  const { data: miners, refetch: refetchMiners } = useQuery<Array<{address: string, count: number}>>({
    queryKey: ['/api/contract/miners'],
    queryFn: () => fetch('/api/contract/miners').then(res => res.json()),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  const { data: priceData, refetch: refetchPrice } = useQuery<{
    priceUsd: string;
    priceNative: string;
    priceChange24h: number;
    liquidity: number;
    volume24h: number;
    marketCap: number;
    pairAddress: string;
    dexId: string;
    baseToken: any;
    quoteToken: any;
  }>({
    queryKey: ['/api/contract/price'],
    queryFn: () => fetch('/api/contract/price').then(res => res.json()),
    refetchInterval: 3 * 60 * 1000, // Refetch every 3 minutes
    staleTime: 90 * 1000, // Consider data stale after 90 seconds
  });

  const { data: forecastData, refetch: refetchForecast } = useQuery<{
    currentMintCount: number;
    currentMaxValue: string;
    currentExpectedAttempts: string;
    currentDifficulty: string;
    forecasts: Array<{
      tokenNumber: number;
      expectedAttempts: string;
      difficulty: string;
      maxValue: string;
    }>;
  }>({
    queryKey: ['/api/contract/forecast'],
    queryFn: () => fetch('/api/contract/forecast').then(res => res.json()),
    refetchInterval: 1 * 60 * 1000, // Refetch every 1 minute
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true, // Refresh when user focuses the page
    refetchOnMount: true, // Always fetch fresh data on component mount
  });

  const { data: syncStatus, refetch: refetchSyncStatus } = useQuery<SyncStatus>({
    queryKey: ['/api/contract/sync-status'],
    queryFn: () => fetch('/api/contract/sync-status').then(res => res.json()),
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // First sync with blockchain to get new mint events
      await fetch('/api/contract/sync', { method: 'POST' });
      
      // Then invalidate all caches and refetch all queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/contract/state'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/contract/mint-events'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/contract/history'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/contract/miners'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/contract/price'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/contract/forecast'] }),
      ]);
      
      // Also explicitly refetch to ensure immediate updates
      await Promise.all([
        refetchState(),
        refetchMintEvents(),
        refetchHistory(),
        refetchPrice(),
        refetchForecast(),
        refetchSyncStatus(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLargeNumber = (num: string): string => {
    try {
      const bigNum = BigInt(num);
      const numStr = bigNum.toString();
      
      if (numStr.length > 18) {
        return `${numStr.slice(0, 3)}.${numStr.slice(3, 6)}...E${numStr.length - 1}`;
      } else if (numStr.length > 12) {
        return `${numStr.slice(0, 3)}.${numStr.slice(3, 6)}...E${numStr.length - 1}`;
      } else if (numStr.length > 6) {
        return `${numStr.slice(0, 3)}.${numStr.slice(3, 6)}...`;
      }
      return numStr;
    } catch {
      return num;
    }
  };

  const formatTokenAmount = (amount: string): string => {
    try {
      // The totalSupply from our API is already the correct number of tokens
      const num = parseInt(amount);
      return num.toLocaleString();
    } catch {
      return amount;
    }
  };

  const formatExpectedAttempts = (attempts: string): string => {
    try {
      // Handle scientific notation
      const num = parseFloat(attempts);
      if (num >= 1e15) {
        return `${(num / 1e15).toFixed(1)}Q`;
      } else if (num >= 1e12) {
        return `${(num / 1e12).toFixed(1)}T`;
      } else if (num >= 1e9) {
        return `${(num / 1e9).toFixed(1)}B`;
      } else if (num >= 1e6) {
        return `${(num / 1e6).toFixed(1)}M`;
      } else if (num >= 1e3) {
        return `${(num / 1e3).toFixed(1)}K`;
      }
      return num.toFixed(0);
    } catch {
      return attempts;
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    try {
      const diff = parseFloat(difficulty);
      if (diff >= 90) return "bg-red-500";
      if (diff >= 70) return "bg-orange-500";
      if (diff >= 50) return "bg-yellow-500";
      return "bg-green-500";
    } catch {
      return "bg-gray-500";
    }
  };

  if (stateLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-6">
        {/* Mobile Layout - Stack vertically */}
        <div className="block md:hidden">
          <div className="flex justify-end mb-4">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="sm"
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
          
          <div className="flex items-center justify-center space-x-4">
            <img 
              src={hashTokenLogo} 
              alt="HashToken Logo" 
              className="h-20 w-20 rounded-full object-cover"
            />
            <div>
              <h1 className="text-4xl font-bold">HashToken (HTK)</h1>
              <p className="text-lg text-muted-foreground mt-1">First Self-Limiting PoW Token</p>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Side by side */}
        <div className="hidden md:block">
          <div className="relative">
            <div className="flex items-center justify-center space-x-4">
              <img 
                src={hashTokenLogo} 
                alt="HashToken Logo" 
                className="h-20 w-20 rounded-full object-cover"
              />
              <div>
                <h1 className="text-4xl font-bold">HashToken (HTK)</h1>
                <p className="text-lg text-muted-foreground mt-1">First Self-Limiting PoW Token</p>
              </div>
            </div>
            
            {/* Refresh Button - Top Right */}
            <div className="absolute top-0 right-0">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                size="sm"
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics - Moved Above Educational Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Supply */}
        {contractState && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Database className="h-4 w-4" />
                <span>Current Supply</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-green-600">
                  {formatTokenAmount(contractState.totalSupply)}
                </div>
                <div className="text-sm text-muted-foreground">HTK Tokens</div>
                <div className="text-xs text-muted-foreground">1 token per successful mint</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expected Attempts */}
        {contractState && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Hash className="h-4 w-4" />
                <span>Expected Attempts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-red-500">
                  {formatExpectedAttempts(contractState.expectedAttempts)}
                </div>
                <div className="text-sm text-muted-foreground">For Next Mint</div>
                <div className="text-xs text-muted-foreground">Based on current difficulty</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Price */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <TrendingUp className="h-4 w-4" />
              <span>Live Price</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              {priceData && priceData.priceUsd ? (
                <>
                  <div className="text-4xl font-bold text-blue-600">
                    ${parseFloat(priceData.priceUsd).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">USD per HTK</div>
                  {priceData.priceNative && (
                    <div className="text-xs text-muted-foreground">
                      {parseFloat(priceData.priceNative).toFixed(6)} ETH
                    </div>
                  )}
                  {priceData.priceChange24h && (
                    <div className={`text-xs ${priceData.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {priceData.priceChange24h >= 0 ? '+' : ''}{priceData.priceChange24h.toFixed(2)}% (24h)
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-muted-foreground">No Active Trading</div>
                  <div className="text-sm text-muted-foreground">Historic collectible token</div>
                  <div className="text-xs text-muted-foreground">
                    <a href="https://dexscreener.com/ethereum/0x01c0aeaee4f9b9417237aef3556bc1d7bd00ec52" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-blue-500 hover:underline">
                      View on DexScreener
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Market Cap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <DollarSign className="h-4 w-4" />
              <span>Market Cap</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              {priceData && priceData.priceUsd && contractState ? (
                <>
                  <div className="text-4xl font-bold text-purple-600">
                    ${Math.round(parseFloat(priceData.priceUsd) * parseInt(contractState.totalSupply)).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Value</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTokenAmount(contractState.totalSupply)} × ${parseFloat(priceData.priceUsd).toFixed(2)}
                  </div>
                </>
              ) : (
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                  <div className="text-sm text-muted-foreground">No price data</div>
                  <div className="text-xs text-muted-foreground">
                    Requires active trading pairs
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {syncStatus && (
        <Alert variant={syncStatus.status === "error" ? "destructive" : "default"}>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            {syncStatus.status === "error" ? (
              <>Mining history sync needs attention: {syncStatus.lastError || "The latest indexing attempt failed."}</>
            ) : syncStatus.status === "syncing" ? (
              <>Mining history is being synchronized from Ethereum.</>
            ) : (
              <>
                Mining history is stored permanently. {syncStatus.eventCount.toLocaleString()} mint records indexed
                {syncStatus.lastSuccessfulSyncAt && ` · last synchronized ${formatDistanceToNow(new Date(syncStatus.lastSuccessfulSyncAt), { addSuffix: true })}`}.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Educational Content - Moved Below Metrics */}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">Historic Significance</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            HashToken was deployed on <strong>June 17, 2016</strong>, making it the first Ethereum token to implement 
            a self-limiting proof-of-work model. This groundbreaking contract introduced the revolutionary concept of 
            exponentially increasing mining difficulty, where each successful mint makes subsequent tokens progressively 
            harder to mine, creating natural scarcity through computational work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">How It Works</h3>
            <div className="space-y-2 text-muted-foreground">
              <p>• <strong>Self-Limiting PoW:</strong> First token to implement exponentially increasing mining difficulty</p>
              <p>• <strong>Dynamic Scarcity:</strong> Each mint reduces max_value by 1%, creating natural token scarcity</p>
              <p>• <strong>Keccak-256 Hash:</strong> Uses the same hashing algorithm as Ethereum</p>
              <p>• <strong>Exponential Progression:</strong> Mining difficulty compounds by ~1% with each successful mint</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Mining Process</h3>
            <div className="space-y-2 text-muted-foreground">
              <p>• <strong>Find Valid Hash:</strong> Calculate hash(value + prevHash) ≤ maxValue</p>
              <p>• <strong>Submit Solution:</strong> Call mint() with your winning value</p>
              <p>• <strong>Receive Reward:</strong> Get 1 HTK token for successful mining</p>
              <p>• <strong>Increase Difficulty:</strong> Next miner faces 1% harder challenge</p>
            </div>
          </div>
        </div>
      </div>





      {/* Trading & Contract Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Additional Price Info - Only show if we have price data */}
        {priceData && priceData.priceUsd && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Market Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold">
                      ${priceData.liquidity ? (priceData.liquidity / 1000).toFixed(1) + 'K' : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Liquidity</div>
                    <div className="text-xs text-muted-foreground">Total pool liquidity</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold">
                      ${priceData.volume24h ? (
                        priceData.volume24h >= 1000 ? 
                          (priceData.volume24h / 1000).toFixed(1) + 'K' : 
                          priceData.volume24h.toFixed(0)
                      ) : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Volume (24h)</div>
                    <div className="text-xs text-muted-foreground">Trading volume</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold">
                      ${contractState ? 
                        Math.round(parseFloat(priceData.priceUsd) * parseInt(contractState.totalSupply)).toLocaleString() : 
                        'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Market Cap</div>
                    <div className="text-xs text-muted-foreground">Our calculation</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trading & Contract Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ExternalLink className="h-5 w-5" />
              <span>Trading & Contract</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contract Address */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Contract Address</div>
              <a 
                href="https://etherscan.io/address/0xE5544a2A5fA9b175da60D8Eec67adD5582bB31b0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline flex items-center space-x-1"
              >
                <span>0xE5544a...31b0</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <Separator />

            {/* Trading Links */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Trading</div>
              <div className="space-y-2">
                <a 
                  href="https://app.uniswap.org/explore/tokens/ethereum/0xE5544a2A5fA9b175da60D8Eec67adD5582bB31b0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">U</span>
                    </div>
                    <span className="text-sm">Uniswap</span>
                  </div>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a 
                  href="https://www.dextools.io/app/en/ether/pair-explorer/0x01c0aeaee4f9b9417237aef3556bc1d7bd00ec52?t=1752147961143"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">D</span>
                    </div>
                    <span className="text-sm">DexTools</span>
                  </div>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a 
                  href="https://dexscreener.com/ethereum/0x01c0aeaee4f9b9417237aef3556bc1d7bd00ec52"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">S</span>
                    </div>
                    <span className="text-sm">DexScreener</span>
                  </div>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <Separator />

            {/* Token Info */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Token Details</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Symbol: HTK</div>
                <div>Decimals: 16</div>
                <div>Created: June 17, 2016</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="mining" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mining">Mining History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="calculator">Hash Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Hash className="h-5 w-5" />
                <span>Educational Hash Calculator</span>
              </CardTitle>
              <CardDescription>Learn about HashToken mining with our interactive calculator</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Try our educational hash calculator to understand how HashToken mining works.
                    This tool demonstrates the Keccak-256 hashing process and difficulty calculations.
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span>Educational tool for learning purposes</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Button asChild size="lg">
                    <a href="/hash-calculator">
                      <Hash className="h-4 w-4 mr-2" />
                      Open Hash Calculator
                    </a>
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Calculator Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Real-time hash calculations</li>
                    <li>• Difficulty analysis</li>
                    <li>• Performance metrics</li>
                    <li>• Educational explanations</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Learn About</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Keccak-256 hashing</li>
                    <li>• Proof-of-work mining</li>
                    <li>• Difficulty progression</li>
                    <li>• Expected attempts</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mining" className="space-y-6">
          {/* Difficulty Forecast - Moved to top */}
          <Card>
            <CardHeader>
              <CardTitle>Difficulty Forecast</CardTitle>
              <CardDescription>Expected attempts for future token numbers</CardDescription>
            </CardHeader>
            <CardContent>
              {forecastData ? (
                <div className="space-y-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Current Token #{forecastData.currentMintCount}</div>
                    <div className="text-lg font-bold text-blue-500">
                      {formatExpectedAttempts(forecastData.currentExpectedAttempts)}
                    </div>
                    <div className="text-xs text-muted-foreground">Expected attempts</div>
                  </div>
                  
                  <div className="space-y-3">
                    {forecastData.forecasts.map((forecast, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">Token #{forecast.tokenNumber}</span>
                          <span className="text-xs text-muted-foreground">
                            +{forecast.tokenNumber - forecastData.currentMintCount} from current
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-orange-500">
                            {formatExpectedAttempts(forecast.expectedAttempts)}
                          </div>
                          <div className="text-xs text-muted-foreground">expected attempts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-xs text-muted-foreground text-center mt-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    💡 Each mint increases difficulty by ~1%, requiring exponentially more computational work
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mining History</CardTitle>
              <CardDescription>Recent mining events from the HashToken contract</CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : mintEvents && mintEvents.length > 0 ? (
                <div className="space-y-4">
                  {mintEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Block {event.blockNumber.toLocaleString()}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <a 
                          href={`https://etherscan.io/tx/${event.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-sm"
                        >
                          View on Etherscan
                        </a>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Miner:</span> {event.minter}
                        </div>
                        <div>
                          <span className="font-medium">Gas Used:</span> {event.gasUsed || 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No mining events found</p>
                </div>
              )}
            </CardContent>
          </Card>


        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mining Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Mining Statistics</CardTitle>
                <CardDescription>Key metrics about HashToken mining</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {contractState && (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Current Max Value:</span>
                      <span className="text-sm font-mono">{formatLargeNumber(contractState.maxValue)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Expected Attempts:</span>
                      <span className="text-sm font-bold text-orange-500">
                        {formatExpectedAttempts(contractState.expectedAttempts)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Total Mints:</span>
                      <span className="text-sm">{contractState.totalMints?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Current Block:</span>
                      <span className="text-sm font-mono">{contractState.blockNumber.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Difficulty Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Difficulty Analysis</CardTitle>
                <CardDescription>Understanding HashToken mining difficulty</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Mining Mechanism</h4>
                    <p className="text-sm text-muted-foreground">
                      HashToken uses a proof-of-work system where miners must find a hash value less than or equal to max_value.
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Difficulty Progression</h4>
                    <p className="text-sm text-muted-foreground">
                      After each successful mint, max_value decreases by 1%, making subsequent mints exponentially harder.
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Historical Context</h4>
                    <p className="text-sm text-muted-foreground">
                      Created in 2016, HashToken pioneered the self-limiting PoW model on Ethereum, introducing exponential difficulty scaling that creates natural token scarcity.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mining Activity Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Mining Activity Analysis</CardTitle>
              <CardDescription>Recent mining activity and miner distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {miners?.length || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Unique Miners</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {contractState?.totalMints?.toLocaleString() || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Mints</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {mintEvents && mintEvents.length > 0 ? 
                        new Date(mintEvents[0].timestamp).toLocaleDateString() : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">Latest Mint</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {contractState ? formatExpectedAttempts(contractState.expectedAttempts) : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Current Difficulty</div>
                  </div>
                </div>

                {/* Gas Usage Analysis */}
                <div className="space-y-3 mt-6">
                  <h4 className="font-medium">Gas Usage Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">Total Gas Consumed:</span>
                      <span className="text-sm font-mono">~300M gas</span>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    HashToken mining continues with {contractState?.totalMints?.toLocaleString() || 'N/A'} total tokens minted since 2016. 
                    Each successful mint increases difficulty by 1%, making mining progressively more challenging over time.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <h4 className="font-medium">All Miners by Activity</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {miners && miners.length > 0 ? (
                      miners.map((miner, index) => (
                        <div key={miner.address} className="flex justify-between items-center p-2 bg-muted rounded">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
                            <a 
                              href={`https://etherscan.io/address/${miner.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-mono hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline decoration-dotted underline-offset-2"
                            >
                              {miner.address.slice(0, 6)}...{miner.address.slice(-4)}
                            </a>
                          </div>
                          <span className="text-sm font-bold">{miner.count.toLocaleString()} mints</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        Loading miners...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
}