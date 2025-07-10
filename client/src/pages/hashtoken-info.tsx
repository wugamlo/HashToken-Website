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
import { ExternalLink, RefreshCw, Clock, Hash, TrendingUp, Activity, Database, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

export default function HashTokenInfo() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: contractState, isLoading: stateLoading, refetch: refetchState } = useQuery<ContractState>({
    queryKey: ['/api/contract/state'],
  });

  const { data: mintEvents, isLoading: eventsLoading, refetch: refetchMintEvents } = useQuery<MintEvent[]>({
    queryKey: ['/api/contract/mint-events'],
    queryFn: () => fetch('/api/contract/mint-events?limit=50').then(res => res.json()),
  });

  const { data: historyEvents, refetch: refetchHistory } = useQuery<MintEvent[]>({
    queryKey: ['/api/contract/history'],
    queryFn: () => fetch('/api/contract/history?days=30').then(res => res.json()),
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
      ]);
      
      // Also explicitly refetch to ensure immediate updates
      await Promise.all([
        refetchState(),
        refetchMintEvents(),
        refetchHistory(),
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
      // If the amount is already a simple number (not wei), return it directly
      const num = parseInt(amount);
      if (num < 1000000) {
        return num.toLocaleString();
      }
      
      // Otherwise, assume it's in wei and convert
      const bigNum = BigInt(amount);
      const tokens = bigNum / BigInt('1000000000000000000'); // Divide by 10^18
      return tokens.toLocaleString();
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
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Hash className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">HashToken (HTK)</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          The first Ethereum token with proof-of-work minting logic, created on June 17, 2016
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Badge variant="outline" className="text-sm">
            <Clock className="h-3 w-3 mr-1" />
            Historic Token
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Activity className="h-3 w-3 mr-1" />
            Active Mining
          </Badge>
          {contractState?.isOffline && (
            <Badge variant="destructive" className="text-sm">
              <Zap className="h-3 w-3 mr-1" />
              Offline Data
            </Badge>
          )}
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Current State Overview */}
      {contractState && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Current Max Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatLargeNumber(contractState.maxValue)}</div>
              <p className="text-xs text-muted-foreground">Difficulty Target</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Expected Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {formatExpectedAttempts(contractState.expectedAttempts)}
              </div>
              <p className="text-xs text-muted-foreground">For next mint</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Supply</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTokenAmount(contractState.totalSupply)}</div>
              <p className="text-xs text-muted-foreground">HTK Tokens (1 per mint)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mining">Mining History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="about">About HTK</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contract Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Contract Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Contract Address:</span>
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
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Token Name:</span>
                    <span className="text-sm">HashToken</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Symbol:</span>
                    <span className="text-sm">HTK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Decimals:</span>
                    <span className="text-sm">16</span>
                  </div>
                  {contractState && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Current Block:</span>
                      <span className="text-sm">{contractState.blockNumber.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Mining Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Recent Mining Activity</span>
                </CardTitle>
                <CardDescription>Latest mint events on the network</CardDescription>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : mintEvents && mintEvents.length > 0 ? (
                  <div className="space-y-3">
                    {mintEvents.slice(0, 5).map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">Block {event.blockNumber.toLocaleString()}</span>
                            <Badge variant="secondary" className="text-xs">
                              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Miner: {event.minter.slice(0, 6)}...{event.minter.slice(-4)}
                          </div>
                        </div>
                        <a 
                          href={`https://etherscan.io/tx/${event.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No recent mining events found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mining" className="space-y-6">
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
                      Created in 2016, HashToken was the first token to implement mining on Ethereum, predating most modern mining tokens.
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
                    <div className="text-2xl font-bold text-blue-600">14</div>
                    <div className="text-sm text-muted-foreground">Unique Miners</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {contractState?.totalMints?.toLocaleString() || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Mints</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">1,595</div>
                    <div className="text-sm text-muted-foreground">Peak Day</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">3 days</div>
                    <div className="text-sm text-muted-foreground">Active Period</div>
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
                    Mining activity peaked on July 8, 2025, with 1,595 successful mints in a single day. 
                    Most mining activity occurred during July 7-9, 2025, showing renewed interest in this historic token.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <h4 className="font-medium">Top Miners by Activity</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm font-mono">0x4822...2484</span>
                      <span className="text-sm font-bold">1,134 mints</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm font-mono">0x0559...b646</span>
                      <span className="text-sm font-bold">269 mints</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm font-mono">0x0a7D...90FD</span>
                      <span className="text-sm font-bold">141 mints</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About HashToken (HTK)</CardTitle>
              <CardDescription>The historic first proof-of-work token on Ethereum</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Historical Significance</h3>
                  <p className="text-muted-foreground">
                    HashToken was deployed on June 17, 2016, making it the first Ethereum token to implement 
                    proof-of-work mining logic. This pioneering contract introduced the concept of mining 
                    tokens directly on the Ethereum network, predating many modern mining token implementations.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">How It Works</h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p>• <strong>Proof-of-Work Mining:</strong> Miners must find a hash value that meets the current difficulty target</p>
                    <p>• <strong>Dynamic Difficulty:</strong> The max_value decreases by 1% after each successful mint</p>
                    <p>• <strong>Keccak-256 Hash:</strong> Uses the same hashing algorithm as Ethereum</p>
                    <p>• <strong>Progressive Difficulty:</strong> Each mint makes the next one approximately 1% harder</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Technical Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Creation Date:</span>
                        <span>June 17, 2016</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Hash Algorithm:</span>
                        <span>Keccak-256</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Difficulty Adjustment:</span>
                        <span>1% per mint</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Token Standard:</span>
                        <span>ERC-20</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Decimals:</span>
                        <span>16</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Network:</span>
                        <span>Ethereum Mainnet</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Current Status</h3>
                  <p className="text-muted-foreground">
                    HashToken continues to be actively mined today, with the difficulty having increased 
                    significantly since its creation. The exponential difficulty growth makes each successive 
                    mint exponentially more challenging, requiring billions of attempts for recent mints.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}