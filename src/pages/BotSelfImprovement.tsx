import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Database,
  LifeBuoy,
  MessageSquarePlus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  applyBotImprovementAction,
  getBotSelfImprovementDashboard,
  type BotSelfImprovementDashboard,
  type ImprovementAction,
  type ImprovementItem,
} from "@/api/analytics";

const actionLabels: Record<ImprovementAction, string> = {
  add_to_eval_dataset: "Add to eval dataset",
  create_training_qa: "Create training Q&A",
  mark_expected: "Mark expected",
  send_to_human_review: "Send to human review",
};

const actionIcons: Record<ImprovementAction, typeof Database> = {
  add_to_eval_dataset: Database,
  create_training_qa: MessageSquarePlus,
  mark_expected: ShieldCheck,
  send_to_human_review: LifeBuoy,
};

const typeLabels: Record<ImprovementItem["type"], string> = {
  weak_answer: "Weak answer",
  unanswered_question: "Unanswered",
  low_confidence_session: "Low-confidence session",
  hallucination_risk: "Grounding risk",
  repeated_unknown_intent: "Repeated intent",
};

const formatPercent = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `${Math.round(value * 100)}%`;
};

const BotSelfImprovement = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<BotSelfImprovementDashboard | null>(null);
  const [filter, setFilter] = useState<ImprovementItem["type"] | "all">("all");

  const fetchDashboard = async () => {
    if (!botId) return;

    try {
      setLoading(true);
      const response = await getBotSelfImprovementDashboard(botId);
      setDashboard(response.result || null);
    } catch (error) {
      toast({
        title: "Unable to load self-improvement dashboard",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [botId]);

  const filteredItems = useMemo(() => {
    const items = dashboard?.items || [];
    return filter === "all" ? items : items.filter((item) => item.type === filter);
  }, [dashboard?.items, filter]);

  const applyAction = async (item: ImprovementItem, action: ImprovementAction) => {
    if (!botId) return;

    try {
      setActionLoading(`${item.key}:${action}`);
      const response = await applyBotImprovementAction(botId, {
        itemKey: item.key,
        action,
        item,
      });

      toast({
        title: actionLabels[action],
        description:
          response?.result?.payload?.suggestedInstruction ||
          "Action saved for this improvement item.",
      });

      await fetchDashboard();
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar pageTitle="Self Improvement" />
        <div className="container mx-auto px-6 py-6 space-y-6">
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar pageTitle="Self Improvement" />
        <div className="container mx-auto px-6 py-6">
          <Card>
            <CardContent className="py-10 text-center">
              <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold">No self-improvement data available</p>
              <Button className="mt-4" onClick={() => navigate("/bots")}>
                Back to bots
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar pageTitle={`Improve - ${dashboard.bot.name}`} />

      <div className="container mx-auto px-6 py-6 space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="grid gap-6 lg:grid-cols-[240px_1fr_auto] lg:items-center">
              <div>
                <p className="text-sm text-muted-foreground">Bot Health Score</p>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-5xl font-bold">{dashboard.healthScore.score}</span>
                  <span className="text-lg text-muted-foreground mb-1">/100</span>
                </div>
                <Badge className="mt-3 capitalize">
                  {dashboard.healthScore.status.replace("_", " ")}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Metric label="Open Items" value={dashboard.summary.totalItems} />
                <Metric label="High Priority" value={dashboard.summary.highPriority} />
                <Metric label="Weak Answers" value={dashboard.summary.weakAnswers} />
                <Metric label="Unanswered" value={dashboard.summary.unanswered} />
                <Metric label="Grounding Risk" value={dashboard.summary.hallucinationRisk} />
                <Metric label="Repeated Intents" value={dashboard.summary.repeatedIntents} />
              </div>

              <Button variant="outline" onClick={fetchDashboard}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          {(["all", ...Object.keys(typeLabels)] as Array<typeof filter>).map((itemType) => (
            <Button
              key={itemType}
              variant={filter === itemType ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(itemType)}
            >
              {itemType === "all" ? "All" : typeLabels[itemType]}
            </Button>
          ))}
        </div>

        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <ImprovementCard
                key={item.key}
                item={item}
                onAction={applyAction}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-primary mb-3" />
              <p className="text-lg font-semibold">No items in this view</p>
              <p className="text-sm text-muted-foreground mt-1">
                New weak answers and unknown intents will appear here as users chat.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg bg-background/80 p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

const ImprovementCard = ({
  item,
  onAction,
  actionLoading,
}: {
  item: ImprovementItem;
  onAction: (item: ImprovementItem, action: ImprovementAction) => void;
  actionLoading: string | null;
}) => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-primary" />
            {item.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Badge variant={item.priority === "high" ? "destructive" : "secondary"}>
            {item.priority}
          </Badge>
          <Badge variant="outline">{typeLabels[item.type]}</Badge>
        </div>
      </div>
    </CardHeader>

    <CardContent className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground mb-1">Question</p>
        <p className="text-sm font-medium">{item.question}</p>
      </div>

      {item.answer && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">Answer</p>
          <p className="text-sm line-clamp-3">{item.answer}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Score label="Confidence" value={item.confidence} />
        <Score label="Grounding" value={item.hallucinationRisk === null ? null : 1 - item.hallucinationRisk} />
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Source</p>
          <p className="text-sm font-semibold capitalize">{item.source}</p>
        </div>
      </div>

      {item.actionState?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.actionState.map((state) => (
            <Badge key={`${state.action}-${state.createdAt}`} variant="outline">
              {actionLabels[state.action]} · {state.status}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {item.suggestedActions.map((action) => {
          const Icon = actionIcons[action];
          const key = `${item.key}:${action}`;
          return (
            <Button
              key={action}
              variant={action === "mark_expected" ? "outline" : "secondary"}
              size="sm"
              disabled={actionLoading === key}
              onClick={() => onAction(item, action)}
            >
              <Icon className="w-4 h-4 mr-2" />
              {actionLoading === key ? "Working..." : actionLabels[action]}
            </Button>
          );
        })}
      </div>
    </CardContent>
  </Card>
);

const Score = ({ label, value }: { label: string; value: number | null }) => (
  <div className="rounded-lg border p-3">
    <div className="flex items-center justify-between text-sm mb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{formatPercent(value)}</span>
    </div>
    <Progress value={typeof value === "number" ? value * 100 : 0} className="h-2" />
  </div>
);

export default BotSelfImprovement;
