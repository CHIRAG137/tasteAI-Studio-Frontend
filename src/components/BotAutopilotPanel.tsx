import { useEffect, useState } from "react";
import {
  Bell,
  Bot,
  CalendarClock,
  Mail,
  MessageSquare,
  Play,
  RefreshCw,
  Rocket,
  Save,
  Send,
  Sparkles,
  Slack,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  generateBotAutopilotRecommendations,
  getBotAutopilot,
  saveBotAutopilot,
  type AutopilotCadence,
  type BotAutopilotRecommendation,
  type BotAutopilotRun,
} from "@/api/analytics";

const promptTemplates = [
  {
    label: "Knowledge gaps",
    text: "Focus on unanswered questions, missing training data, pricing/policy gaps, and fallback-heavy traces from Phoenix.",
  },
  {
    label: "Tone & persona",
    text: "Review tone mismatch, instruction-following issues, and sessions where the bot voice does not match brand guidelines.",
  },
  {
    label: "Handoff policy",
    text: "Recommend when human handoff should trigger earlier based on escalations, billing disputes, and unresolved sessions.",
  },
  {
    label: "Eval regressions",
    text: "Use recent LLM-as-a-Judge runs, eval datasets, and experiment results to highlight quality regressions and wins.",
  },
  {
    label: "Full performance review",
    text: "Generate a comprehensive weekly review using Phoenix traces, Q&A history, handoffs, evals, latency, and source breakdown.",
  },
];

const priorityVariant: Record<
  BotAutopilotRecommendation["priority"],
  "destructive" | "secondary" | "outline"
> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString();
};

const SectionHeader = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Bot;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 text-white shadow-md">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
    {action}
  </div>
);

