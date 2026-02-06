import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, BarChart3, Users, MessageSquare, TrendingUp, Clock, 
  AlertCircle, Phone, Activity, Eye, Calendar, RefreshCw, Star,
  Zap, CheckCircle2, XCircle, UserCheck, Timer, ArrowUpRight, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAgentAnalytics, type AgentStats, type AnalyticsSummary } from "@/api/analytics";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/Navbar";

const BotAnalytics = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [botId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!botId) {
        throw new Error("Bot ID is required");
      }

      const response = await getAgentAnalytics(botId);
      
      if (response.result) {
        setAgents(response.result.agents || []);
        setSummary(response.result.summary || null);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch analytics";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    trend,
    color = "primary" 
  }: { 
    icon: any; 
    title: string; 
    value: string | number; 
    subtitle?: string;
    trend?: { value: number; positive: boolean };
    color?: "primary" | "success" | "warning" | "destructive" | "purple";
  }) => {
    const colorClasses = {
      primary: "from-primary/20 to-primary/5 border-primary/20",
      success: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20",
      warning: "from-amber-500/20 to-amber-500/5 border-amber-500/20",
      destructive: "from-destructive/20 to-destructive/5 border-destructive/20",
      purple: "from-purple-500/20 to-purple-500/5 border-purple-500/20",
    };

    const iconColorClasses = {
      primary: "bg-primary/10 text-primary",
      success: "bg-emerald-500/10 text-emerald-500",
      warning: "bg-amber-500/10 text-amber-500",
      destructive: "bg-destructive/10 text-destructive",
      purple: "bg-purple-500/10 text-purple-500",
    };

    return (
      <Card className={`relative overflow-hidden bg-gradient-to-br ${colorClasses[color]} border hover:shadow-lg transition-all duration-300 group`}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold tracking-tight">{value}</p>
                {trend && (
                  <span className={`flex items-center text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-destructive'}`}>
                    <ArrowUpRight className={`w-3 h-3 ${!trend.positive && 'rotate-180'}`} />
                    {trend.value}%
                  </span>
                )}
              </div>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-xl ${iconColorClasses[color]} group-hover:scale-110 transition-transform`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const AgentCard = ({ agent }: { agent: AgentStats }) => {
    const loadColor = agent.loadPercentage >= 80 ? "destructive" : agent.loadPercentage >= 50 ? "warning" : "success";
    const loadBgColor = loadColor === "destructive" ? "bg-destructive" : loadColor === "warning" ? "bg-amber-500" : "bg-emerald-500";

    return (
      <Card className="group hover:shadow-xl transition-all duration-300 border-border/50 overflow-hidden">
        {/* Gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
        
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {agent.avatarUrl ? (
                <img
                  src={agent.avatarUrl}
                  alt={agent.displayName}
                  className="w-12 h-12 rounded-full ring-2 ring-border shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-border">
                  {agent.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{agent.displayName}</CardTitle>
                <p className="text-sm text-muted-foreground truncate">{agent.email}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <Badge
                variant={agent.isOnline ? "default" : "secondary"}
                className={agent.isOnline ? "bg-emerald-500 hover:bg-emerald-600" : ""}
              >
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${agent.isOnline ? 'bg-white animate-pulse' : 'bg-muted-foreground'}`} />
                {agent.isOnline ? "Online" : "Offline"}
              </Badge>
              <Badge variant={agent.isActive ? "outline" : "destructive"} className="text-xs">
                {agent.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Status Info Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Last Seen</p>
                <p className="text-sm font-medium">
                  {agent.lastSeenAt ? new Date(agent.lastSeenAt).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium truncate">{agent.phoneNumber || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Capacity Section */}
          <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-muted/80 to-muted/30 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Chat Capacity</span>
              </div>
              <Badge variant="outline" className="font-mono">
                {agent.currentActiveChats} / {agent.maxConcurrentChats}
              </Badge>
            </div>
            <Progress value={agent.loadPercentage} className="h-2.5" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Current Load</span>
              <span className={`font-semibold ${agent.loadPercentage >= 80 ? 'text-destructive' : agent.loadPercentage >= 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {agent.loadPercentage}%
              </span>
            </div>
          </div>

          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 space-y-1">
              <div className="flex items-center gap-1.5 text-primary">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Handoffs</span>
              </div>
              <p className="text-2xl font-bold">{agent.stats.totalHandoffs}</p>
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {agent.stats.resolvedHandoffs} resolved
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/10 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Resolution</span>
              </div>
              <p className="text-2xl font-bold">{agent.stats.resolutionRate}%</p>
              <p className="text-xs text-muted-foreground">Success rate</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/10 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-600">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Avg Response</span>
              </div>
              <p className="text-2xl font-bold">{agent.stats.avgResponseTimeInSeconds}s</p>
              <p className="text-xs text-muted-foreground">First reply</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/10 space-y-1">
              <div className="flex items-center gap-1.5 text-purple-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Escalations</span>
              </div>
              <p className="text-2xl font-bold">{agent.stats.totalEscalations}</p>
              <p className="text-xs text-orange-600">{agent.stats.escalationRate}% rate</p>
            </div>
          </div>

          {/* Resolution Time */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/50 to-transparent border border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Timer className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Resolution Time</p>
                <p className="text-xl font-bold">
                  {Math.floor(agent.stats.avgResolutionTimeInSeconds / 60)}m{" "}
                  {agent.stats.avgResolutionTimeInSeconds % 60}s
                </p>
              </div>
            </div>
          </div>

          {/* Rating */}
          {agent.stats.totalRatingsReceived > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/20">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">User Rating</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-2xl font-bold">{agent.stats.avgUserRating.toFixed(1)}</p>
                      <span className="text-sm text-muted-foreground">/ 5.0</span>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                  {agent.stats.totalRatingsReceived} ratings
                </Badge>
              </div>
            </div>
          )}

          {/* Status Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              Password: {agent.isPasswordSet ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-destructive" />
              )}
            </div>
            <Badge variant="outline" className="text-xs capitalize">
              {agent.availabilityStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bots
            </Button>

            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold text-destructive text-lg">Error Loading Analytics</p>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        {/* Hero Header */}
        <div className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate("/")}
                  className="h-10 w-10 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-lg">
                    <BarChart3 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      Agent Analytics
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      Human Agent Performance Dashboard
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={fetchAnalytics} 
                disabled={loading}
                className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? "Refreshing..." : "Refresh Data"}
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Summary Stats */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                icon={Users}
                title="Total Agents"
                value={summary.totalAgents}
                subtitle={`${summary.activeAgents} currently active`}
                color="primary"
              />
              <StatCard
                icon={UserCheck}
                title="Online Now"
                value={summary.onlineAgents}
                subtitle={`${summary.passwordSetAgents} verified accounts`}
                color="success"
              />
              <StatCard
                icon={MessageSquare}
                title="Total Handoffs"
                value={summary.totalHandoffs}
                subtitle={`${summary.totalResolved} resolved`}
                color="purple"
              />
              <StatCard
                icon={TrendingUp}
                title="Resolution Rate"
                value={`${summary.overallResolutionRate}%`}
                subtitle="Across all agents"
                color="warning"
              />
              <StatCard
                icon={Clock}
                title="Avg Response"
                value={`${summary.avgResponseTimeInSeconds}s`}
                subtitle={`${summary.totalEscalations} escalations`}
                color="destructive"
              />
            </div>
          ) : null}

          {/* Agents Section */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">Agent Performance</h2>
                  <p className="text-sm text-muted-foreground">
                    {agents.length} agent{agents.length !== 1 ? 's' : ''} assigned to this bot
                  </p>
                </div>
              </div>
              {agents.length > 0 && (
                <Badge variant="secondary" className="h-7 px-3">
                  <Activity className="w-3.5 h-3.5 mr-1.5" />
                  {agents.filter(a => a.isOnline).length} online
                </Badge>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton className="h-20 w-full" />
                      <div className="grid grid-cols-2 gap-3">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : agents.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {agents.map((agent) => (
                  <AgentCard key={agent.agentId} agent={agent} />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Agents Found</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    This bot doesn't have any assigned agents yet. Add agents to enable human handoff support.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BotAnalytics;
