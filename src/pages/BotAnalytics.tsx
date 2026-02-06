import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Users, MessageSquare, TrendingUp, Clock, AlertCircle, CheckCircle, Phone, Activity, Eye, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAgentAnalytics, type AgentStats, type AnalyticsSummary } from "@/api/analytics";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

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

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "text-blue-500" }: any) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <Icon className={`w-6 h-6 ${color} opacity-70`} />
        </div>
      </CardContent>
    </Card>
  );

  const AgentCard = ({ agent }: { agent: AgentStats }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {agent.avatarUrl ? (
              <img
                src={agent.avatarUrl}
                alt={agent.displayName}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {agent.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">{agent.displayName}</CardTitle>
              <p className="text-sm text-muted-foreground break-all">{agent.email}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Badge
              variant={agent.isOnline ? "default" : "secondary"}
              className="whitespace-nowrap"
            >
              {agent.isOnline ? "Online" : "Offline"}
            </Badge>
            <Badge
              variant={agent.isActive ? "default" : "destructive"}
              className="whitespace-nowrap"
            >
              {agent.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Section */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Last Seen
            </p>
            <p className="text-sm font-medium">
              {agent.lastSeenAt
                ? new Date(agent.lastSeenAt).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone
            </p>
            <p className="text-sm font-medium">{agent.phoneNumber || "N/A"}</p>
          </div>
        </div>

        {/* Capacity Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" /> Chat Capacity
            </p>
            <span className="text-xs text-muted-foreground">
              {agent.currentActiveChats} / {agent.maxConcurrentChats}
            </span>
          </div>
          <Progress value={agent.loadPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {agent.loadPercentage}% loaded
          </p>
        </div>

        {/* Handoff Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Handoffs
            </p>
            <p className="text-lg font-bold">{agent.stats.totalHandoffs}</p>
            <p className="text-xs text-green-600">
              {agent.stats.resolvedHandoffs} resolved
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Resolution Rate
            </p>
            <p className="text-lg font-bold">{agent.stats.resolutionRate}%</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Avg Response
            </p>
            <p className="text-lg font-bold">
              {agent.stats.avgResponseTimeInSeconds}s
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Escalations
            </p>
            <p className="text-lg font-bold">{agent.stats.totalEscalations}</p>
            <p className="text-xs text-orange-600">
              {agent.stats.escalationRate}% rate
            </p>
          </div>
        </div>

        {/* Resolution Time */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" /> Avg Resolution Time
          </p>
          <p className="text-2xl font-bold">
            {Math.floor(agent.stats.avgResolutionTimeInSeconds / 60)}m{" "}
            {agent.stats.avgResolutionTimeInSeconds % 60}s
          </p>
        </div>

        {/* Rating */}
        {agent.stats.totalRatingsReceived > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium">User Rating</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">
                {agent.stats.avgUserRating.toFixed(1)} / 5.0
              </p>
              <span className="text-xs text-muted-foreground">
                ({agent.stats.totalRatingsReceived} ratings)
              </span>
            </div>
          </div>
        )}

        {/* Statuses Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Eye className="w-3 h-3" /> Password Set: {agent.isPasswordSet ? "✓" : "✗"}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="w-3 h-3" /> Status: {agent.availabilityStatus}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Button variant="outline" size="sm" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bots
          </Button>

          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">Error Loading Analytics</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BarChart3 className="w-7 h-7" />
                Bot Analytics
              </h1>
              <p className="text-muted-foreground">Human Agent Performance Dashboard</p>
            </div>
          </div>
          <Button onClick={fetchAnalytics} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>

        {/* Summary Stats */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard
              icon={Users}
              title="Total Agents"
              value={summary.totalAgents}
              subtitle={`${summary.activeAgents} active`}
              color="text-blue-500"
            />
            <StatCard
              icon={Activity}
              title="Online Now"
              value={summary.onlineAgents}
              subtitle={`${summary.passwordSetAgents} verified`}
              color="text-green-500"
            />
            <StatCard
              icon={MessageSquare}
              title="Total Handoffs"
              value={summary.totalHandoffs}
              subtitle={`${summary.totalResolved} resolved`}
              color="text-purple-500"
            />
            <StatCard
              icon={TrendingUp}
              title="Resolution Rate"
              value={`${summary.overallResolutionRate}%`}
              subtitle="All agents"
              color="text-amber-500"
            />
            <StatCard
              icon={Clock}
              title="Avg Response"
              value={`${summary.avgResponseTimeInSeconds}s`}
              subtitle={`${summary.totalEscalations} escalations`}
              color="text-red-500"
            />
          </div>
        ) : null}

        {/* Agents Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Agent Performance Details ({agents.length})
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : agents.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.agentId} agent={agent} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-lg font-semibold text-muted-foreground">No Agents Found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This bot doesn't have any assigned agents yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotAnalytics;