export const BotAutopilotPanel = ({ botId }: { botId: string }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<"preview" | "send" | null>(null);
  const [runs, setRuns] = useState<BotAutopilotRun[]>([]);
  const [phoenixInfo, setPhoenixInfo] = useState<Record<string, unknown> | null>(null);
  const [activeRun, setActiveRun] = useState<BotAutopilotRun | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [cadence, setCadence] = useState<AutopilotCadence>("weekly");
  const [timeOfDay, setTimeOfDay] = useState("09:00");
  const [timezone, setTimezone] = useState("UTC");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackChannelId, setSlackChannelId] = useState("");
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [nextRunAt, setNextRunAt] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string>("never_run");

  const fetchAutopilot = async () => {
    try {
      setLoading(true);
      const response = await getBotAutopilot(botId);
      const data = response.result;
      const config = data.config;

      setEnabled(Boolean(config.enabled));
      setPrompt(config.prompt || data.defaults?.prompt || "");
      setCadence(config.cadence || "weekly");
      setTimeOfDay(config.timeOfDay || "09:00");
      setTimezone(config.timezone || "UTC");
      setEmailEnabled(Boolean(config.delivery?.email?.enabled));
      setEmailRecipients((config.delivery?.email?.recipients || []).join(", "));
      setSlackEnabled(Boolean(config.delivery?.slack?.enabled));
      setSlackChannelId(config.delivery?.slack?.channelId || "");
      setLastRunAt(config.lastRunAt || null);
      setNextRunAt(config.nextRunAt || null);
      setLastStatus(config.lastStatus || "never_run");
      setRuns(data.runs || []);
      setPhoenixInfo(data.phoenix || null);
      setActiveRun(data.runs?.[0] || null);
    } catch (error) {
      toast({
        title: "Unable to load autopilot",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutopilot();
  }, [botId]);

  const buildPayload = () => ({
    enabled,
    prompt: prompt.trim(),
    cadence,
    timeOfDay,
    timezone,
    delivery: {
      email: {
        enabled: emailEnabled,
        recipients: emailRecipients
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      },
      slack: {
        enabled: slackEnabled,
        channelId: slackChannelId.trim(),
      },
    },
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await saveBotAutopilot(botId, buildPayload());
      const config = response.result;
      setNextRunAt(config?.nextRunAt || null);
      setLastStatus(config?.lastStatus || lastStatus);
      toast({
        title: "Autopilot saved",
        description: enabled
          ? `Scheduled ${cadence} at ${timeOfDay} (${timezone}).`
          : "Configuration saved. Enable autopilot to schedule deliveries.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async (send: boolean) => {
    try {
      setGenerating(send ? "send" : "preview");
      const response = await generateBotAutopilotRecommendations(botId, {
        trigger: send ? "manual" : "preview",
        send,
        promptOverride: prompt.trim() || undefined,
      });
      setActiveRun(response.result);
      toast({
        title: send ? "Recommendations sent" : "Preview generated",
        description: send
          ? "Check your configured email and Slack channels."
          : `${response.result.recommendations?.length || 0} recommendations ready to review.`,
      });
      await fetchAutopilot();
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const phoenixEnabled = Boolean(phoenixInfo?.tracingEnabled);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Rocket}
        title="Bot Autopilot Recommendations"
        description="AI-generated improvement recommendations from Phoenix/Arize traces, Q&A history, evals, handoffs, and experiments — delivered on your schedule."
        action={
          <Button variant="outline" size="sm" onClick={fetchAutopilot}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-lg font-semibold mt-1">{enabled ? "Enabled" : "Paused"}</p>
            <Badge variant="outline" className="mt-2 capitalize">
              {lastStatus.replace(/_/g, " ")}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Schedule</p>
            <p className="text-lg font-semibold mt-1 capitalize">{cadence}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {timeOfDay} · {timezone}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Last run</p>
            <p className="text-sm font-medium mt-1">{formatDateTime(lastRunAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Next run</p>
            <p className="text-sm font-medium mt-1">
              {enabled ? formatDateTime(nextRunAt) : "Enable autopilot to schedule"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Phoenix / Arize data sources
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant={phoenixEnabled ? "default" : "secondary"}>
            Phoenix tracing {phoenixEnabled ? "enabled" : "offline"}
          </Badge>
          <Badge variant="outline">Interaction metrics</Badge>
          <Badge variant="outline">Q&A history</Badge>
          <Badge variant="outline">Handoff sessions</Badge>
          <Badge variant="outline">LLM-as-a-Judge evals</Badge>
          <Badge variant="outline">Experiment lab</Badge>
          {phoenixInfo?.projectName && (
            <Badge variant="outline">Project: {String(phoenixInfo.projectName)}</Badge>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Recommendation prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Describe what kind of recommendations you want. Autopilot uses this prompt with Phoenix
            trace evidence, production Q&A, eval runs, and handoff data.
          </p>
          <div className="flex flex-wrap gap-2">
            {promptTemplates.map((template) => (
              <Button
                key={template.label}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPrompt(template.text)}
              >
                {template.label}
              </Button>
            ))}
          </div>
          <Textarea
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Focus on refund policy gaps, pricing questions, and when handoff should trigger earlier..."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={!!generating}
              onClick={() => handleGenerate(false)}
            >
              <Play className="w-4 h-4 mr-2" />
              {generating === "preview" ? "Generating..." : "Preview recommendations"}
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90"
              disabled={!!generating}
              onClick={() => handleGenerate(true)}
            >
              <Send className="w-4 h-4 mr-2" />
              {generating === "send" ? "Sending..." : "Run & send now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Enable autopilot</p>
                <p className="text-xs text-muted-foreground">
                  Automatically generate and deliver recommendations on schedule
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cadence</Label>
                <Select value={cadence} onValueChange={(v: AutopilotCadence) => setCadence(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time (UTC)</Label>
                <Input
                  type="time"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="UTC"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm font-medium">Email</span>
                </div>
                <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              </div>
              <Input
                placeholder="you@company.com, team@company.com"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                disabled={!emailEnabled}
              />
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Slack className="h-4 w-4" />
                  <span className="text-sm font-medium">Slack</span>
                </div>
                <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
              </div>
              <Input
                placeholder="Slack channel ID (e.g. C01234567)"
                value={slackChannelId}
                onChange={(e) => setSlackChannelId(e.target.value)}
                disabled={!slackEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Requires Slack connected to your TasteAI account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save autopilot setup"}
        </Button>
      </div>

      {activeRun && (
        <Card className="border-border/60 bg-gradient-to-br from-purple-600/5 via-primary/5 to-cyan-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Latest recommendations
              <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">
                ({activeRun.trigger} · {activeRun.period?.cadence})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm whitespace-pre-wrap">{activeRun.summary}</p>
            <div className="space-y-3">
              {(activeRun.recommendations || []).map((item, index) => (
                <RecommendationCard key={`${item.title}-${index}`} item={item} />
              ))}
            </div>
            {activeRun.deliveries && activeRun.deliveries.length > 0 && (
              <div className="rounded-lg border bg-background/60 p-3 space-y-2">
                <p className="text-sm font-medium">Delivery status</p>
                {activeRun.deliveries.map((delivery, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="capitalize">
                      {delivery.channel}: {delivery.target}
                    </span>
                    <Badge variant={delivery.status === "sent" ? "default" : "destructive"}>
                      {delivery.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {runs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Recent autopilot runs</h3>
          <div className="space-y-2">
            {runs.slice(0, 8).map((run) => (
              <button
                key={run._id}
                type="button"
                onClick={() => setActiveRun(run)}
                className="w-full text-left rounded-lg border border-border/60 bg-muted/20 p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {run.trigger} · {run.period?.cadence}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {run.summary}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline">{run.recommendations?.length || 0} items</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(run.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const RecommendationCard = ({ item }: { item: BotAutopilotRecommendation }) => (
  <div className="rounded-lg border bg-background/80 p-4 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <p className="font-medium text-sm">{item.title}</p>
      <Badge variant={priorityVariant[item.priority] || "outline"} className="uppercase text-[10px]">
        {item.priority}
      </Badge>
    </div>
    <p className="text-sm text-muted-foreground">{item.detail}</p>
    {item.suggestedAction && (
      <p className="text-sm">
        <span className="font-medium text-emerald-700 dark:text-emerald-400">Next: </span>
        {item.suggestedAction}
      </p>
    )}
    {item.evidence && item.evidence.length > 0 && (
      <div className="flex flex-wrap gap-1 pt-1">
        {item.evidence.slice(0, 3).map((entry, index) => (
          <Badge key={index} variant="outline" className="text-[10px] font-normal">
            {entry.length > 60 ? `${entry.slice(0, 60)}…` : entry}
          </Badge>
        ))}
      </div>
    )}
    {item.channel && (
      <p className="text-xs text-muted-foreground capitalize">Channel: {item.channel.replace(/_/g, " ")}</p>
    )}
  </div>
);
