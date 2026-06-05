import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  Users, MessageSquare, TrendingUp, Clock, 
  AlertCircle, Phone, Activity, Calendar, Star,
  CheckCircle2, XCircle, UserCheck, Timer, Shield,
  BrainCircuit, Gauge, Sparkles, Copy, ExternalLink, ArrowRight, Layers3, Info,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [observabilityModalOpen, setObservabilityModalOpen] = useState(false);
  const [observabilityModalType, setObservabilityModalType] = useState<"recommendations" | "lowConfidence" | null>(null);

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

  const formatHealthMetricValue = (
    label: string,
    component: { value: number | null; score: number }
  ) => {
    if (typeof component.value !== "number" || Number.isNaN(component.value)) {
      return "N/A";
    }

    if (label === "Latency") {
      return `${Math.round(component.value)} ms`;
    }

    return formatPercent(component.value);
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
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs">{title}</p>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Bot Health Score</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Overall health metric combining answer confidence, groundedness, latency, and fallback behavior. Ranges from 0-100 with status indicators: Healthy (80+), Watch (60-79), Needs Attention (&lt;60).
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
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
                    {
                      label: "Answer confidence",
                      value: observability.healthScore?.components.answerConfidence.value,
                      score: observability.healthScore?.components.answerConfidence.score,
                      tooltip: "Measures how confident the bot is in its retrieved answers (0-100%). Higher confidence indicates strong grounding in training data.",
                    },
                    {
                      label: "Low-confidence rate",
                      value: observability.healthScore?.components.lowConfidenceRate.value,
                      score: observability.healthScore?.components.lowConfidenceRate.score,
                      tooltip: "Percentage of answers where confidence falls below 85%. Lower is better; high rates suggest need for more training data or prompt refinement.",
                    },
                    {
                      label: "Groundedness",
                      value: observability.healthScore?.components.groundedness.value,
                      score: observability.healthScore?.components.groundedness.score,
                      tooltip: "Measures how well answers are grounded in the training data (0-100%). Prevents hallucination and ensures factual accuracy.",
                    },
                    {
                      label: "Latency",
                      value: observability.healthScore?.components.latency.valueMs,
                      score: observability.healthScore?.components.latency.score,
                      tooltip: "Average response time in milliseconds. Lower latency indicates faster retrieval and better user experience. Scored on target response time thresholds.",
                    },
                    {
                      label: "Fallback rate",
                      value: observability.healthScore?.components.fallbackRate.value,
                      score: observability.healthScore?.components.fallbackRate.score,
                      tooltip: "Percentage of queries using fallback behavior (0-100%). Lower rates are better; high rates suggest training coverage gaps.",
                    },
                    {
                      label: "Handoff escalation",
                      value: observability.healthScore?.components.handoffEscalationRate.value,
                      score: observability.healthScore?.components.handoffEscalationRate.score,
                      tooltip: "Percentage of conversations escalated to human agents. Lower is better; high rates indicate bot limitations in handling complex queries.",
                    },
                  ].map(({ label, value, score, tooltip }) => (
                    <div key={label} className="rounded-lg bg-background/80 p-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">{label}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="font-semibold">
                          {formatHealthMetricValue(label, { value: value ?? null, score: score ?? 0 })}
                        </span>
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
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Self-Improvement Queue</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Prioritized list of actions recommended to improve bot performance. High priority items should be addressed first to enhance accuracy and user satisfaction.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {observability.recommendations.slice(0, 3).map((item) => (
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
                {observability.recommendations.length > 3 && (
                  <div className="pt-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setObservabilityModalType("recommendations");
                        setObservabilityModalOpen(true);
                      }}
                    >
                      Show {observability.recommendations.length - 3} more
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Low-Confidence Trace Samples</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Recent queries where the bot had low confidence (below 85%) in its answers. These indicate knowledge gaps and are candidates for training data expansion or prompt refinement.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {observability.lowConfidenceQuestions.slice(0, 3).map((item) => (
                  <div key={`${item.sessionId}-${item.timestamp}`} className="p-3 rounded-lg border bg-background/90">
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
                {observability.lowConfidenceQuestions.length > 3 && (
                  <div className="pt-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setObservabilityModalType("lowConfidence");
                        setObservabilityModalOpen(true);
                      }}
                    >
                      Show {observability.lowConfidenceQuestions.length - 3} more
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Phoenix MCP Loop</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      The continuous cycle that powers bot self-improvement: trace interactions, analyze patterns, evaluate quality, and deploy improvements. This loop enables your agent to learn and improve over time.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-3xl border border-border/60 bg-muted/50 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    {observability.selfImprovementLoop.map((step, index) => (
                      <div key={step} className="flex-1 rounded-3xl bg-background p-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">Step {index + 1}</p>
                            <p className="text-xs text-muted-foreground">Phoenix loop phase</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
                  <span className="text-sm font-semibold">Continuous Phoenix MCP Cycle</span>
                  <span className="max-w-2xl">
                    This loop shows how trace data is captured, analyzed, improved, and deployed back into the agent workflow for ongoing observability and self-improvement.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Dialog open={observabilityModalOpen} onOpenChange={setObservabilityModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {observabilityModalType === "recommendations"
                    ? "All Self-Improvement Recommendations"
                    : "All Low-Confidence Trace Samples"}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {observabilityModalType === "recommendations"
                    ? "Review every queued recommendation for this bot."
                    : "Review all low-confidence traces to improve model grounding and fallback behavior."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {observabilityModalType === "recommendations" &&
                  observability.recommendations.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{item.title}</p>
                        <Badge
                          variant={item.priority === "high" ? "destructive" : "secondary"}
                          className="capitalize"
                        >
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{item.detail}</p>
                    </div>
                  ))}

                {observabilityModalType === "lowConfidence" &&
                  observability.lowConfidenceQuestions.map((item) => (
                    <div key={`${item.sessionId}-${item.timestamp}`} className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="max-w-[70%]">
                          <p className="font-medium">{item.question || "Untitled question"}</p>
                          {item.answer && (
                            <p className="text-sm text-muted-foreground mt-2">{item.answer}</p>
                          )}
                        </div>
                        <Badge variant="outline">{formatPercent(item.score)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Session {item.sessionId} · {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button variant="outline" onClick={() => setObservabilityModalOpen(false)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-4 text-xs">
            {JSON.stringify(observability.phoenix.mcpConfig, null, 2)}
          </pre>

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
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar pageTitle={botName ? `Analytics - ${botName}` : "Analytics"} />

      {/* Main Content */}
        <Tabs defaultValue="observability" orientation="vertical" className="flex-1 min-h-0 flex flex-col md:flex-row">
            <TabsList className="h-auto w-full md:w-72 md:h-full md:flex-col md:items-stretch md:justify-start rounded-none p-3 gap-1 border-b md:border-b-0 md:border-r border-border/60 bg-muted/30 shrink-0">
              <TabsTrigger
                value="observability"
                className="w-full justify-start text-left gap-2 rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400"
              >
                <BrainCircuit className="w-4 h-4" />
                Observability (Arize)
              </TabsTrigger>
              <TabsTrigger
                value="handoff"
                className="w-full justify-start text-left gap-2 rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400"
              >
                <UserCheck className="w-4 h-4" />
                Human Handoff
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-w-0 overflow-y-auto px-4 py-6 md:px-8 lg:px-10">
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
        </Tabs>
    </div>
  );
};

export default BotAnalytics;

