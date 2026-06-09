import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
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
  ChevronDown,
  ExternalLink,
  Search,
  ListFilter,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  applyBotImprovementAction,
  askBotSelfIntrospection,
  getBotSelfIntrospectionHistory,
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
  type BotSelfIntrospectionRun,
  type BotSelfIntrospectionEvidence,
  type TestCase,
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
const INTROSPECTION_HISTORY_PAGE_SIZE = 5;

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

const selfImprovementNavItems: Array<{
  value: string;
  label: string;
  icon: typeof BrainCircuit;
  description: string;
}> = [
  {
    value: "improvements",
    label: "Improvements",
    icon: BrainCircuit,
    description:
      "Review and act on prioritized production issues — weak answers, unanswered questions, low confidence, and grounding risks.",
  },
  {
    value: "introspection",
    label: "Ask Phoenix",
    icon: Activity,
    description:
      "Ask natural-language questions about failures and trace evidence from Phoenix, eval runs, and experiments.",
  },
  {
    value: "eval-datasets",
    label: "Eval Datasets",
    icon: FileStack,
    description:
      "Build regression and gold-standard datasets from production traces — capture failures to fix and successes to preserve.",
  },
  {
    value: "llm-judge",
    label: "LLM as Judge",
    icon: Gavel,
    description:
      "Grade datasets with polarity-aware LLM scoring, configurable criteria, pass thresholds, and per-item verdicts.",
  },
  {
    value: "regression-tests",
    label: "Regression Tests",
    icon: TestTubes,
    description:
      "Capture production failures as reusable test cases and re-run them after every bot or prompt change.",
  },
  {
    value: "autopilot",
    label: "Autopilot",
    icon: Rocket,
    description:
      "Schedule AI-generated improvement recommendations from traces, evals, handoffs, and experiments.",
  },
  {
    value: "monitoring",
    label: "Monitoring",
    icon: ShieldAlert,
    description:
      "Set threshold alerts on confidence, latency, handoffs, and intent clusters — with email or Slack delivery.",
  },
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
  const [judgeDatasetTab, setJudgeDatasetTab] = useState("negative");
  const [judgeLoading, setJudgeLoading] = useState<string | null>(null);
  const [judgeEvalMode, setJudgeEvalMode] = useState<JudgeEvalMode>("standard");
  const [judgePassThreshold, setJudgePassThreshold] = useState(0.7);
  const [judgeSelectedCriteria, setJudgeSelectedCriteria] = useState<string[]>([]);
  const [selectedJudgeRun, setSelectedJudgeRun] = useState<EvalRun | null>(null);
  const [judgeRunModalOpen, setJudgeRunModalOpen] = useState(false);
  const [judgeConfigOpen, setJudgeConfigOpen] = useState(false);
  const [judgeHistoryPage, setJudgeHistoryPage] = useState(1);
  const [judgeHistoryFilters, setJudgeHistoryFilters] = useState({
    datasetName: "all",
    status: "all" as JudgeHistoryStatusFilter,
    polarity: "all" as JudgeHistoryPolarityFilter,
    evalMode: "all" as JudgeHistoryEvalModeFilter,
  });
  const [dashboard, setDashboard] = useState<BotSelfImprovementDashboard | null>(null);
  const [evalData, setEvalData] = useState<BotEvalDatasetsResponse | null>(null);
  const [activeSection, setActiveSection] = useState("improvements");
  const [filter, setFilter] = useState<ImprovementItem["type"] | "all">("all");
  const [improvementDetailOpen, setImprovementDetailOpen] = useState(false);
  const [selectedImprovement, setSelectedImprovement] = useState<ImprovementItem | null>(null);
  const [introspectionQuestion, setIntrospectionQuestion] = useState(defaultIntrospectionQuestions[0]);
  const [introspectionLoading, setIntrospectionLoading] = useState(false);
  const [introspectionResult, setIntrospectionResult] = useState<BotSelfIntrospectionResponse | null>(null);
  const [introspectionHistory, setIntrospectionHistory] = useState<BotSelfIntrospectionRun[]>([]);
  const [introspectionHistoryPage, setIntrospectionHistoryPage] = useState(1);
  const [introspectionHistorySearch, setIntrospectionHistorySearch] = useState("");
  const [introspectionHistoryTotal, setIntrospectionHistoryTotal] = useState(0);
  const [introspectionHistoryTotalPages, setIntrospectionHistoryTotalPages] = useState(1);
  const [introspectionHistoryLoading, setIntrospectionHistoryLoading] = useState(false);
  const [introspectionDetailOpen, setIntrospectionDetailOpen] = useState(false);
  const [selectedIntrospectionRun, setSelectedIntrospectionRun] =
    useState<BotSelfIntrospectionRun | null>(null);

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
  const [regressionCreateOpen, setRegressionCreateOpen] = useState(false);
  const [regressionCreateForm, setRegressionCreateForm] = useState({
    name: "",
    description: "",
  });

  const fetchDashboard = async (options?: { silent?: boolean }) => {
    if (!botId) return null;

    try {
      if (!options?.silent) setLoading(true);
      const response = await getBotSelfImprovementDashboard(botId);
      setDashboard(response.result || null);
      return response.result || null;
    } catch (error) {
      toast({
        title: "Unable to load self-improvement dashboard",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      if (!options?.silent) setLoading(false);
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
      const response = await createRegressionTests(botId, {
        name: regressionCreateForm.name.trim() || undefined,
        description: regressionCreateForm.description.trim() || undefined,
      });
      const suite = response.result as BotRegressionTest | undefined;
      toast({
        title: "Regression suite created",
        description: suite
          ? `${suite.name} — ${suite.testCases?.length || suite.statistics?.totalTests || 0} test cases from production traces.`
          : "Tests created from production conversations.",
      });
      setRegressionCreateOpen(false);
      setRegressionCreateForm({ name: "", description: "" });
      await fetchRegressionTests();
    } catch (error) {
      toast({
        title: "Failed to create regression suite",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegressionLoading(false);
    }
  };

  const regressionSummary = useMemo(() => {
    const totalSuites = regressionTests.length;
    const totalCases = regressionTests.reduce(
      (sum, suite) => sum + (suite.testCases?.length || suite.statistics?.totalTests || 0),
      0
    );
    const suitesWithRuns = regressionTests.filter((suite) => suite.lastRunAt).length;
    const avgPassRate =
      regressionTests.length > 0
        ? regressionTests.reduce((sum, suite) => {
            const total = suite.statistics?.totalTests || 0;
            const passed = suite.statistics?.passedTests || 0;
            return sum + (total > 0 ? passed / total : 0);
          }, 0) / regressionTests.length
        : null;

    return { totalSuites, totalCases, suitesWithRuns, avgPassRate };
  }, [regressionTests]);

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
      } else {
        toast({
          title: "Regression run completed",
          description: response.result?.summary?.message || "Test run finished.",
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

  const fetchIntrospectionHistory = async (page = introspectionHistoryPage) => {
    if (!botId) return;

    try {
      setIntrospectionHistoryLoading(true);
      const response = await getBotSelfIntrospectionHistory(botId, {
        page,
        pageSize: INTROSPECTION_HISTORY_PAGE_SIZE,
        search: introspectionHistorySearch,
      });
      setIntrospectionHistory(response.result?.runs || []);
      setIntrospectionHistoryTotal(response.result?.pagination?.total || 0);
      setIntrospectionHistoryTotalPages(response.result?.pagination?.totalPages || 1);
    } catch {
      setIntrospectionHistory([]);
      setIntrospectionHistoryTotal(0);
      setIntrospectionHistoryTotalPages(1);
    } finally {
      setIntrospectionHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchEvalData().catch(() => null);
    fetchRegressionTests().catch(() => null);
  }, [botId]);

  useEffect(() => {
    setIntrospectionHistoryPage(1);
  }, [introspectionHistorySearch, botId]);

  useEffect(() => {
    fetchIntrospectionHistory(introspectionHistoryPage).catch(() => null);
  }, [botId, introspectionHistoryPage, introspectionHistorySearch]);

  const filteredItems = useMemo(() => {
    const items = dashboard?.items || [];
    return filter === "all" ? items : items.filter((item) => item.type === filter);
  }, [dashboard?.items, filter]);

  const improvementTypeCounts = useMemo(() => {
    const items = dashboard?.items || [];
    const counts: Record<string, number> = { all: items.length };
    for (const item of items) {
      counts[item.type] = (counts[item.type] || 0) + 1;
    }
    return counts;
  }, [dashboard?.items]);

  const openImprovementDetail = (item: ImprovementItem) => {
    setSelectedImprovement(item);
    setImprovementDetailOpen(true);
  };

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

      const updatedDashboard = await fetchDashboard({ silent: true });
      if (selectedImprovement?.key === item.key) {
        const updatedItem = updatedDashboard?.items?.find(
          (dashboardItem) => dashboardItem.key === item.key
        );
        if (updatedItem) setSelectedImprovement(updatedItem);
      }
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

  const activeIntrospectionEvidence = useMemo((): BotSelfIntrospectionEvidence | null => {
    if (selectedIntrospectionRun?.evidence) return selectedIntrospectionRun.evidence;
    if (introspectionResult?.evidence) return introspectionResult.evidence;
    return null;
  }, [selectedIntrospectionRun, introspectionResult]);

  const activeIntrospectionAnswer = selectedIntrospectionRun || introspectionResult;

  const introspectionSummary = useMemo(() => {
    const evidence = activeIntrospectionEvidence;
    return {
      totalAsks: introspectionHistoryTotal,
      linkedTraces: evidence?.phoenix?.linkedTraceCount ?? 0,
      sampled: evidence?.metrics?.sampledInteractions ?? 0,
      lowConfidence: evidence?.metrics?.lowConfidenceCount ?? 0,
      unanswered: evidence?.metrics?.unansweredCount ?? 0,
    };
  }, [activeIntrospectionEvidence, introspectionHistoryTotal]);

  const activeNavItem = useMemo(
    () =>
      selfImprovementNavItems.find((item) => item.value === activeSection) ||
      selfImprovementNavItems[0],
    [activeSection]
  );

  const selectIntrospectionRun = (run: BotSelfIntrospectionRun) => {
    setSelectedIntrospectionRun(run);
  };

  const openIntrospectionRun = (run: BotSelfIntrospectionRun) => {
    setSelectedIntrospectionRun(run);
    setIntrospectionDetailOpen(true);
  };

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
      setSelectedIntrospectionRun(null);
      setIntrospectionHistoryPage(1);
      await fetchIntrospectionHistory(1);
      toast({
        title: "Phoenix introspection complete",
        description: "Answer generated from recent traces and eval evidence.",
      });
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

  const ActiveNavIcon = activeNavItem.icon;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar pageTitle={`Improve - ${dashboard.bot.name}`} />

      <Tabs
        value={activeSection}
        onValueChange={setActiveSection}
        orientation="vertical"
        className="flex-1 min-h-0 flex flex-col md:flex-row"
      >
        <TabsList className="h-auto w-full md:w-72 md:h-full md:min-h-0 md:flex-col md:items-stretch md:justify-between rounded-none p-3 gap-0 border-b md:border-b-0 md:border-r border-border/60 bg-muted/30 shrink-0">
          <div className="flex w-full flex-wrap gap-1 md:flex-col md:flex-1 md:min-h-0 md:overflow-y-auto">
            {selfImprovementNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="w-full justify-start gap-2 text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </TabsTrigger>
              );
            })}
          </div>

          <div className="hidden md:block w-full mt-4 pt-4 border-t border-border/50 shrink-0">
            <div className="flex items-start gap-2.5 px-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600/15 to-cyan-500/15">
                <ActiveNavIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold">{activeNavItem.label}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                  {activeNavItem.description}
                </p>
              </div>
            </div>
          </div>
        </TabsList>

        <div className="flex-1 min-w-0 overflow-y-auto px-4 py-6 md:px-8 lg:px-10 space-y-6">
          {/* Phoenix Self-Introspection Tab */}
          <TabsContent value="introspection" className="mt-0 space-y-6">
            <SectionHeader
              icon={Activity}
              title="Ask Phoenix"
              description="Inspect recent Phoenix-linked traces, eval runs, and experiments to understand what the bot is failing at."
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Total asks" value={introspectionSummary.totalAsks} />
              <Metric label="Linked traces" value={introspectionSummary.linkedTraces} />
              <Metric label="Low confidence" value={introspectionSummary.lowConfidence} />
              <Metric label="Unanswered" value={introspectionSummary.unanswered} />
            </div>

            <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-purple-600/5 via-primary/5 to-cyan-500/5">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Ask Phoenix
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pick a quick prompt or type your own question.
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {defaultIntrospectionQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      disabled={introspectionLoading}
                      onClick={() => askIntrospectionTool(question)}
                      className="rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-left hover:bg-muted/60 hover:border-primary/30 transition-colors disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col md:flex-row gap-3 md:items-end">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="introspection-question">Your question</Label>
                    <Textarea
                      id="introspection-question"
                      value={introspectionQuestion}
                      onChange={(event) => setIntrospectionQuestion(event.target.value)}
                      placeholder="Ask about failures, training gaps, eval regressions, or Phoenix traces..."
                      className="min-h-[72px] md:min-h-[52px] rounded-xl border-border/60 resize-none"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                          event.preventDefault();
                          askIntrospectionTool();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => askIntrospectionTool()}
                    disabled={introspectionLoading}
                    className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90 md:shrink-0"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {introspectionLoading ? "Inspecting..." : "Ask"}
                  </Button>
                </div>
              </div>
            </div>

            {activeIntrospectionAnswer ? (
              <IntrospectionResultPanel
                key={
                  selectedIntrospectionRun?._id ||
                  introspectionResult?._id ||
                  activeIntrospectionAnswer.question
                }
                answer={activeIntrospectionAnswer}
                evidence={activeIntrospectionEvidence}
                run={selectedIntrospectionRun}
                isFromHistory={Boolean(selectedIntrospectionRun)}
                onViewDetails={
                  selectedIntrospectionRun
                    ? () => openIntrospectionRun(selectedIntrospectionRun)
                    : undefined
                }
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 py-8 text-center">
                <Activity className="w-9 h-9 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">No result yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ask a question above or select a run from history below.
                </p>
              </div>
            )}

            <IntrospectionHistoryPanel
              runs={introspectionHistory}
              totalRuns={introspectionHistoryTotal}
              page={introspectionHistoryPage}
              totalPages={introspectionHistoryTotalPages}
              pageSize={INTROSPECTION_HISTORY_PAGE_SIZE}
              search={introspectionHistorySearch}
              loading={introspectionHistoryLoading}
              selectedRunId={selectedIntrospectionRun?._id || introspectionResult?._id || null}
              onSearchChange={setIntrospectionHistorySearch}
              onPageChange={setIntrospectionHistoryPage}
              onSelectRun={selectIntrospectionRun}
              onViewRun={openIntrospectionRun}
            />

            <Dialog open={introspectionDetailOpen} onOpenChange={setIntrospectionDetailOpen}>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Introspection details</DialogTitle>
                </DialogHeader>
                {selectedIntrospectionRun && (
                  <IntrospectionRunDetail run={selectedIntrospectionRun} />
                )}
              </DialogContent>
            </Dialog>
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
              <Metric
                label="Avg score"
                value={formatPercent(judgeSummary?.averageOverallScore)}
              />
            </div>

            <Collapsible open={judgeConfigOpen} onOpenChange={setJudgeConfigOpen}>
              <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <Scale className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Judge configuration</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {judgeConfig?.evalModes.find((mode) => mode.key === judgeEvalMode)
                            ?.label || "Standard"}{" "}
                          · {Math.round(judgePassThreshold * 100)}% pass threshold
                          {judgeEvalMode === "custom" &&
                            judgeSelectedCriteria.length > 0 &&
                            ` · ${judgeSelectedCriteria.length} criteria`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!judgeConfigOpen && (
                        <Badge variant="outline" className="text-[10px] uppercase hidden sm:inline-flex">
                          {judgeEvalMode.replace(/_/g, " ")}
                        </Badge>
                      )}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          judgeConfigOpen && "rotate-180"
                        )}
                      />
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-5 pb-5 pt-4 space-y-5 border-t border-border/40 bg-muted/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 rounded-lg border border-border/50 bg-background/80 p-4">
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
                      <div className="space-y-3 rounded-lg border border-border/50 bg-background/80 p-4">
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
                      <div className="rounded-lg border border-border/50 bg-background/80 p-4 space-y-3">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Select criteria to grade
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {allCriteria.map((criterion) => (
                            <label
                              key={criterion.key}
                              className="flex items-start gap-3 rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
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

                    <div className="rounded-lg border border-border/50 bg-background/80 p-4">
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
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            <Tabs value={judgeDatasetTab} onValueChange={setJudgeDatasetTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
                <TabsTrigger value="negative" className="gap-1.5">
                  <ThumbsDown className="h-4 w-4" />
                  Regression
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
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    All built-in negative eval types
                  </span>
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
              </TabsContent>

              <TabsContent value="positive" className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    All built-in positive eval types
                  </span>
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
              </TabsContent>

              <TabsContent value="custom" className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    User-defined trace filters — fetched from your bot
                  </span>
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
              </TabsContent>
            </Tabs>

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
          <TabsContent value="regression-tests" className="mt-0 space-y-6">
            <SectionHeader
              icon={TestTubes}
              title="Regression Tests"
              description="Capture weak answers, handoffs, and negative feedback from production traces — then re-run them after every bot change."
              action={
                <Button
                  className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90"
                  onClick={() => setRegressionCreateOpen(true)}
                  disabled={regressionLoading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {regressionLoading ? "Creating..." : "Create suite"}
                </Button>
              }
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Suites" value={regressionSummary.totalSuites} />
              <Metric label="Test cases" value={regressionSummary.totalCases} />
              <Metric label="Suites run" value={regressionSummary.suitesWithRuns} />
              <Metric
                label="Avg pass rate"
                value={
                  regressionSummary.avgPassRate === null
                    ? "N/A"
                    : formatPercent(regressionSummary.avgPassRate)
                }
              />
            </div>

            {regressionTests.length === 0 ? (
              <Card className="border-dashed border-border/60">
                <CardContent className="py-10 text-center">
                  <TestTubes className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="font-semibold">No regression suites yet</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
                    Create a suite from recent production traces — low-confidence answers, handoffs,
                    and negative feedback — then re-run it after prompt or training updates.
                  </p>
                  <Button
                    className="mt-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90"
                    onClick={() => setRegressionCreateOpen(true)}
                    disabled={regressionLoading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first suite
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {regressionTests.map((testSuite) => (
                  <RegressionTestCard
                    key={testSuite._id}
                    testSuite={testSuite}
                    onRun={() => runTest(testSuite._id)}
                    isRunning={testRunning === testSuite._id}
                    onView={() => setSelectedTest(testSuite)}
                  />
                ))}
              </div>
            )}

            <Dialog open={!!selectedTest} onOpenChange={(open) => !open && setSelectedTest(null)}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedTest?.name || "Regression suite"}</DialogTitle>
                </DialogHeader>
                {selectedTest && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{selectedTest.description}</p>
                    {(selectedTest.testCases || []).map((testCase, index) => (
                      <div key={`${testCase.questionId}-${index}`} className="rounded-lg border border-border/60 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{testCase.question}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {regressionSourceLabels[testCase.source] || testCase.source}
                          </Badge>
                        </div>
                        {testCase.expectedAnswer && (
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            Expected: {testCase.expectedAnswer}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {testResults && (
              <Dialog open={resultsModalOpen} onOpenChange={setResultsModalOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Regression Test Results</DialogTitle>
                  </DialogHeader>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Metric label="Total tests" value={testResults.statistics.totalTests} />
                    <Metric label="Passed" value={testResults.statistics.passedTests} />
                    <Metric label="Failed" value={testResults.statistics.failedTests} />
                    <Metric
                      label="Pass rate"
                      value={formatPercent(
                        testResults.statistics.totalTests > 0
                          ? testResults.statistics.passedTests /
                              testResults.statistics.totalTests
                          : 0
                      )}
                    />
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Improvement inbox</span>
                <span className="text-xs text-muted-foreground">
                  {filteredItems.length} of {dashboard?.items?.length || 0} items
                </span>
              </div>
              <div className="flex items-center gap-2 sm:w-72">
                <ListFilter className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select
                  value={filter}
                  onValueChange={(value) => setFilter(value as typeof filter)}
                >
                  <SelectTrigger className="bg-background/80 border-border/60">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All types ({improvementTypeCounts.all || 0})
                    </SelectItem>
                    {(Object.keys(typeLabels) as Array<ImprovementItem["type"]>).map(
                      (itemType) => (
                        <SelectItem key={itemType} value={itemType}>
                          {typeLabels[itemType]} ({improvementTypeCounts[itemType] || 0})
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredItems.map((item) => (
                  <ImprovementCard
                    key={item.key}
                    item={item}
                    onView={() => openImprovementDetail(item)}
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

      <RegressionCreateDialog
        open={regressionCreateOpen}
        onOpenChange={setRegressionCreateOpen}
        form={regressionCreateForm}
        onFormChange={setRegressionCreateForm}
        saving={regressionLoading}
        botName={dashboard?.bot?.name}
        onSubmit={createRegressionTestSuite}
        onReset={() => setRegressionCreateForm({ name: "", description: "" })}
      />

      <CustomEvalTypeDialog
        open={customTypeDialogOpen}
        onOpenChange={setCustomTypeDialogOpen}
        form={customTypeForm}
        onFormChange={setCustomTypeForm}
        saving={customTypeSaving}
        onSubmit={createCustomDatasetType}
        onReset={resetCustomTypeForm}
      />

      <Dialog open={improvementDetailOpen} onOpenChange={setImprovementDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Improvement details</DialogTitle>
          </DialogHeader>
          {selectedImprovement && (
            <ImprovementDetail
              item={selectedImprovement}
              onAction={applyAction}
              actionLoading={actionLoading}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const regressionSourceLabels: Record<TestCase["source"], string> = {
  low_confidence: "Low confidence",
  handoff: "Handoff",
  negative_feedback: "Negative feedback",
  manual: "Manual",
};

const RegressionTestCard = ({
  testSuite,
  onRun,
  isRunning,
  onView,
}: {
  testSuite: BotRegressionTest;
  onRun: () => void;
  isRunning: boolean;
  onView: () => void;
}) => {
  const passRate =
    testSuite.statistics.totalTests > 0
      ? testSuite.statistics.passedTests / testSuite.statistics.totalTests
      : 0;
  const sourceCounts = (testSuite.testCases || []).reduce<Record<string, number>>(
    (acc, testCase) => {
      acc[testCase.source] = (acc[testCase.source] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-5 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <TestTubes className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={testSuite.status === "active" ? "default" : "secondary"} className="text-[10px] uppercase">
            {testSuite.status}
          </Badge>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        <p className="font-semibold text-sm">{testSuite.name}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {testSuite.description || "Regression coverage from production traces."}
        </p>
        <p className="text-xs text-muted-foreground">
          {testSuite.testCases?.length || testSuite.statistics.totalTests} cases
          {testSuite.lastRunAt
            ? ` · last run ${formatDateTime(testSuite.lastRunAt)}`
            : " · not run yet"}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {Object.entries(sourceCounts).map(([source, count]) => (
            <Badge key={source} variant="outline" className="text-[10px]">
              {regressionSourceLabels[source as TestCase["source"]] || source} · {count}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border border-border/60 bg-background/80 p-2">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="text-lg font-bold">{testSuite.statistics.totalTests}</p>
          </div>
          <div className="rounded-lg border border-green-500/40 bg-green-50/40 dark:bg-green-950/20 p-2">
            <p className="text-[10px] text-muted-foreground">Passed</p>
            <p className="text-lg font-bold text-green-600">{testSuite.statistics.passedTests}</p>
          </div>
          <div className="rounded-lg border border-red-500/40 bg-red-50/40 dark:bg-red-950/20 p-2">
            <p className="text-[10px] text-muted-foreground">Failed</p>
            <p className="text-lg font-bold text-red-600">{testSuite.statistics.failedTests}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/80 p-2">
            <p className="text-[10px] text-muted-foreground">Pass rate</p>
            <p className="text-lg font-bold">{formatPercent(passRate)}</p>
          </div>
        </div>

        {(testSuite.statistics.improvements > 0 || testSuite.statistics.regressions > 0) && (
          <div className="rounded-lg border border-border/50 bg-background/70 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              {testSuite.statistics.improvements > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  {testSuite.statistics.improvements} improved
                </span>
              )}
              {testSuite.statistics.regressions > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <TrendingDown className="w-4 h-4" />
                  {testSuite.statistics.regressions} regressed
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={onView}>
          <Eye className="w-4 h-4 mr-2" />
          View cases
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90"
          onClick={onRun}
          disabled={isRunning}
        >
          <Play className="w-4 h-4 mr-2" />
          {isRunning ? "Running..." : "Run tests"}
        </Button>
      </div>
    </div>
  );
};

const RegressionCreateDialog = ({
  open,
  onOpenChange,
  form,
  onFormChange,
  saving,
  botName,
  onSubmit,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: { name: string; description: string };
  onFormChange: (form: { name: string; description: string }) => void;
  saving: boolean;
  botName?: string;
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
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Create regression suite</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          We&apos;ll pull recent production signals — low-confidence answers, handoffs, unanswered
          questions, and negative feedback — into a reusable test suite
          {botName ? ` for ${botName}` : ""}.
        </p>
        <div className="space-y-2">
          <Label htmlFor="regression-suite-name">Suite name</Label>
          <Input
            id="regression-suite-name"
            placeholder={
              botName
                ? `Production regression · ${botName}`
                : "Production regression suite"
            }
            value={form.name}
            onChange={(event) => onFormChange({ ...form, name: event.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to auto-name from your bot and today&apos;s date.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="regression-suite-description">Description (optional)</Label>
          <Textarea
            id="regression-suite-description"
            placeholder="e.g. Weekly prompt regression check"
            value={form.description}
            onChange={(event) =>
              onFormChange({ ...form, description: event.target.value })
            }
            className="min-h-20"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onReset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={saving}
            className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90"
            onClick={onSubmit}
          >
            {saving ? "Creating..." : "Create suite"}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

const Metric = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-lg border border-border/60 bg-background/80 p-3 shadow-sm">
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

const improvementPriorityStyles: Record<
  ImprovementItem["priority"],
  { badge: "destructive" | "secondary" | "outline"; border: string }
> = {
  high: { badge: "destructive", border: "border-destructive/30" },
  medium: { badge: "secondary", border: "border-amber-500/30" },
  low: { badge: "outline", border: "border-border/60" },
};

const ImprovementCard = ({
  item,
  onView,
}: {
  item: ImprovementItem;
  onView: () => void;
}) => {
  const priorityStyle = improvementPriorityStyles[item.priority];
  const hasPendingActions = item.actionState?.some((state) => state.status !== "completed");

  return (
    <button
      type="button"
      onClick={onView}
      className={cn(
        "w-full text-left rounded-xl border bg-gradient-to-br from-purple-600/5 via-primary/5 to-cyan-500/5 p-4 transition-all hover:border-primary/40 hover:shadow-sm",
        priorityStyle.border
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px]">
              {typeLabels[item.type]}
            </Badge>
            <Badge variant={priorityStyle.badge} className="text-[10px] capitalize">
              {item.priority}
            </Badge>
            {hasPendingActions && (
              <Badge variant="secondary" className="text-[10px]">
                In progress
              </Badge>
            )}
          </div>
          <p className="font-medium text-sm line-clamp-1">{item.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{item.question}</p>
        </div>
        {typeof item.confidence === "number" ? (
          <div className="text-right shrink-0">
            <p className="text-lg font-bold leading-none">{formatPercent(item.confidence)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">confidence</p>
          </div>
        ) : (
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold capitalize">{item.source}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">source</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
        <span className="text-[10px] text-muted-foreground">
          {formatDateTime(item.createdAt)}
        </span>
        <span className="text-xs text-primary font-medium inline-flex items-center gap-1">
          View details
          <Eye className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
};

const ImprovementDetail = ({
  item,
  onAction,
  actionLoading,
}: {
  item: ImprovementItem;
  onAction: (item: ImprovementItem, action: ImprovementAction) => void;
  actionLoading: string | null;
}) => (
  <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{typeLabels[item.type]}</Badge>
      <Badge
        variant={improvementPriorityStyles[item.priority].badge}
        className="capitalize"
      >
        {item.priority} priority
      </Badge>
      <Badge variant="outline" className="capitalize">
        {item.source}
      </Badge>
    </div>

    <div className="space-y-1">
      <h3 className="text-base font-semibold">{item.title}</h3>
      <p className="text-sm text-muted-foreground">{item.description}</p>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <Score label="Confidence" value={item.confidence} />
      <Score
        label="Grounding"
        value={item.hallucinationRisk === null ? null : 1 - item.hallucinationRisk}
      />
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Reported</p>
        <p className="text-sm font-semibold">{formatDateTime(item.createdAt)}</p>
      </div>
    </div>

    <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Question
      </p>
      <p className="text-sm">{item.question}</p>
    </div>

    {item.answer && (
      <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Answer
        </p>
        <p className="text-sm whitespace-pre-wrap">{item.answer}</p>
      </div>
    )}

    {item.actionState?.length > 0 && (
      <div className="space-y-2">
        <p className="text-sm font-medium">Action history</p>
        <div className="flex flex-wrap gap-2">
          {item.actionState.map((state) => (
            <Badge key={`${state.action}-${state.createdAt}`} variant="outline">
              {actionLabels[state.action]} · {state.status}
            </Badge>
          ))}
        </div>
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
  </div>
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

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl border border-border/50 bg-muted/30 p-4">
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
      </div>
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

const evidenceRecordString = (value: unknown) =>
  typeof value === "string" ? value : "";

const evidenceRecordNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const EvidenceCollapsibleSection = ({
  title,
  icon: Icon,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: typeof Activity;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) => (
  <Collapsible defaultOpen={defaultOpen}>
    <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-left hover:bg-muted/40 transition-colors [&[data-state=open]>svg.chevron]:rotate-180">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">{title}</span>
        {typeof count === "number" && count > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {count}
          </Badge>
        )}
      </div>
      <ChevronDown className="chevron h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
    </CollapsibleTrigger>
    <CollapsibleContent className="pt-3 space-y-2">{children}</CollapsibleContent>
  </Collapsible>
);

const IntrospectionEvidenceSections = ({
  evidence,
}: {
  evidence: BotSelfIntrospectionEvidence;
}) => {
  const phoenix = evidence.phoenix || {};
  const metrics = evidence.metrics || {
    sampledInteractions: 0,
    lowConfidenceCount: 0,
    unansweredCount: 0,
    fallbackRate: 0,
    averageConfidence: null,
    averageLatencyMs: null,
    sourceBreakdown: {},
    fallbackBreakdown: {},
  };
  const failureClusters = evidence.failureClusters || [];
  const lowConfidence = evidence.topLowConfidenceQuestions || [];
  const unanswered = evidence.topUnansweredQuestions || [];
  const handoffs = evidence.handoffs;
  const latestJudgeRun = evidence.latestJudgeRun as Record<string, unknown> | null;
  const bestExperiment = evidence.bestExperiment as Record<string, unknown> | null;
  const recentExperiments = evidence.recentExperiments || [];
  const issueCount =
    failureClusters.length + lowConfidence.length + unanswered.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant={phoenix.enabled ? "default" : "secondary"} className="text-[10px]">
            {phoenix.enabled ? "Phoenix connected" : "Phoenix offline"}
          </Badge>
          {phoenix.projectName && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {phoenix.projectName}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {phoenix.linkedTraceCount ?? 0} traces · {metrics.sampledInteractions} sampled ·{" "}
          {formatPercent(metrics.fallbackRate)} fallback
        </span>
        {metrics.averageConfidence !== null && (
          <span className="text-xs text-muted-foreground">
            Avg confidence {formatPercent(metrics.averageConfidence)}
          </span>
        )}
        {metrics.averageLatencyMs !== null && (
          <span className="text-xs text-muted-foreground">
            Avg latency {Math.round(metrics.averageLatencyMs)}ms
          </span>
        )}
        {phoenix.baseUrl && (
          <a
            href={phoenix.baseUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary inline-flex items-center gap-1 hover:underline ml-auto"
          >
            Open Phoenix
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {(Object.keys(metrics.sourceBreakdown || {}).length > 0 ||
        Object.keys(metrics.fallbackBreakdown || {}).length > 0) && (
        <EvidenceCollapsibleSection
          title="Source & fallback breakdown"
          icon={BarChart3}
          defaultOpen
        >
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(metrics.sourceBreakdown || {})
              .filter(([, count]) => count > 0)
              .map(([key, count]) => (
                <Badge key={`src-${key}`} variant="outline" className="text-xs capitalize">
                  {key.replace(/_/g, " ")} · {count}
                </Badge>
              ))}
            {Object.entries(metrics.fallbackBreakdown || {})
              .filter(([, count]) => count > 0)
              .map(([key, count]) => (
                <Badge key={`fb-${key}`} variant="outline" className="text-xs capitalize">
                  fallback {key.replace(/_/g, " ")} · {count}
                </Badge>
              ))}
          </div>
        </EvidenceCollapsibleSection>
      )}

      {issueCount > 0 && (
        <EvidenceCollapsibleSection
          title="Issues & failure clusters"
          icon={AlertTriangle}
          count={issueCount}
          defaultOpen
        >
          {failureClusters.map((cluster) => (
            <div
              key={cluster.intentKey}
              className="rounded-lg border border-border/50 bg-background/80 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm">{cluster.examples[0]?.question || cluster.intentKey}</p>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {cluster.count}×
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg confidence {formatPercent(cluster.avgConfidence)} · {cluster.fallbackCount}{" "}
                fallbacks
              </p>
            </div>
          ))}
          {lowConfidence.map((item, index) => {
            const question = evidenceRecordString(item.question);
            const traceUrl = evidenceRecordString(item.traceUrl);
            const confidence = evidenceRecordNumber(item.confidence);
            return (
              <div
                key={`low-${index}`}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm">{question}</p>
                  {confidence !== null && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Confidence {formatPercent(confidence)}
                    </p>
                  )}
                </div>
                {traceUrl && (
                  <a
                    href={traceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary inline-flex items-center gap-1 hover:underline shrink-0"
                  >
                    Trace
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
          {unanswered.map((item, index) => {
            const question = evidenceRecordString(item.question);
            const traceUrl = evidenceRecordString(item.traceUrl);
            return (
              <div
                key={`unanswered-${index}`}
                className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 flex items-start justify-between gap-3"
              >
                <p className="text-sm min-w-0">{question}</p>
                {traceUrl && (
                  <a
                    href={traceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary inline-flex items-center gap-1 hover:underline shrink-0"
                  >
                    Trace
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
        </EvidenceCollapsibleSection>
      )}

      {(phoenix.recentTraceUrls?.length || 0) > 0 && (
        <EvidenceCollapsibleSection
          title="Linked Phoenix traces"
          icon={Activity}
          count={phoenix.recentTraceUrls?.length}
        >
          {phoenix.recentTraceUrls!.map((trace) => (
            <div
              key={trace.traceId}
              className="rounded-lg border border-border/50 bg-background/80 px-3 py-2.5 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm">{trace.question || trace.traceId}</p>
                {typeof trace.confidence === "number" && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatPercent(trace.confidence)}
                  </p>
                )}
              </div>
              {trace.traceUrl && (
                <a
                  href={trace.traceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline shrink-0"
                >
                  View
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </EvidenceCollapsibleSection>
      )}

      {handoffs && handoffs.sampled > 0 && (
        <EvidenceCollapsibleSection title="Handoffs" icon={LifeBuoy} count={handoffs.sampled}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-xs text-muted-foreground">Sampled</p>
              <p className="text-lg font-bold">{handoffs.sampled}</p>
            </div>
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-xs text-muted-foreground">Unresolved</p>
              <p className="text-lg font-bold text-amber-600">{handoffs.unresolved}</p>
            </div>
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-xs text-muted-foreground">Escalated</p>
              <p className="text-lg font-bold text-destructive">{handoffs.escalated}</p>
            </div>
          </div>
        </EvidenceCollapsibleSection>
      )}

      {(latestJudgeRun || bestExperiment || recentExperiments.length > 0) && (
        <EvidenceCollapsibleSection title="Evals & experiments" icon={Gavel}>
          {latestJudgeRun && (
            <div className="rounded-lg border border-border/50 bg-background/80 px-3 py-2.5">
              <p className="text-sm font-medium">
                {evidenceRecordString(latestJudgeRun.datasetName) || "Latest judge run"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] capitalize">
                  {evidenceRecordString(latestJudgeRun.status) || "unknown"}
                </Badge>
                {evidenceRecordNumber(latestJudgeRun.overallScore) !== null && (
                  <span className="text-sm font-semibold">
                    {formatPercent(evidenceRecordNumber(latestJudgeRun.overallScore))}
                  </span>
                )}
              </div>
            </div>
          )}
          {bestExperiment && (
            <div className="rounded-lg border border-border/50 bg-background/80 px-3 py-2.5">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Rocket className="h-3.5 w-3.5" />
                {evidenceRecordString(bestExperiment.name) || "Best experiment"}
              </p>
              {evidenceRecordString(bestExperiment.hypothesis) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {evidenceRecordString(bestExperiment.hypothesis)}
                </p>
              )}
            </div>
          )}
          {recentExperiments.map((experiment, index) => {
            const record = experiment as Record<string, unknown>;
            return (
              <div
                key={`exp-${index}`}
                className="rounded-lg border border-border/50 px-3 py-2 flex items-center justify-between gap-2"
              >
                <p className="text-sm">{evidenceRecordString(record.name) || "Experiment"}</p>
                <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                  {evidenceRecordString(record.status) || "—"}
                </Badge>
              </div>
            );
          })}
        </EvidenceCollapsibleSection>
      )}
    </div>
  );
};

const IntrospectionResultPanel = ({
  answer,
  evidence,
  run,
  isFromHistory,
  onViewDetails,
}: {
  answer: BotSelfIntrospectionResponse | BotSelfIntrospectionRun;
  evidence: BotSelfIntrospectionEvidence | null;
  run?: BotSelfIntrospectionRun | null;
  isFromHistory: boolean;
  onViewDetails?: () => void;
}) => {
  const [viewTab, setViewTab] = useState("answer");

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-purple-600/5 via-primary/5 to-cyan-500/5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">
                {isFromHistory ? "Selected run" : "Latest result"}
              </p>
              {isFromHistory && (
                <Badge variant="secondary" className="text-[10px]">
                  From history
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{answer.question}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {"createdAt" in answer && answer.createdAt && (
              <Badge variant="outline" className="text-[10px]">
                {formatDateTime(answer.createdAt)}
              </Badge>
            )}
            {onViewDetails && (
              <Button size="sm" variant="outline" onClick={onViewDetails}>
                <Eye className="w-4 h-4 mr-1" />
                Details
              </Button>
            )}
          </div>
        </div>
        {run?.summary && (
          <p className="text-xs text-muted-foreground mt-2">
            {run.summary.linkedTraceCount} traces · {run.summary.failureClusterCount} clusters ·{" "}
            {run.summary.lowConfidenceCount} low confidence · {run.summary.unansweredCount}{" "}
            unanswered
          </p>
        )}
      </div>

      <Tabs value={viewTab} onValueChange={setViewTab}>
        <TabsList className="w-full justify-start rounded-none border-b border-border/40 bg-muted/10 h-11 p-0">
          <TabsTrigger
            value="answer"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5"
          >
            Answer
          </TabsTrigger>
          <TabsTrigger
            value="evidence"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5"
          >
            Phoenix evidence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="answer" className="mt-0 p-5">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {answer.answer}
          </div>
        </TabsContent>

        <TabsContent value="evidence" className="mt-0 p-5">
          {evidence ? (
            <IntrospectionEvidenceSections evidence={evidence} />
          ) : (
            <div className="py-6 text-center">
              <Database className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No evidence snapshot for this run.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const IntrospectionRunCard = ({
  run,
  selected,
  onSelect,
  onView,
}: {
  run: BotSelfIntrospectionRun;
  selected: boolean;
  onSelect: () => void;
  onView: () => void;
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onSelect}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
      }
    }}
    className={cn(
      "rounded-xl border p-4 cursor-pointer transition-all",
      selected
        ? "border-primary/50 bg-gradient-to-br from-purple-600/10 via-primary/5 to-cyan-500/10 shadow-sm ring-1 ring-primary/20"
        : "border-border/60 bg-gradient-to-br from-purple-600/5 via-primary/5 to-cyan-500/5 hover:border-primary/30"
    )}
  >
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="space-y-1 min-w-0">
        <p className="font-medium text-sm line-clamp-2">{run.question}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {formatDateTime(run.createdAt)}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {run.summary?.linkedTraceCount ?? 0} traces
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-amber-600">
            {run.summary?.lowConfidenceCount ?? 0} low conf
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-destructive">
            {run.summary?.unansweredCount ?? 0} unanswered
          </span>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={(event) => {
          event.stopPropagation();
          onView();
        }}
      >
        <Eye className="w-4 h-4 mr-1" />
        Details
      </Button>
    </div>
  </div>
);

const IntrospectionHistoryPanel = ({
  runs,
  totalRuns,
  page,
  totalPages,
  pageSize,
  search,
  loading,
  selectedRunId,
  onSearchChange,
  onPageChange,
  onSelectRun,
  onViewRun,
}: {
  runs: BotSelfIntrospectionRun[];
  totalRuns: number;
  page: number;
  totalPages: number;
  pageSize: number;
  search: string;
  loading: boolean;
  selectedRunId: string | null;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSelectRun: (run: BotSelfIntrospectionRun) => void;
  onViewRun: (run: BotSelfIntrospectionRun) => void;
}) => {
  const visiblePages = getVisiblePages(page, totalPages);
  const showingFrom = totalRuns === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, totalRuns);

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 bg-muted/10 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Introspection history</h3>
            <span className="text-xs text-muted-foreground">{totalRuns} runs</span>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search questions and answers..."
            className="pl-9 rounded-xl border-border/60 bg-background/80"
          />
        </div>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : runs.length > 0 ? (
          <div className="space-y-3">
            {runs.map((run) => (
              <IntrospectionRunCard
                key={run._id}
                run={run}
                selected={selectedRunId === run._id}
                onSelect={() => onSelectRun(run)}
                onView={() => onViewRun(run)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed py-10 text-center">
            <History className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              {search.trim() ? "No runs match your search" : "No introspection runs yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search.trim()
                ? "Try a different search term or clear the filter."
                : "Ask Phoenix a question to start building introspection history."}
            </p>
          </div>
        )}

        {totalRuns > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Showing {showingFrom}–{showingTo} of {totalRuns} runs
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
      </div>
    </div>
  );
};

const IntrospectionRunDetail = ({ run }: { run: BotSelfIntrospectionRun }) => (
  <div className="space-y-5">
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">Question</p>
      <p className="text-sm font-medium">{run.question}</p>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Linked traces</p>
        <p className="text-xl font-bold">{run.summary?.linkedTraceCount ?? 0}</p>
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Sampled</p>
        <p className="text-xl font-bold">{run.summary?.sampledInteractions ?? 0}</p>
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Low confidence</p>
        <p className="text-xl font-bold text-amber-600">{run.summary?.lowConfidenceCount ?? 0}</p>
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Unanswered</p>
        <p className="text-xl font-bold text-destructive">{run.summary?.unansweredCount ?? 0}</p>
      </div>
    </div>

    <div className="space-y-2">
      <p className="text-sm font-medium">Answer</p>
      <div className="whitespace-pre-wrap rounded-lg border border-border/50 bg-muted/30 p-4 text-sm leading-relaxed">
        {run.answer}
      </div>
    </div>

    {run.evidence && (
      <div className="space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Evidence snapshot
        </p>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <IntrospectionEvidenceSections evidence={run.evidence} />
        </div>
      </div>
    )}

    <p className="text-xs text-muted-foreground">
      Run at {formatDateTime(run.createdAt)}
      {run.summary?.phoenixProjectName ? ` · Phoenix: ${run.summary.phoenixProjectName}` : ""}
    </p>
  </div>
);

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
