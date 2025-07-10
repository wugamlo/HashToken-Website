import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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

  const { data: contractState, isLoading: stateLoading, refetch: refetchState } = useQuery<ContractState>({
    queryKey: ['/api/contract/state'],
  });

  const { data: mintEvents, isLoading: eventsLoading } = useQuery<MintEvent[]>({
    queryKey: ['/api/contract/mint-events'],
    queryFn: () => fetch('/api/contract/mint-events?limit=50').then(res => res.json()),
  });

  const { data: historyEvents } = useQuery<MintEvent[]>({
    queryKey: ['/api/contract/history'],
    queryFn: () => fetch('/api/contract/history?days=30').then(res => res.json()),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/contract/sync', { method: 'POST' });
      await refetchState();
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
      } else if (numStr.length > 6) {
        return `${numStr.slice(0, 3)}.${numStr.slice(3, 6)}...`;
      }
      return numStr;
    } catch {
      return num;
    }
  };

  const formatExpectedAttempts = (attempts: string): string => {
    try {
      const num = parseFloat(attempts);
      if (num >= 1e12) {
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
              <div className="text-2xl font-bold">{formatLargeNumber(contractState.totalSupply)}</div>
              <p className="text-xs text-muted-foreground">HTK Tokens</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Mining Difficulty</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{parseFloat(contractState.difficulty).toFixed(1)}%</span>
                  <div className={`w-3 h-3 rounded-full ${getDifficultyColor(contractState.difficulty)}`}></div>
                </div>
                <Progress value={parseFloat(contractState.difficulty)} className="h-2" />
              </div>
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
                    <span className="text-sm">18</span>
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
              <CardDescription>Recent mining events and difficulty progression</CardDescription>
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
          <Card>
            <CardHeader>
              <CardTitle>Mining Analytics</CardTitle>
              <CardDescription>Statistical analysis of HashToken mining</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  Detailed analytics will be available once sufficient mining data is collected.
                  The difficulty increases by approximately 1% with each mint, making mining progressively harder.
                </AlertDescription>
              </Alert>
              
              {historyEvents && historyEvents.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-4">Mining Activity Over Time</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historyEvents.slice(0, 20).reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="blockNumber" 
                        tickFormatter={(value) => `${Math.floor(value / 1000)}K`}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => `Block ${value.toLocaleString()}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="blockNumber" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
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
                        <span>18</span>
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