import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileStack,
  Gavel,
  LifeBuoy,
  MessageSquarePlus,
  RefreshCw,
  ShieldCheck,
  TestTubes,
  Play,
  AlertCircle,
  Activity,
  Inbox,
  Send,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Scale,
  History,
  Eye,
  Target,
  BarChart3,
  Rocket,
  ShieldAlert,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BotAutopilotPanel } from "@/components/BotAutopilotPanel";
import { BotMonitoringPanel } from "@/components/BotMonitoringPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  applyBotImprovementAction,
  askBotSelfIntrospection,
  buildBotEvalDataset,
  createBotEvalDatasetType,
  deleteBotEvalDatasetType,
  getBotEvalDatasets,
  getBotSelfImprovementDashboard,
  runBotLLMJudge,
  createRegressionTests,
  getRegressionTests,
  runRegressionTests,
  type BotSelfImprovementDashboard,
  type BotEvalDatasetsResponse,
  type BotEvalDatasetType,
  type EvalDatasetPolarity,
  type EvalDatasetSourceType,
  type EvalRun,
  type EvalTraceSource,
  type JudgeEvalMode,
  type ImprovementAction,
  type ImprovementItem,
  type BotRegressionTest,
  type BotSelfIntrospectionResponse,
  type TestRunResults,
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

type DatasetSourceCard = {
  sourceType: EvalDatasetSourceType;
  title: string;
  description: string;
  polarity: EvalDatasetPolarity;
  icon: typeof Database;
};

const negativeDatasetSources: DatasetSourceCard[] = [
  {
    sourceType: "unanswered_questions",
    title: "Unanswered questions",
    description: "Fallbacks and source=none production answers to close knowledge gaps.",
    polarity: "negative",
    icon: AlertCircle,
  },
  {
    sourceType: "low_confidence_traces",
    title: "Low-confidence traces",
    description: "Questions where retrieval confidence was weak or missing.",
    polarity: "negative",
    icon: TrendingDown,
  },
  {
    sourceType: "hallucination_risk",
    title: "Hallucination risk",
    description: "Answers with high grounding risk that need citation or training fixes.",
    polarity: "negative",
    icon: AlertTriangle,
  },
  {
    sourceType: "handoff_sessions",
    title: "Handoff sessions",
    description: "Conversations that needed human support or escalation.",
    polarity: "negative",
    icon: LifeBuoy,
  },
  {
    sourceType: "negative_feedback",
    title: "Negative feedback",
    description: "Low-rated or commented sessions that need regression coverage.",
    polarity: "negative",
    icon: ThumbsDown,
  },
  {
    sourceType: "slow_responses",
    title: "Slow responses",
    description: "High-latency traces to benchmark performance regressions.",
    polarity: "negative",
    icon: Clock,
  },
];

const positiveDatasetSources: DatasetSourceCard[] = [
  {
    sourceType: "high_confidence_traces",
    title: "High-confidence traces",
    description: "Strong answers with confidence ≥ 90% to use as gold-standard baselines.",
    polarity: "positive",
    icon: TrendingUp,
  },
  {
    sourceType: "grounded_answers",
    title: "Grounded answers",
    description: "Well-grounded responses with low hallucination risk.",
    polarity: "positive",
    icon: ShieldCheck,
  },
  {
    sourceType: "qa_retrieval_hits",
    title: "QA retrieval hits",
    description: "Successful training-data matches with strong retrieval scores.",
    polarity: "positive",
    icon: CheckCircle2,
  },
  {
    sourceType: "positive_feedback",
    title: "Positive feedback",
    description: "Highly rated sessions to preserve as expected behavior.",
    polarity: "positive",
    icon: ThumbsUp,
  },
  {
    sourceType: "resolved_handoffs",
    title: "Resolved handoffs",
    description: "Successfully resolved escalations without re-escalation.",
    polarity: "positive",
    icon: Sparkles,
  },
];

const polarityBadgeVariant: Record<
  EvalDatasetPolarity | "mixed",
  "default" | "secondary" | "destructive" | "outline"
> = {
  positive: "default",
  negative: "destructive",
  neutral: "secondary",
  mixed: "outline",
};

const judgeCriteriaLabels: Record<string, string> = {
  relevance: "Relevance",
  helpfulness: "Helpfulness",
  groundedness: "Groundedness",
  toneMatch: "Tone match",
  instructionFollowing: "Instruction following",
  handoffCorrectness: "Handoff correctness",
  refusalCorrectness: "Refusal correctness",
  responseLengthFit: "Response length",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
};

const JUDGE_HISTORY_PAGE_SIZE = 5;

type JudgeHistoryStatusFilter = "all" | "completed" | "failed" | "running";
type JudgeHistoryPolarityFilter = "all" | EvalDatasetPolarity | "mixed";
type JudgeHistoryEvalModeFilter = "all" | JudgeEvalMode;

