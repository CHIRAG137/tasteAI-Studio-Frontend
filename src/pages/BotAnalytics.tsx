import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  Users, MessageSquare, TrendingUp, Clock, 
  AlertCircle, Phone, Activity, Calendar, Star,
  CheckCircle2, XCircle, UserCheck, Timer, Shield,
  BrainCircuit, Gauge, Sparkles, Copy, ExternalLink, Layers3,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAgentAnalytics,
  getBotObservabilityInsights,
  type AgentStats,
  type AnalyticsSummary,
  type BotObservabilityInsights,
} from "@/api/analytics";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/Navbar";
import { getAuthHeaders } from "@/utils/auth";

const BotAnalytics = () => {
  const { botId } = useParams<{ botId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [observability, setObservability] = useState<BotObservabilityInsights | null>(null);
  const [observabilityLoading, setObservabilityLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [botName, setBotName] = useState<string>("");

  useEffect(() => {
    fetchBotDetails();
    fetchAnalytics();
    fetchObservability();
  }, [botId]);

  const fetchBotDetails = async () => {
    try {
      if (!botId) return;
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data?.result?.name) {
        setBotName(data.result.name);
      }
    } catch (err) {
      console.error("Error fetching bot details:", err);
    }
  };

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

  const fetchObservability = async () => {
    try {
      setObservabilityLoading(true);

      if (!botId) {
        throw new Error("Bot ID is required");
      }

      const response = await getBotObservabilityInsights(botId);
      setObservability(response.result || null);
    } catch (err) {
      console.error("Error fetching Arize observability insights:", err);
      setObservability(null);
    } finally {
      setObservabilityLoading(false);
    }
  };

  const formatPercent = (value: number | null | undefined) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
    return `${Math.round(value * 100)}%`;
  };

  const copyMcpConfig = async () => {
    if (!observability?.phoenix.mcpConfig) return;

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(observability.phoenix.mcpConfig, null, 2)
      );
      toast({
        title: "MCP config copied",
        description: "Phoenix MCP server config is ready for your agent runtime.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy the MCP config from this browser.",
        variant: "destructive",
      });
    }
  };

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle,
  }: { 
    icon: LucideIcon; 
    title: string; 
    value: string | number; 
    subtitle?: string;
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const AgentCard = ({ agent }: { agent: AgentStats }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {agent.avatarUrl ? (
              <img
                src={agent.avatarUrl}
                alt={agent.displayName}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                {agent.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{agent.displayName}</CardTitle>
              <p className="text-sm text-muted-foreground truncate">{agent.email}</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Badge variant={agent.isOnline ? "default" : "secondary"}>
              {agent.isOnline ? "Online" : "Offline"}
            </Badge>
            <Badge variant={agent.isActive ? "outline" : "destructive"}>
              {agent.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Last Seen</p>
              <p className="font-medium">
                {agent.lastSeenAt ? new Date(agent.lastSeenAt).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium truncate">{agent.phoneNumber || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Capacity */}
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Chat Capacity
            </span>
            <span className="font-medium">
              {agent.currentActiveChats} / {agent.maxConcurrentChats}
            </span>
          </div>
          <Progress value={agent.loadPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{agent.loadPercentage}% loaded</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <MessageSquare className="w-3 h-3" /> Handoffs
            </p>
            <p className="text-lg font-bold">{agent.stats.totalHandoffs}</p>
            <p className="text-xs text-muted-foreground">
              {agent.stats.resolvedHandoffs} resolved
            </p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3" /> Resolution
            </p>
            <p className="text-lg font-bold">{agent.stats.resolutionRate}%</p>
            <p className="text-xs text-muted-foreground">Success rate</p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3" /> Avg Response
            </p>
            <p className="text-lg font-bold">{agent.stats.avgResponseTimeInSeconds}s</p>
            <p className="text-xs text-muted-foreground">First reply</p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <AlertCircle className="w-3 h-3" /> Escalations
            </p>
            <p className="text-lg font-bold">{agent.stats.totalEscalations}</p>
            <p className="text-xs text-muted-foreground">{agent.stats.escalationRate}% rate</p>
          </div>
        </div>

        {/* Resolution Time */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Avg Resolution Time</span>
          </div>
          <span className="font-bold">
            {Math.floor(agent.stats.avgResolutionTimeInSeconds / 60)}m{" "}
            {agent.stats.avgResolutionTimeInSeconds % 60}s
          </span>
        </div>

        {/* Rating */}
        {agent.stats.totalRatingsReceived > 0 && (
          <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-medium">User Rating</span>
            </div>
            <div className="text-right">
              <span className="font-bold">{agent.stats.avgUserRating.toFixed(1)} / 5.0</span>
              <p className="text-xs text-muted-foreground">{agent.stats.totalRatingsReceived} ratings</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Password: {agent.isPasswordSet ? (
              <CheckCircle2 className="w-3 h-3 text-green-500" />
            ) : (
              <XCircle className="w-3 h-3 text-destructive" />
            )}
          </div>
          <Badge variant="outline" className="text-xs capitalize">
            {agent.availabilityStatus}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  const ArizeObservabilityPanel = () => {
    if (observabilityLoading) {
      return (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      );
    }

    if (!observability) {
      return (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center gap-3 text-muted-foreground">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">Arize observability insights are unavailable right now.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const sourceEntries = Object.entries(observability.metrics.sourceBreakdown || {});

    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-primary" />
                Bot Health & Arize Phoenix Observability
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {observability.phoenix.projectName} · {observability.bot.llmProvider} · {observability.bot.model}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={observability.phoenix.tracingEnabled ? "default" : "secondary"}>
                {observability.phoenix.tracingEnabled ? "Tracing enabled" : "Env not connected"}
              </Badge>
              <Button variant="outline" size="sm" onClick={copyMcpConfig}>
                <Copy className="w-4 h-4 mr-2" />
                MCP Config
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://app.phoenix.arize.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Phoenix
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Bot Health Score</p>
                  <div className="flex items-end gap-2 mt-1">
                    <span className="text-5xl font-bold">
                      {observability.healthScore?.score ?? 0}
                    </span>
                    <span className="text-lg text-muted-foreground mb-1">/100</span>
                  </div>
                  <Badge className="mt-3 capitalize" variant={
                    observability.healthScore?.status === "healthy"
                      ? "default"
                      : observability.healthScore?.status === "watch"
                        ? "secondary"
                        : "destructive"
                  }>
                    {(observability.healthScore?.status || "watch").replace("_", " ")}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    Based on {observability.healthScore?.sampleSize || 0} recent interactions
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[
                    ["Answer confidence", observability.healthScore?.components.answerConfidence.score],
                    ["Low-confidence rate", observability.healthScore?.components.lowConfidenceRate.score],
                    ["Groundedness", observability.healthScore?.components.groundedness.score],
                    ["Latency", observability.healthScore?.components.latency.score],
                    ["Fallback rate", observability.healthScore?.components.fallbackRate.score],
                    ["Handoff escalation", observability.healthScore?.components.handoffEscalationRate.score],
                  ].map(([label, score]) => (
                    <div key={label} className="rounded-lg bg-background/80 p-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold">{score ?? 0}</span>
                      </div>
                      <Progress value={Number(score || 0)} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={MessageSquare}
              title="Traced Q&A"
              value={observability.metrics.totalQa}
              subtitle={`${observability.metrics.sampledSessions} sampled sessions`}
            />
            <StatCard
              icon={Gauge}
              title="Avg Confidence"
              value={formatPercent(observability.metrics.averageConfidence)}
              subtitle={`${observability.metrics.lowConfidenceCount} low-confidence`}
            />
            <StatCard
              icon={Layers3}
              title="Sources"
              value={sourceEntries.length || 0}
              subtitle={sourceEntries.map(([key, value]) => `${key}: ${value}`).join(" · ") || "No source data"}
            />
            <StatCard
              icon={Sparkles}
              title="MCP Server"
              value={observability.phoenix.mcpServer}
              subtitle="Runtime self-inspection"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Self-Improvement Queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {observability.recommendations.map((item) => (
                  <div key={item.title} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-sm">{item.title}</p>
                      <Badge
                        variant={item.priority === "high" ? "destructive" : "secondary"}
                        className="capitalize"
                      >
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{item.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Phoenix MCP Loop</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {observability.selfImprovementLoop.map((step, index) => (
                    <div key={step} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-sm text-muted-foreground pt-1">{step}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {observability.lowConfidenceQuestions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Low-Confidence Trace Samples</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {observability.lowConfidenceQuestions.slice(0, 5).map((item) => (
                  <div key={`${item.sessionId}-${item.timestamp}`} className="p-3 rounded-lg border">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{item.question || "Untitled question"}</p>
                      <Badge variant="outline">{formatPercent(item.score)}</Badge>
                    </div>
                    {item.answer && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {item.answer}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-4 text-xs">
            {JSON.stringify(observability.phoenix.mcpConfig, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar pageTitle={botName ? `Analytics - ${botName}` : "Analytics"} />

        <div className="container mx-auto px-6 py-6">
          <Card className="border-destructive/50">
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
      <Navbar pageTitle={botName ? `Analytics - ${botName}` : "Analytics"} />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor bot health and human handoff performance.
          </p>
        </div>

        <Tabs defaultValue="observability" orientation="vertical">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <TabsList className="h-auto w-full md:w-64 md:flex-col md:items-stretch md:justify-start rounded-lg p-1 bg-muted/60">
              <TabsTrigger
                value="observability"
                className="w-full justify-start text-left gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <BrainCircuit className="w-4 h-4" />
                Observability (Arize)
              </TabsTrigger>
              <TabsTrigger
                value="handoff"
                className="w-full justify-start text-left gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <UserCheck className="w-4 h-4" />
                Human Handoff
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-w-0">
              <TabsContent value="observability" className="mt-0 space-y-6">
                <ArizeObservabilityPanel />
              </TabsContent>

              <TabsContent value="handoff" className="mt-0 space-y-6">
                {/* Summary Stats */}
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-7 w-16" />
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
                      subtitle={`${summary.activeAgents} active`}
                    />
                    <StatCard
                      icon={UserCheck}
                      title="Online Now"
                      value={summary.onlineAgents}
                      subtitle={`${summary.passwordSetAgents} verified`}
                    />
                    <StatCard
                      icon={MessageSquare}
                      title="Total Handoffs"
                      value={summary.totalHandoffs}
                      subtitle={`${summary.totalResolved} resolved`}
                    />
                    <StatCard
                      icon={TrendingUp}
                      title="Resolution Rate"
                      value={`${summary.overallResolutionRate}%`}
                      subtitle="All agents"
                    />
                    <StatCard
                      icon={Clock}
                      title="Avg Response"
                      value={`${summary.avgResponseTimeInSeconds}s`}
                      subtitle={`${summary.totalEscalations} escalations`}
                    />
                  </div>
                ) : null}

                {/* Agents Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      Agent Performance ({agents.length})
                    </h2>
                    {agents.length > 0 && (
                      <Badge variant="secondary">
                        {agents.filter((a) => a.isOnline).length} online
                      </Badge>
                    )}
                  </div>

                  {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <Skeleton className="w-10 h-10 rounded-full" />
                              <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <Skeleton className="h-16 w-full" />
                            <div className="grid grid-cols-2 gap-3">
                              <Skeleton className="h-20 w-full" />
                              <Skeleton className="h-20 w-full" />
                            </div>
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
                      <CardContent className="py-12 text-center">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                        <p className="text-lg font-semibold text-muted-foreground">No Agents Found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This bot doesn't have any assigned agents yet.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default BotAnalytics;