function getVisiblePages(
  currentPage: number,
  totalPages: number
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];

  if (currentPage > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (currentPage < totalPages - 2) {
    pages.push("ellipsis");
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

const builtinDatasetNames: Record<string, string> = {
  low_confidence_traces: "Low Confidence Traces",
  high_confidence_traces: "High Confidence Traces",
  handoff_sessions: "Handoff Sessions",
  resolved_handoffs: "Resolved Handoffs",
  negative_feedback: "Negative Feedback",
  positive_feedback: "Positive Feedback",
  unanswered_questions: "Unanswered Questions",
  grounded_answers: "Grounded Answers",
  hallucination_risk: "Hallucination Risk",
  qa_retrieval_hits: "QA Retrieval Hits",
  slow_responses: "Slow Responses",
};

type JudgeCatalogEntry = {
  key: string;
  title: string;
  description: string;
  polarity: EvalDatasetPolarity;
  icon: typeof Database;
  datasetName: string;
  kind: "builtin" | "custom";
  sourceType?: EvalDatasetSourceType;
  customTypeId?: string;
  itemCount: number;
  latestItemAt?: string;
  latestRun?: EvalRun | null;
  isBuilt: boolean;
};

const defaultIntrospectionQuestions = [
  "Why did my bot fail yesterday?",
  "What questions are users asking that I cannot answer?",
  "Which prompt version performed best?",
  "What should I add to training data?",
];

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
  const [datasetLoading, setDatasetLoading] = useState<string | null>(null);
  const [evalDatasetTab, setEvalDatasetTab] = useState("negative");
  const [judgeLoading, setJudgeLoading] = useState<string | null>(null);
  const [judgeEvalMode, setJudgeEvalMode] = useState<JudgeEvalMode>("standard");
  const [judgePassThreshold, setJudgePassThreshold] = useState(0.7);
  const [judgeSelectedCriteria, setJudgeSelectedCriteria] = useState<string[]>([]);
  const [selectedJudgeRun, setSelectedJudgeRun] = useState<EvalRun | null>(null);
  const [judgeRunModalOpen, setJudgeRunModalOpen] = useState(false);
  const [judgeHistoryPage, setJudgeHistoryPage] = useState(1);
  const [judgeHistoryFilters, setJudgeHistoryFilters] = useState({
    datasetName: "all",
    status: "all" as JudgeHistoryStatusFilter,
    polarity: "all" as JudgeHistoryPolarityFilter,
    evalMode: "all" as JudgeHistoryEvalModeFilter,
  });
  const [dashboard, setDashboard] = useState<BotSelfImprovementDashboard | null>(null);
  const [evalData, setEvalData] = useState<BotEvalDatasetsResponse | null>(null);
  const [filter, setFilter] = useState<ImprovementItem["type"] | "all">("all");
  const [introspectionQuestion, setIntrospectionQuestion] = useState(defaultIntrospectionQuestions[0]);
  const [introspectionLoading, setIntrospectionLoading] = useState(false);
  const [introspectionResult, setIntrospectionResult] = useState<BotSelfIntrospectionResponse | null>(null);

  const [customTypeDialogOpen, setCustomTypeDialogOpen] = useState(false);
  const [customTypeSaving, setCustomTypeSaving] = useState(false);
  const [customTypeForm, setCustomTypeForm] = useState({
    name: "",
    description: "",
    polarity: "neutral" as EvalDatasetPolarity,
    traceSource: "interaction_metrics" as EvalTraceSource,
    confidenceMin: "",
    confidenceMax: "",
    hallucinationRiskMax: "",
    groundednessScoreMin: "",
    usedFallback: "any" as "any" | "true" | "false",
    sources: "",
    latencyMsMin: "",
    userRatingMin: "",
    handoffStatus: "",
  });

  // Regression Test State
  const [regressionTests, setRegressionTests] = useState<BotRegressionTest[]>([]);
  const [regressionLoading, setRegressionLoading] = useState(false);
  const [testRunning, setTestRunning] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestRunResults | null>(null);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<BotRegressionTest | null>(null);

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

  const fetchEvalData = async () => {
    if (!botId) return;
    const response = await getBotEvalDatasets(botId);
    setEvalData(response.result || null);
  };

  const fetchRegressionTests = async () => {
    if (!botId) return;

    try {
      setRegressionLoading(true);
      const response = await getRegressionTests(botId);
      setRegressionTests(response.result || []);
    } catch (error) {
      toast({
        title: "Unable to load regression tests",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegressionLoading(false);
    }
  };

  const createRegressionTestSuite = async () => {
    if (!botId) return;

    try {
      setRegressionLoading(true);
      await createRegressionTests(botId);
      toast({
        title: "Regression test suite created",
        description: "Tests created from production conversations.",
      });
      await fetchRegressionTests();
    } catch (error) {
      toast({
        title: "Failed to create regression tests",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegressionLoading(false);
    }
  };

  const runTest = async (testSuiteId: string) => {
    if (!botId) return;

    try {
      setTestRunning(testSuiteId);
      const response = await runRegressionTests(botId, testSuiteId);
      setTestResults(response.result);
      setResultsModalOpen(true);

      // Show summary toast
      if (response.result?.summary?.improved > 0 && response.result?.summary?.regressed > 0) {
        toast({
          title: "Tests completed with mixed results",
          description: response.result.summary.message,
          variant: "destructive",
        });
      } else if (response.result?.summary?.improved > 0) {
        toast({
          title: "Great improvements!",
          description: response.result.summary.message,
        });
      } else if (response.result?.summary?.regressed > 0) {
        toast({
          title: "Regressions detected",
          description: response.result.summary.message,
          variant: "destructive",
        });
      }

      await fetchRegressionTests();
    } catch (error) {
      toast({
        title: "Failed to run tests",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setTestRunning(null);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchEvalData().catch(() => null);
    fetchRegressionTests().catch(() => null);
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

  const buildDataset = async (
    sourceType: EvalDatasetSourceType,
    customTypeId?: string,
    loadingKey?: string
  ) => {
    if (!botId) return;

    const key = loadingKey || customTypeId || sourceType;

    try {
      setDatasetLoading(key);
      const response = await buildBotEvalDataset(botId, sourceType, customTypeId);
      toast({
        title: "Eval dataset created",
        description: `${response.result?.createdCount || 0} examples added to ${response.result?.datasetName}.`,
      });
      await fetchEvalData();
    } catch (error) {
      toast({
        title: "Dataset build failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDatasetLoading(null);
    }
  };

  const resetCustomTypeForm = () => {
    setCustomTypeForm({
      name: "",
      description: "",
      polarity: "neutral",
      traceSource: "interaction_metrics",
      confidenceMin: "",
      confidenceMax: "",
      hallucinationRiskMax: "",
      groundednessScoreMin: "",
      usedFallback: "any",
      sources: "",
      latencyMsMin: "",
      userRatingMin: "",
      handoffStatus: "",
    });
  };

  const createCustomDatasetType = async () => {
    if (!botId) return;

    const name = customTypeForm.name.trim();
    if (!name) {
      toast({
        title: "Name required",
        description: "Give your custom eval type a descriptive name.",
        variant: "destructive",
      });
      return;
    }

    const parseNumber = (value: string) => {
      if (!value.trim()) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const traceFilters =
      customTypeForm.traceSource === "interaction_metrics"
        ? {
            confidenceMin: parseNumber(customTypeForm.confidenceMin),
            confidenceMax: parseNumber(customTypeForm.confidenceMax),
            hallucinationRiskMax: parseNumber(customTypeForm.hallucinationRiskMax),
            groundednessScoreMin: parseNumber(customTypeForm.groundednessScoreMin),
            usedFallback:
              customTypeForm.usedFallback === "any"
                ? null
                : customTypeForm.usedFallback === "true",
            sources: customTypeForm.sources
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            latencyMsMin: parseNumber(customTypeForm.latencyMsMin),
          }
        : {};

    const handoffFilters =
      customTypeForm.traceSource === "handoff_sessions"
        ? {
            statuses: customTypeForm.handoffStatus
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            userRatingMin: parseNumber(customTypeForm.userRatingMin),
          }
        : {};

    try {
      setCustomTypeSaving(true);
      await createBotEvalDatasetType(botId, {
        name,
        description: customTypeForm.description.trim(),
        polarity: customTypeForm.polarity,
        traceSource: customTypeForm.traceSource,
        traceFilters,
        handoffFilters,
        datasetName: name,
      });
      toast({
        title: "Custom eval type created",
        description: `"${name}" is ready to build datasets from matching traces.`,
      });
      setCustomTypeDialogOpen(false);
      resetCustomTypeForm();
      await fetchEvalData();
    } catch (error) {
      toast({
        title: "Failed to create custom type",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCustomTypeSaving(false);
    }
  };

  const removeCustomDatasetType = async (type: BotEvalDatasetType) => {
    if (!botId) return;

    try {
      await deleteBotEvalDatasetType(botId, type._id);
      toast({
        title: "Custom type deleted",
        description: `"${type.name}" was removed.`,
      });
      await fetchEvalData();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderDatasetSourceCard = (source: DatasetSourceCard) => {
    const Icon = source.icon;
    return (
      <div
        key={source.sourceType}
        className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-5 transition-colors hover:bg-muted/50"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <Badge variant={polarityBadgeVariant[source.polarity]} className="text-[10px] uppercase">
            {source.polarity}
          </Badge>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{source.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{source.description}</p>
        </div>
        <Button
          size="sm"
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90 shadow-md"
          disabled={datasetLoading === source.sourceType}
          onClick={() => buildDataset(source.sourceType)}
        >
          <Database className="w-4 h-4 mr-2" />
          {datasetLoading === source.sourceType ? "Creating..." : "Create dataset"}
        </Button>
      </div>
    );
  };

  const customTypes = evalData?.customTypes || [];
  const judgeConfig = evalData?.judgeConfig;
  const judgeSummary = evalData?.judgeSummary;
  const allCriteria = judgeConfig?.criteria || [];

  const builtDatasets = evalData?.datasets || [];

  const findBuiltDataset = (datasetName: string) =>
    builtDatasets.find((dataset) => dataset.datasetName === datasetName);

  const catalogFromSource = (source: DatasetSourceCard): JudgeCatalogEntry => {
    const datasetName =
      evalData?.builtinTypes?.find((type) => type.sourceType === source.sourceType)
        ?.datasetName || builtinDatasetNames[source.sourceType] || source.title;
    const built = findBuiltDataset(datasetName);

    return {
      key: source.sourceType,
      title: source.title,
      description: source.description,
      polarity: source.polarity,
      icon: source.icon,
      datasetName,
      kind: "builtin",
      sourceType: source.sourceType,
      itemCount: built?.itemCount || 0,
      latestItemAt: built?.latestItemAt,
      latestRun: built?.latestRun || null,
      isBuilt: (built?.itemCount || 0) > 0,
    };
  };

  const judgeCatalog = useMemo(() => {
    const catalogNames = new Set<string>();

    const negative = negativeDatasetSources.map(catalogFromSource);
    negative.forEach((entry) => catalogNames.add(entry.datasetName));

    const positive = positiveDatasetSources.map(catalogFromSource);
    positive.forEach((entry) => catalogNames.add(entry.datasetName));

    const custom: JudgeCatalogEntry[] = customTypes.map((type) => {
      const datasetName = type.datasetName || type.name;
      const built = builtDatasets.find(
        (dataset) => dataset.datasetName === datasetName
      );

      return {
        key: `custom:${type._id}`,
        title: type.name,
        description: type.description || "Custom trace-based evaluation criteria.",
        polarity: type.polarity,
        icon: Zap,
        datasetName,
        kind: "custom",
        customTypeId: type._id,
        itemCount: built?.itemCount || 0,
        latestItemAt: built?.latestItemAt,
        latestRun: built?.latestRun || null,
        isBuilt: (built?.itemCount || 0) > 0,
      };
    });
    custom.forEach((entry) => catalogNames.add(entry.datasetName));

    const other = builtDatasets
      .filter((dataset) => !catalogNames.has(dataset.datasetName))
      .map((dataset) => ({
        key: `other:${dataset.datasetName}`,
        title: dataset.datasetName,
        description: dataset.description || "Additional eval dataset.",
        polarity: (dataset.polarity as EvalDatasetPolarity) || "neutral",
        icon: Database,
        datasetName: dataset.datasetName,
        kind: "builtin" as const,
        itemCount: dataset.itemCount,
        latestItemAt: dataset.latestItemAt,
        latestRun: dataset.latestRun || null,
        isBuilt: dataset.itemCount > 0,
      }));

    return { negative, positive, custom, other };
  }, [evalData, customTypes]);

  const builtCatalogEntries = useMemo(
    () =>
      [
        ...judgeCatalog.negative,
        ...judgeCatalog.positive,
        ...judgeCatalog.custom,
        ...judgeCatalog.other,
      ].filter((entry) => entry.isBuilt),
    [judgeCatalog]
  );

  const judgeHistoryDatasetOptions = useMemo(() => {
    const names = new Set<string>();
    (evalData?.runs || []).forEach((run) => {
      if (run.datasetName) names.add(run.datasetName);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [evalData?.runs]);

  const filteredJudgeRuns = useMemo(() => {
    return (evalData?.runs || []).filter((run) => {
      if (
        judgeHistoryFilters.datasetName !== "all" &&
        run.datasetName !== judgeHistoryFilters.datasetName
      ) {
        return false;
      }
      if (
        judgeHistoryFilters.status !== "all" &&
        run.status !== judgeHistoryFilters.status
      ) {
        return false;
      }
      if (
        judgeHistoryFilters.polarity !== "all" &&
        run.polarity !== judgeHistoryFilters.polarity
      ) {
        return false;
      }
      if (
        judgeHistoryFilters.evalMode !== "all" &&
        run.evalMode !== judgeHistoryFilters.evalMode
      ) {
        return false;
      }
      return true;
    });
  }, [evalData?.runs, judgeHistoryFilters]);

  const judgeHistoryTotalPages = Math.max(
    1,
    Math.ceil(filteredJudgeRuns.length / JUDGE_HISTORY_PAGE_SIZE)
  );

  const paginatedJudgeRuns = useMemo(() => {
    const safePage = Math.min(judgeHistoryPage, judgeHistoryTotalPages);
    const start = (safePage - 1) * JUDGE_HISTORY_PAGE_SIZE;
    return filteredJudgeRuns.slice(start, start + JUDGE_HISTORY_PAGE_SIZE);
  }, [filteredJudgeRuns, judgeHistoryPage, judgeHistoryTotalPages]);

  useEffect(() => {
    setJudgeHistoryPage(1);
  }, [judgeHistoryFilters]);

  useEffect(() => {
    if (judgeHistoryPage > judgeHistoryTotalPages) {
      setJudgeHistoryPage(judgeHistoryTotalPages);
    }
  }, [judgeHistoryPage, judgeHistoryTotalPages]);

  const runJudgeBatch = async (datasetNames: string[], loadingKey: string) => {
    if (!botId) return;
    if (!datasetNames.length) {
      toast({
        title: "No built datasets",
        description: "Create datasets first using Create dataset or Build & grade on a type below.",
        variant: "destructive",
      });
      return;
    }
    setJudgeLoading(loadingKey);
    try {
      for (const name of datasetNames) {
        await runBotLLMJudge(botId, {
          datasetName: name,
          evalMode: judgeEvalMode,
          passThreshold: judgePassThreshold,
          selectedCriteria:
            judgeEvalMode === "custom" ? judgeSelectedCriteria : undefined,
        });
      }
      toast({
        title: "Batch grading completed",
        description: `Graded ${datasetNames.length} dataset(s).`,
      });
      await fetchEvalData();
    } catch (error) {
      toast({
        title: "Batch grading failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setJudgeLoading(null);
    }
  };

  const toggleJudgeCriterion = (key: string) => {
    setJudgeSelectedCriteria((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const runJudge = async (datasetName: string, loadingKey?: string) => {
    if (!botId) return;

    const key = loadingKey || datasetName;

    try {
      setJudgeLoading(key);
      const response = await runBotLLMJudge(botId, {
        datasetName,
        evalMode: judgeEvalMode,
        passThreshold: judgePassThreshold,
        selectedCriteria:
          judgeEvalMode === "custom" ? judgeSelectedCriteria : undefined,
      });

      const result = response.result;
      const passRate =
        typeof result?.passRate === "number"
          ? `${Math.round(result.passRate * 100)}% pass rate`
          : `Overall: ${formatPercent(result?.overallScore)}`;

      toast({
        title: "LLM-as-a-Judge completed",
        description: `${result?.datasetName || datasetName} — ${passRate}`,
      });

      if (result) {
        setSelectedJudgeRun(result);
        setJudgeRunModalOpen(true);
      }

      await fetchEvalData();
    } catch (error) {
      toast({
        title: "Judge run failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setJudgeLoading(null);
    }
  };

  const buildCatalogDataset = async (entry: JudgeCatalogEntry) => {
    if (!botId) return;

    try {
      setDatasetLoading(entry.key);
      if (entry.kind === "custom" && entry.customTypeId) {
        await buildBotEvalDataset(botId, "custom", entry.customTypeId);
      } else if (entry.sourceType) {
        await buildBotEvalDataset(botId, entry.sourceType);
      }
      toast({
        title: "Eval dataset created",
        description: `Examples added to ${entry.datasetName}.`,
      });
      await fetchEvalData();
    } catch (error) {
      toast({
        title: "Dataset build failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDatasetLoading(null);
    }
  };

  const buildAndJudge = async (entry: JudgeCatalogEntry) => {
    if (!botId) return;

    try {
      setJudgeLoading(entry.key);
      if (!entry.isBuilt) {
        if (entry.kind === "custom" && entry.customTypeId) {
          await buildBotEvalDataset(botId, "custom", entry.customTypeId);
        } else if (entry.sourceType) {
          await buildBotEvalDataset(botId, entry.sourceType);
        }
        await fetchEvalData();
      }

      const response = await runBotLLMJudge(botId, {
        datasetName: entry.datasetName,
        evalMode: judgeEvalMode,
        passThreshold: judgePassThreshold,
        selectedCriteria:
          judgeEvalMode === "custom" ? judgeSelectedCriteria : undefined,
      });

      const result = response.result;
      toast({
        title: entry.isBuilt ? "LLM-as-a-Judge completed" : "Built & graded",
        description: `${entry.datasetName} — ${formatPercent(result?.overallScore)}`,
      });

      if (result) {
        setSelectedJudgeRun(result);
        setJudgeRunModalOpen(true);
      }

      await fetchEvalData();
    } catch (error) {
      toast({
        title: "Judge run failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setJudgeLoading(null);
    }
  };

  const renderJudgeCatalogCard = (entry: JudgeCatalogEntry) => (
    <JudgeCatalogCard
      key={entry.key}
      entry={entry}
      datasetLoading={datasetLoading === entry.key}
      judgeLoading={judgeLoading === entry.key}
      onCreateDataset={() => buildCatalogDataset(entry)}
      onGrade={() => runJudge(entry.datasetName, entry.key)}
      onBuildAndGrade={() => buildAndJudge(entry)}
      onViewRun={(run) => {
        setSelectedJudgeRun(run);
        setJudgeRunModalOpen(true);
      }}
    />
  );

  const askIntrospectionTool = async (questionOverride?: string) => {
    if (!botId) return;
    const question = (questionOverride || introspectionQuestion).trim();
    if (!question) {
      toast({
        title: "Ask a question first",
        description: "Enter what you want the bot to inspect in its Phoenix traces.",
      });
      return;
    }

    try {
      setIntrospectionLoading(true);
      setIntrospectionQuestion(question);
      const response = await askBotSelfIntrospection(botId, question);
      setIntrospectionResult(response.result || null);
    } catch (error) {
      toast({
        title: "Self-introspection failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIntrospectionLoading(false);
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
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar pageTitle={`Improve - ${dashboard.bot.name}`} />

      <Tabs
        defaultValue="improvements"
        orientation="vertical"
        className="flex-1 min-h-0 flex flex-col md:flex-row"
      >
        <TabsList className="h-auto w-full md:w-72 md:h-full md:flex-col md:items-stretch md:justify-start rounded-none p-3 gap-1 border-b md:border-b-0 md:border-r border-border/60 bg-muted/30 shrink-0">
          <TabsTrigger value="improvements" className="w-full justify-start gap-2 text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400">
            <BrainCircuit className="w-4 h-4" />
            Improvements
          </TabsTrigger>
          <TabsTrigger value="introspection" className="w-full justify-start gap-2 text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400">
            <Activity className="w-4 h-4" />
            Ask Phoenix
          </TabsTrigger>
          <TabsTrigger value="eval-datasets" className="w-full justify-start gap-2 text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400">
            <FileStack className="w-4 h-4" />
            Eval Datasets
          </TabsTrigger>
          <TabsTrigger value="llm-judge" className="w-full justify-start gap-2 text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400">
            <Gavel className="w-4 h-4" />
            LLM as Judge
          </TabsTrigger>
          <TabsTrigger value="regression-tests" className="w-full justify-start gap-2 text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400">
            <TestTubes className="w-4 h-4" />
            Regression Tests
          </TabsTrigger>
          <TabsTrigger value="autopilot" className="w-full justify-start gap-2 text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400">
            <Rocket className="w-4 h-4" />
            Autopilot
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="w-full justify-start gap-2 text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400">
            <ShieldAlert className="w-4 h-4" />
            Monitoring
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0 overflow-y-auto px-4 py-6 md:px-8 lg:px-10 space-y-6">
          {/* Phoenix Self-Introspection Tab */}
          <TabsContent value="introspection" className="mt-0 space-y-4">
            <SectionHeader
              icon={Activity}
              title="Ask Phoenix"
              description="Private admin tool: inspect recent Phoenix traces and identify what the bot is failing at."
            />
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
              <Card className="border-border/60 shadow-sm">
                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {defaultIntrospectionQuestions.map((question) => (
                      <Button
                        key={question}
                        variant="outline"
                        className="h-auto justify-start whitespace-normal text-left rounded-xl border-border/60 bg-muted/30 hover:bg-muted/60"
                        disabled={introspectionLoading}
                        onClick={() => askIntrospectionTool(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      value={introspectionQuestion}
                      onChange={(event) => setIntrospectionQuestion(event.target.value)}
                      placeholder="Ask anything about failures, missing training data, prompt versions, evals, handoffs, or recent Phoenix traces."
                      className="min-h-28"
                    />
                    <Button
                      onClick={() => askIntrospectionTool()}
                      disabled={introspectionLoading}
                      className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {introspectionLoading ? "Inspecting traces..." : "Ask introspection tool"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Phoenix Evidence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Metric
                    label="Linked Traces"
                    value={introspectionResult?.evidence?.phoenix?.linkedTraceCount || 0}
                  />
                  <Metric
                    label="Sampled Interactions"
                    value={introspectionResult?.evidence?.metrics?.sampledInteractions || 0}
                  />
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Fallback Rate</p>
                    <p className="text-2xl font-bold">
                      {formatPercent(introspectionResult?.evidence?.metrics?.fallbackRate)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Phoenix Project</p>
                    <p className="text-sm font-semibold">
                      {introspectionResult?.evidence?.phoenix?.projectName || "Not inspected yet"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {introspectionResult ? (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Answer</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {introspectionResult.question}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                      {introspectionResult.answer}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Failure Clusters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {introspectionResult.evidence.failureClusters.slice(0, 5).map((cluster) => (
                      <div key={cluster.intentKey} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">
                              {cluster.examples?.[0]?.question || cluster.intentKey}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {cluster.count} traces · {cluster.fallbackCount} fallback
                            </p>
                          </div>
                          <Badge variant="outline">
                            {formatPercent(cluster.avgConfidence)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {introspectionResult.evidence.failureClusters.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No repeated failure clusters were found in the sampled traces.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-lg font-semibold">Ask the bot what it is failing at</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The private tool uses recent Phoenix-linked traces, local trace metrics, eval runs, and experiments.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Eval Datasets Tab */}
          <TabsContent value="eval-datasets" className="mt-0 space-y-6">
            <SectionHeader
              icon={FileStack}
              title="Eval Datasets"
              description="Build regression and gold-standard datasets from production traces — failures to fix and successes to preserve."
            />

            <Tabs value={evalDatasetTab} onValueChange={setEvalDatasetTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
                <TabsTrigger value="negative" className="gap-1.5">
                  <ThumbsDown className="h-4 w-4" />
                  Regression gaps
                </TabsTrigger>
                <TabsTrigger value="positive" className="gap-1.5">
                  <ThumbsUp className="h-4 w-4" />
                  Gold standard
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-1.5">
                  <Zap className="h-4 w-4" />
                  Custom
                </TabsTrigger>
              </TabsList>

              <TabsContent value="negative" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Negative signals — failures, gaps, and risks to evaluate and improve.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {negativeDatasetSources.map(renderDatasetSourceCard)}
                </div>
              </TabsContent>

              <TabsContent value="positive" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Positive signals — high-quality answers to benchmark against.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {positiveDatasetSources.map(renderDatasetSourceCard)}
                </div>
              </TabsContent>

              <TabsContent value="custom" className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Define your own trace filters and evaluate on your criteria.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCustomTypeDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create custom type
                  </Button>
                </div>

                {customTypes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customTypes.map((type) => (
                    <div
                      key={type._id}
                      className="group flex flex-col gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={polarityBadgeVariant[type.polarity]} className="text-[10px] uppercase">
                            {type.polarity}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeCustomDatasetType(type)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{type.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {type.description || "Custom trace-based evaluation criteria."}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Source: {type.traceSource === "handoff_sessions" ? "Handoff sessions" : "Bot interactions"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        variant="secondary"
                        disabled={datasetLoading === type._id}
                        onClick={() => buildDataset("custom", type._id, type._id)}
                      >
                        <Database className="w-4 h-4 mr-2" />
                        {datasetLoading === type._id ? "Creating..." : "Create dataset"}
                      </Button>
                    </div>
                  ))}
                </div>
                ) : (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <Zap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">No custom eval types yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      Create a type like &quot;Unanswered pricing questions&quot; with confidence and fallback filters,
                      then build datasets and run LLM-as-a-Judge on them.
                    </p>
                  </CardContent>
                </Card>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* LLM as Judge Tab */}
          <TabsContent value="llm-judge" className="mt-0 space-y-6">
            <SectionHeader
              icon={Gavel}
              title="LLM as Judge"
              description="Grade regression and gold-standard datasets with polarity-aware scoring, configurable criteria, and per-item verdicts."
              action={
                builtCatalogEntries.length > 0 ? (
                  <Button
                    disabled={!!judgeLoading}
                    onClick={() =>
                      runJudgeBatch(
                        builtCatalogEntries.map((entry) => entry.datasetName),
                        "all"
                      )
                    }
                    className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90"
                  >
                    <Gavel className="w-4 h-4 mr-2" />
                    {judgeLoading === "all" ? "Running judge..." : "Grade all built datasets"}
                  </Button>
                ) : undefined
              }
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric
                label="Dataset types"
                value={
                  judgeCatalog.negative.length +
                  judgeCatalog.positive.length +
                  judgeCatalog.custom.length
                }
              />
              <Metric label="Built datasets" value={builtCatalogEntries.length} />
              <Metric label="Judge runs" value={judgeSummary?.totalRuns || 0} />
              <div className="rounded-lg bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">Avg score</p>
                <p className="text-2xl font-bold">
                  {formatPercent(judgeSummary?.averageOverallScore)}
                </p>
              </div>
            </div>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  Judge configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Evaluation mode</Label>
                    <Select
                      value={judgeEvalMode}
                      onValueChange={(value: JudgeEvalMode) => setJudgeEvalMode(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(judgeConfig?.evalModes || []).map((mode) => (
                          <SelectItem key={mode.key} value={mode.key}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {judgeConfig?.evalModes.find((mode) => mode.key === judgeEvalMode)
                        ?.description ||
                        "Standard mode auto-selects regression or gold-standard grading based on dataset polarity."}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Pass threshold</Label>
                      <span className="text-sm font-semibold">
                        {Math.round(judgePassThreshold * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[judgePassThreshold]}
                      min={0.5}
                      max={0.95}
                      step={0.05}
                      onValueChange={(value) => setJudgePassThreshold(value[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      Negative datasets: items below threshold pass (confirms failure). Positive
                      datasets: items above threshold pass (confirms quality).
                    </p>
                  </div>
                </div>

                {judgeEvalMode === "custom" && (
                  <div className="rounded-lg border p-4 space-y-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Select criteria to grade
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {allCriteria.map((criterion) => (
                        <label
                          key={criterion.key}
                          className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={judgeSelectedCriteria.includes(criterion.key)}
                            onCheckedChange={() => toggleJudgeCriterion(criterion.key)}
                          />
                          <div>
                            <p className="text-sm font-medium">{criterion.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {criterion.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Grading dimensions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allCriteria.map((criterion) => (
                      <Badge key={criterion.key} variant="outline" className="text-xs">
                        {criterion.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ThumbsDown className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-semibold">Regression datasets</h3>
                  <span className="text-xs text-muted-foreground">
                    All built-in negative eval types
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!judgeLoading}
                  onClick={() =>
                    runJudgeBatch(
                      judgeCatalog.negative
                        .filter((entry) => entry.isBuilt)
                        .map((entry) => entry.datasetName),
                      "batch-negative"
                    )
                  }
                >
                  {judgeLoading === "batch-negative" ? "Grading..." : "Grade all built regression"}
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {judgeCatalog.negative.map(renderJudgeCatalogCard)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Gold standard datasets</h3>
                  <span className="text-xs text-muted-foreground">
                    All built-in positive eval types
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!judgeLoading}
                  onClick={() =>
                    runJudgeBatch(
                      judgeCatalog.positive
                        .filter((entry) => entry.isBuilt)
                        .map((entry) => entry.datasetName),
                      "batch-positive"
                    )
                  }
                >
                  {judgeLoading === "batch-positive"
                    ? "Grading..."
                    : "Grade all built gold standard"}
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {judgeCatalog.positive.map(renderJudgeCatalogCard)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">Custom eval types</h3>
                  <span className="text-xs text-muted-foreground">
                    User-defined trace filters — fetched from your bot
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCustomTypeDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create custom type
                </Button>
              </div>
              {judgeCatalog.custom.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {judgeCatalog.custom.map(renderJudgeCatalogCard)}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <Zap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">No custom eval types yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create a custom type here or in the Eval Datasets tab, then build and grade it.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {judgeCatalog.other.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Other built datasets</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {judgeCatalog.other.map(renderJudgeCatalogCard)}
                </div>
              </div>
            )}

            {(evalData?.runs?.length || 0) > 0 && (
              <JudgeRunHistoryPanel
                runs={paginatedJudgeRuns}
                totalRuns={evalData?.runs?.length || 0}
                filteredCount={filteredJudgeRuns.length}
                page={Math.min(judgeHistoryPage, judgeHistoryTotalPages)}
                totalPages={judgeHistoryTotalPages}
                pageSize={JUDGE_HISTORY_PAGE_SIZE}
                filters={judgeHistoryFilters}
                datasetOptions={judgeHistoryDatasetOptions}
                onFiltersChange={setJudgeHistoryFilters}
                onPageChange={setJudgeHistoryPage}
                onViewRun={(run) => {
                  setSelectedJudgeRun(run);
                  setJudgeRunModalOpen(true);
                }}
              />
            )}

            <Dialog open={judgeRunModalOpen} onOpenChange={setJudgeRunModalOpen}>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Judge run details</DialogTitle>
                </DialogHeader>
                {selectedJudgeRun && (
                  <JudgeRunDetail run={selectedJudgeRun} />
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Autopilot Tab */}
          <TabsContent value="autopilot" className="mt-0 space-y-4">
            {botId ? <BotAutopilotPanel botId={botId} /> : null}
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="mt-0 space-y-4">
            {botId ? <BotMonitoringPanel botId={botId} /> : null}
          </TabsContent>

          {/* Regression Tests Tab */}
          <TabsContent value="regression-tests" className="mt-0 space-y-4">
            <SectionHeader
              icon={TestTubes}
              title="Regression Tests"
              description="Turn bad production conversations into permanent test cases and re-run them after updates."
            />
            <Card className="border-border/60 shadow-sm">
              <CardContent className="space-y-4 pt-6">
                {regressionTests.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-border/60 p-10 text-center">
                    <TestTubes className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="font-semibold">No regression tests yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create test cases from your production conversations to catch regressions.
                    </p>
                    <Button
                      className="mt-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90"
                      onClick={createRegressionTestSuite}
                      disabled={regressionLoading}
                    >
                      {regressionLoading ? "Creating..." : "Create regression tests"}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={createRegressionTestSuite}
                      disabled={regressionLoading}
                      className="w-full"
                    >
                      + Create additional test suite
                    </Button>

                    <div className="space-y-4">
                      {regressionTests.map((testSuite) => (
                        <RegressionTestCard
                          key={testSuite._id}
                          testSuite={testSuite}
                          onRun={() => runTest(testSuite._id)}
                          isRunning={testRunning === testSuite._id}
                        />
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {testResults && (
              <Dialog open={resultsModalOpen} onOpenChange={setResultsModalOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Regression Test Results</DialogTitle>
                  </DialogHeader>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Total Tests</p>
                      <p className="text-2xl font-bold">{testResults.statistics.totalTests}</p>
                    </div>
                    <div className="rounded-lg border p-3 border-green-500/50 bg-green-50/50">
                      <p className="text-xs text-muted-foreground">Passed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {testResults.statistics.passedTests}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 border-red-500/50 bg-red-50/50">
                      <p className="text-xs text-muted-foreground">Failed</p>
                      <p className="text-2xl font-bold text-red-600">
                        {testResults.statistics.failedTests}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Pass Rate</p>
                      <p className="text-2xl font-bold">
                        {formatPercent(
                          testResults.statistics.totalTests > 0
                            ? testResults.statistics.passedTests /
                                testResults.statistics.totalTests
                            : 0
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Improvements vs Regressions */}
                  {(testResults.summary.improved > 0 || testResults.summary.regressed > 0) && (
                    <div className="rounded-lg border p-4 space-y-3">
                      <p className="font-semibold flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {testResults.summary.message}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {testResults.summary.improved > 0 && (
                          <div className="flex items-center gap-2 text-green-600">
                            <TrendingUp className="w-4 h-4" />
                            <span>{testResults.summary.improved} improved</span>
                          </div>
                        )}
                        {testResults.summary.regressed > 0 && (
                          <div className="flex items-center gap-2 text-red-600">
                            <TrendingDown className="w-4 h-4" />
                            <span>{testResults.summary.regressed} broken</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Test Results Details */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <p className="font-medium text-sm">Test Details</p>
                    {testResults.testRuns.slice(0, 10).map((run, idx) => (
                      <div key={idx} className="rounded-lg border p-3 space-y-2 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium">Test {idx + 1}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {run.verdict}
                            </p>
                          </div>
                          <Badge
                            variant={
                              run.verdict === "passed"
                                ? "default"
                                : run.verdict === "improved"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {run.verdict}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Relevance</p>
                            <p className="font-semibold">{formatPercent(run.relevanceScore)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Groundedness</p>
                            <p className="font-semibold">
                              {formatPercent(run.groundednessScore)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Improvements Tab */}
          <TabsContent value="improvements" className="mt-0 space-y-4">
            <SectionHeader
              icon={BrainCircuit}
              title="Improvements"
              description="Prioritized fixes from weak answers, unanswered questions, and grounding risks."
            />
            <HealthScoreCard dashboard={dashboard} onRefresh={fetchDashboard} />

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
          </TabsContent>
        </div>
      </Tabs>

      <CustomEvalTypeDialog
        open={customTypeDialogOpen}
        onOpenChange={setCustomTypeDialogOpen}
        form={customTypeForm}
        onFormChange={setCustomTypeForm}
        saving={customTypeSaving}
        onSubmit={createCustomDatasetType}
        onReset={resetCustomTypeForm}
      />
    </div>
  );
};

const RegressionTestCard = ({
  testSuite,
  onRun,
  isRunning,
}: {
  testSuite: BotRegressionTest;
  onRun: () => void;
  isRunning: boolean;
}) => {
  const passRate =
    testSuite.statistics.totalTests > 0
      ? testSuite.statistics.passedTests / testSuite.statistics.totalTests
      : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-base">{testSuite.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{testSuite.description}</p>
          </div>
          <Badge variant={testSuite.status === "active" ? "default" : "secondary"}>
            {testSuite.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border p-2">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{testSuite.statistics.totalTests}</p>
          </div>
          <div className="rounded-lg border p-2 border-green-500/50">
            <p className="text-xs text-muted-foreground">Passed</p>
            <p className="text-xl font-bold text-green-600">
              {testSuite.statistics.passedTests}
            </p>
          </div>
          <div className="rounded-lg border p-2 border-red-500/50">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-xl font-bold text-red-600">{testSuite.statistics.failedTests}</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-xs text-muted-foreground">Pass Rate</p>
            <p className="text-xl font-bold">{formatPercent(passRate)}</p>
          </div>
        </div>

        {/* Improvements/Regressions */}
        {(testSuite.statistics.improvements > 0 || testSuite.statistics.regressions > 0) && (
          <div className="rounded-lg bg-blue-50/50 border border-blue-200 p-3 space-y-2">
            <p className="text-sm font-medium">Changes detected:</p>
            <div className="flex items-center gap-4 text-sm">
              {testSuite.statistics.improvements > 0 && (
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>{testSuite.statistics.improvements} improved</span>
                </div>
              )}
              {testSuite.statistics.regressions > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <TrendingDown className="w-4 h-4" />
                  <span>{testSuite.statistics.regressions} broken</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last Run Info */}
        {testSuite.lastRunAt && (
          <p className="text-xs text-muted-foreground">
            Last run: {new Date(testSuite.lastRunAt).toLocaleDateString()}
          </p>
        )}

        {/* Run Button */}
        <Button className="w-full" onClick={onRun} disabled={isRunning}>
          <Play className="w-4 h-4 mr-2" />
          {isRunning ? "Running tests..." : "Run tests"}
        </Button>
      </CardContent>
    </Card>
  );
};

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg bg-background/80 p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

const SectionHeader = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Database;
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

const healthStatusStyles: Record<string, { ring: string; text: string; badge: string; label: string }> = {
  healthy: {
    ring: "stroke-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
    label: "Healthy",
  },
  watch: {
    ring: "stroke-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
    label: "Watch",
  },
  needs_attention: {
    ring: "stroke-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400",
    label: "Needs attention",
  },
};

const HealthScoreCard = ({
  dashboard,
  onRefresh,
}: {
  dashboard: BotSelfImprovementDashboard;
  onRefresh: () => void;
}) => {
  const score = dashboard.healthScore.score;
  const status = healthStatusStyles[dashboard.healthScore.status] || healthStatusStyles.watch;
  const trend = dashboard.healthScore.trend;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  const metrics = [
    { label: "Open Items", value: dashboard.summary.totalItems },
    { label: "High Priority", value: dashboard.summary.highPriority },
    { label: "Weak Answers", value: dashboard.summary.weakAnswers },
    { label: "Unanswered", value: dashboard.summary.unanswered },
    { label: "Grounding Risk", value: dashboard.summary.hallucinationRisk },
    { label: "Repeated Intents", value: dashboard.summary.repeatedIntents },
  ];

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <CardContent className="p-0">
        <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-stretch">
          {/* Score ring */}
          <div className="relative flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-purple-600/10 via-primary/5 to-cyan-500/10 p-8">
            <div className="relative h-36 w-36">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  strokeWidth="10"
                  className="stroke-muted"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className={`${status.ring} transition-all duration-700`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${status.text}`}>{score}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`capitalize ${status.badge}`}>
                {status.label}
              </Badge>
              {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
              {trend === "down" && <TrendingDown className="h-4 w-4 text-rose-500" />}
            </div>
            <p className="text-sm font-medium text-muted-foreground">Bot Health Score</p>
          </div>

          {/* Metrics */}
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Improvement Overview</h3>
                <p className="text-sm text-muted-foreground">
                  Sampled {dashboard.healthScore.sampleSize} interactions
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-border/60 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                >
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 text-2xl font-bold">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

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

const JudgeCatalogCard = ({
  entry,
  datasetLoading,
  judgeLoading,
  onCreateDataset,
  onGrade,
  onBuildAndGrade,
  onViewRun,
}: {
  entry: JudgeCatalogEntry;
  datasetLoading: boolean;
  judgeLoading: boolean;
  onCreateDataset: () => void;
  onGrade: () => void;
  onBuildAndGrade: () => void;
  onViewRun: (run: EvalRun) => void;
}) => {
  const Icon = entry.icon;
  const latestRun = entry.latestRun;
  const isBusy = datasetLoading || judgeLoading;

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-5 transition-colors hover:bg-muted/50 ${
        entry.kind === "custom"
          ? "border-dashed border-border/80 bg-muted/20"
          : "border-border/60 bg-muted/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            entry.kind === "custom"
              ? "bg-amber-500/10 text-amber-600"
              : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={polarityBadgeVariant[entry.polarity]} className="text-[10px] uppercase">
            {entry.polarity}
          </Badge>
          {!entry.isBuilt && (
            <Badge variant="outline" className="text-[10px]">
              Not built
            </Badge>
          )}
        </div>
      </div>
      <div className="flex-1 space-y-2">
        <p className="font-semibold text-sm">{entry.title}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">{entry.description}</p>
        <p className="text-xs text-muted-foreground">
          {entry.isBuilt
            ? `${entry.itemCount} examples · updated ${formatDateTime(entry.latestItemAt)}`
            : "No examples yet — create from production traces"}
        </p>
        {latestRun?.status === "completed" && (
          <div className="rounded-lg border bg-background/60 p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Last grade</span>
              <span className="font-semibold">{formatPercent(latestRun.overallScore)}</span>
            </div>
            {typeof latestRun.passRate === "number" && (
              <p className="text-muted-foreground mt-1">
                {Math.round(latestRun.passRate * 100)}% pass · {latestRun.passedCount} passed ·{" "}
                {latestRun.failedCount} failed
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {!entry.isBuilt ? (
          <>
            <Button size="sm" variant="outline" disabled={isBusy} onClick={onCreateDataset}>
              <Database className="w-4 h-4 mr-2" />
              {datasetLoading ? "Creating..." : "Create dataset"}
            </Button>
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90"
              disabled={isBusy}
              onClick={onBuildAndGrade}
            >
              <Gavel className="w-4 h-4 mr-2" />
              {judgeLoading ? "Working..." : "Build & grade"}
            </Button>
          </>
        ) : (
          <div className="flex gap-2">
            {latestRun && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onViewRun(latestRun)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90"
              disabled={isBusy}
              onClick={onGrade}
            >
              <Gavel className="w-4 h-4 mr-2" />
              {judgeLoading ? "Grading..." : "Grade"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const CustomEvalTypeDialog = ({
  open,
  onOpenChange,
  form,
  onFormChange,
  saving,
  onSubmit,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: {
    name: string;
    description: string;
    polarity: EvalDatasetPolarity;
    traceSource: EvalTraceSource;
    confidenceMin: string;
    confidenceMax: string;
    hallucinationRiskMax: string;
    groundednessScoreMin: string;
    usedFallback: "any" | "true" | "false";
    sources: string;
    latencyMsMin: string;
    userRatingMin: string;
    handoffStatus: string;
  };
  onFormChange: Dispatch<SetStateAction<typeof form>>;
  saving: boolean;
  onSubmit: () => void;
  onReset: () => void;
}) => (
  <Dialog
    open={open}
    onOpenChange={(nextOpen) => {
      onOpenChange(nextOpen);
      if (!nextOpen) onReset();
    }}
  >
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create custom eval type</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="custom-type-name">Name</Label>
          <Input
            id="custom-type-name"
            placeholder="e.g. Unanswered pricing questions"
            value={form.name}
            onChange={(e) => onFormChange((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="custom-type-description">Description</Label>
          <Textarea
            id="custom-type-description"
            placeholder="What traces should this eval type capture?"
            value={form.description}
            onChange={(e) => onFormChange((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Polarity</Label>
            <Select
              value={form.polarity}
              onValueChange={(value: EvalDatasetPolarity) =>
                onFormChange((prev) => ({ ...prev, polarity: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="negative">Negative (regression)</SelectItem>
                <SelectItem value="positive">Positive (gold standard)</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Trace source</Label>
            <Select
              value={form.traceSource}
              onValueChange={(value: EvalTraceSource) =>
                onFormChange((prev) => ({ ...prev, traceSource: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interaction_metrics">Bot interactions</SelectItem>
                <SelectItem value="handoff_sessions">Handoff sessions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {form.traceSource === "interaction_metrics" ? (
          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Trace filters
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min confidence (0–1)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={form.confidenceMin}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, confidenceMin: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max confidence (0–1)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={form.confidenceMax}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, confidenceMax: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max hallucination risk</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={form.hallucinationRiskMax}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, hallucinationRiskMax: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Min groundedness</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={form.groundednessScoreMin}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, groundednessScoreMin: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Used fallback</Label>
                <Select
                  value={form.usedFallback}
                  onValueChange={(value: "any" | "true" | "false") =>
                    onFormChange((prev) => ({ ...prev, usedFallback: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="true">Yes only</SelectItem>
                    <SelectItem value="false">No only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Min latency (ms)</Label>
                <Input
                  type="number"
                  value={form.latencyMsMin}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, latencyMsMin: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Answer sources (comma-separated)</Label>
              <Input
                placeholder="qa, llm, dataset, none"
                value={form.sources}
                onChange={(e) => onFormChange((prev) => ({ ...prev, sources: e.target.value }))}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Handoff filters
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min user rating (1–5)</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={form.userRatingMin}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, userRatingMin: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Statuses (comma-separated)</Label>
                <Input
                  placeholder="resolved, active"
                  value={form.handoffStatus}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, handoffStatus: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onReset();
            }}
          >
            Cancel
          </Button>
          <Button disabled={saving} onClick={onSubmit}>
            {saving ? "Creating..." : "Create type"}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

const JudgeRunHistoryPanel = ({
  runs,
  totalRuns,
  filteredCount,
  page,
  totalPages,
  pageSize,
  filters,
  datasetOptions,
  onFiltersChange,
  onPageChange,
  onViewRun,
}: {
  runs: EvalRun[];
  totalRuns: number;
  filteredCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  filters: {
    datasetName: string;
    status: JudgeHistoryStatusFilter;
    polarity: JudgeHistoryPolarityFilter;
    evalMode: JudgeHistoryEvalModeFilter;
  };
  datasetOptions: string[];
  onFiltersChange: (filters: {
    datasetName: string;
    status: JudgeHistoryStatusFilter;
    polarity: JudgeHistoryPolarityFilter;
    evalMode: JudgeHistoryEvalModeFilter;
  }) => void;
  onPageChange: (page: number) => void;
  onViewRun: (run: EvalRun) => void;
}) => {
  const visiblePages = getVisiblePages(page, totalPages);
  const showingFrom = filteredCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, filteredCount);
  const hasActiveFilters =
    filters.datasetName !== "all" ||
    filters.status !== "all" ||
    filters.polarity !== "all" ||
    filters.evalMode !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Judge run history</h3>
          <span className="text-xs text-muted-foreground">
            {filteredCount} of {totalRuns} runs
          </span>
        </div>
        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              onFiltersChange({
                datasetName: "all",
                status: "all",
                polarity: "all",
                evalMode: "all",
              })
            }
          >
            Clear filters
          </Button>
        )}
      </div>

      <Card className="border-border/60">
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Dataset</Label>
              <Select
                value={filters.datasetName}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, datasetName: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All datasets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All datasets</SelectItem>
                  {datasetOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value: JudgeHistoryStatusFilter) =>
                  onFiltersChange({ ...filters, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Polarity</Label>
              <Select
                value={filters.polarity}
                onValueChange={(value: JudgeHistoryPolarityFilter) =>
                  onFiltersChange({ ...filters, polarity: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All polarities</SelectItem>
                  <SelectItem value="negative">Negative (regression)</SelectItem>
                  <SelectItem value="positive">Positive (gold standard)</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Eval mode</Label>
              <Select
                value={filters.evalMode}
                onValueChange={(value: JudgeHistoryEvalModeFilter) =>
                  onFiltersChange({ ...filters, evalMode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modes</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="regression">Regression</SelectItem>
                  <SelectItem value="gold_standard">Gold standard</SelectItem>
                  <SelectItem value="custom">Custom criteria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {runs.length > 0 ? (
            <div className="space-y-3">
              {runs.map((run) => (
                <JudgeRunCard key={run._id} run={run} onView={() => onViewRun(run)} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-10 text-center">
              <History className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No runs match these filters</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try clearing filters or selecting a different dataset or status.
              </p>
            </div>
          )}

          {filteredCount > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Showing {showingFrom}–{showingTo} of {filteredCount} runs
              </p>
              {totalPages > 1 && (
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        className={
                          page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          if (page > 1) onPageChange(page - 1);
                        }}
                      />
                    </PaginationItem>
                    {visiblePages.map((pageNumber, index) =>
                      pageNumber === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#"
                            isActive={page === pageNumber}
                            className="cursor-pointer"
                            onClick={(event) => {
                              event.preventDefault();
                              onPageChange(pageNumber);
                            }}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        className={
                          page >= totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          if (page < totalPages) onPageChange(page + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const JudgeRunCard = ({
  run,
  onView,
}: {
  run: EvalRun;
  onView: () => void;
}) => {
  const statusColor =
    run.status === "completed"
      ? "text-emerald-600"
      : run.status === "failed"
        ? "text-destructive"
        : "text-amber-600";

  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-purple-600/5 via-primary/5 to-cyan-500/5 p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{run.datasetName}</p>
            <Badge variant="outline" className={`text-[10px] capitalize ${statusColor}`}>
              {run.status}
            </Badge>
            {run.polarity && (
              <Badge variant={polarityBadgeVariant[run.polarity]} className="text-[10px] uppercase">
                {run.polarity}
              </Badge>
            )}
            {run.evalMode && (
              <Badge variant="secondary" className="text-[10px]">
                {run.evalMode.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {run.itemCount || run.explanations?.length || 0} items ·{" "}
            {formatDateTime(run.completedAt || run.createdAt)} · {run.judgeModel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {run.status === "completed" && (
            <div className="text-right">
              <p className="text-lg font-bold">{formatPercent(run.overallScore)}</p>
              {typeof run.passRate === "number" && (
                <p className="text-xs text-muted-foreground">
                  {Math.round(run.passRate * 100)}% pass
                </p>
              )}
            </div>
          )}
          <Button size="sm" variant="outline" onClick={onView}>
            <Eye className="w-4 h-4 mr-1" />
            Details
          </Button>
        </div>
      </div>
      {run.status === "failed" && run.error && (
        <p className="text-sm text-destructive mt-2">{run.error}</p>
      )}
    </div>
  );
};

const JudgeRunDetail = ({ run }: { run: EvalRun }) => (
  <div className="space-y-5">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Overall score</p>
        <p className="text-xl font-bold">{formatPercent(run.overallScore)}</p>
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Pass rate</p>
        <p className="text-xl font-bold">
          {typeof run.passRate === "number" ? `${Math.round(run.passRate * 100)}%` : "N/A"}
        </p>
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Passed</p>
        <p className="text-xl font-bold text-emerald-600">{run.passedCount ?? 0}</p>
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Failed</p>
        <p className="text-xl font-bold text-destructive">{run.failedCount ?? 0}</p>
      </div>
    </div>

    {run.criteria && (
      <div className="space-y-2">
        <p className="text-sm font-medium">Criteria breakdown</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(run.criteria).map(([key, value]) => (
            <Score
              key={key}
              label={judgeCriteriaLabels[key] || key.replace(/([A-Z])/g, " $1")}
              value={value}
            />
          ))}
        </div>
      </div>
    )}

    <div className="space-y-3">
      <p className="text-sm font-medium">Per-item verdicts</p>
      {(run.explanations || []).map((item, index) => (
        <div key={`${item.itemId}-${index}`} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{item.question}</p>
              {item.sourceType && (
                <p className="text-xs text-muted-foreground mt-1">
                  Source: {item.sourceType.replace(/_/g, " ")}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant={
                  item.verdict === "pass"
                    ? "default"
                    : item.verdict === "fail"
                      ? "destructive"
                      : "secondary"
                }
              >
                {item.verdict || "review"}
              </Badge>
              <span className="text-sm font-semibold">
                {formatPercent(item.overallItemScore ?? null)}
              </span>
            </div>
          </div>
          {item.scores && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(item.scores).map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-[10px]">
                  {judgeCriteriaLabels[key] || key}: {formatPercent(value)}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">{item.explanation}</p>
        </div>
      ))}
    </div>
  </div>
);

export default BotSelfImprovement;
