import { getAuthHeaders } from "@/utils/auth";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const getAgentAnalytics = async (botId: string) => {
  const res = await fetch(
    `${API_BASE_URL}/api/human-agent/bot/${botId}/agents`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch agent analytics");
  }

  return res.json();
};

export const getBotObservabilityInsights = async (botId: string) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/observability`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Arize observability insights");
  }

  return res.json();
};

export const getBotSelfImprovementDashboard = async (botId: string) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/improvements`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch bot self-improvement dashboard");
  }

  return res.json();
};

export const applyBotImprovementAction = async (
  botId: string,
  payload: {
    itemKey: string;
    action: ImprovementAction;
    item: ImprovementItem;
  }
) => {
  const res = await fetch(
    `${API_BASE_URL}/api/bots/${botId}/improvements/actions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to apply improvement action");
  }

  return data;
};

export const askBotSelfIntrospection = async (
  botId: string,
  question: string
) => {
  const res = await fetch(
    `${API_BASE_URL}/api/bots/${botId}/improvements/introspect`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ question }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to run bot self-introspection");
  }

  return data as { result: BotSelfIntrospectionResponse };
};

export type EvalDatasetSourceType =
  | "low_confidence_traces"
  | "handoff_sessions"
  | "negative_feedback"
  | "unanswered_questions";

export const getBotEvalDatasets = async (botId: string) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/eval-datasets`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch eval datasets");
  }

  return res.json();
};

export const buildBotEvalDataset = async (
  botId: string,
  sourceType: EvalDatasetSourceType
) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/eval-datasets/build`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ sourceType }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to build eval dataset");
  }

  return data;
};

export const runBotLLMJudge = async (botId: string, datasetName: string) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/evals/judge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ datasetName }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to run LLM-as-a-Judge eval");
  }

  return data;
};

export interface ExperimentVariantConfig {
  label: string;
  description: string;
  trafficAllocation: number;
  config: Record<string, unknown>;
}

export interface BotExperiment {
  _id: string;
  name: string;
  hypothesis: string;
  datasetName: string;
  primaryMetric?: string;
  guardrailMetric?: string;
  targetingRules?: Record<string, unknown>;
  control: ExperimentVariantConfig;
  treatment: ExperimentVariantConfig;
  status: "draft" | "running" | "completed" | "failed";
  metrics?: {
    controlWins: number;
    treatmentWins: number;
    ties: number;
    treatmentWinRate: number | null;
    controlAverageJudgeScore: number | null;
    treatmentAverageJudgeScore: number | null;
    controlAverageLatencyMs: number | null;
    treatmentAverageLatencyMs: number | null;
    controlEstimatedCost: number | null;
    treatmentEstimatedCost: number | null;
  };
  samples?: Array<{
    question: string;
    controlOutput: string;
    treatmentOutput: string;
    winner: "control" | "treatment" | "tie";
    controlScore: number;
    treatmentScore: number;
    explanation: string;
    controlLatencyMs: number;
    treatmentLatencyMs: number;
  }>;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface BotExperimentsResponse {
  experiments: BotExperiment[];
  datasets: Array<{
    datasetName: string;
    itemCount: number;
    latestItemAt: string;
  }>;
  defaults: {
    control: ExperimentVariantConfig;
    treatment: ExperimentVariantConfig;
  };
}

export const getBotExperiments = async (botId: string) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/experiments`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch bot experiments");
  }

  return res.json();
};

export const createBotExperiment = async (
  botId: string,
  payload: {
    name: string;
    hypothesis: string;
    datasetName: string;
    primaryMetric: string;
    guardrailMetric: string;
    targetingRules: Record<string, unknown>;
    control: ExperimentVariantConfig;
    treatment: ExperimentVariantConfig;
  }
) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/experiments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to create experiment");
  }

  return data;
};

export const runBotExperiment = async (botId: string, experimentId: string) => {
  const res = await fetch(
    `${API_BASE_URL}/api/bots/${botId}/experiments/${experimentId}/run`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to run experiment");
  }

  return data;
};

export interface AgentStats {
  agentId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  isPasswordSet: boolean;
  isOnline: boolean;
  availabilityStatus: string;
  lastSeenAt: string;
  lastLoginAt: string;
  totalChatsAssigned: number;
  currentActiveChats: number;
  maxConcurrentChats: number;
  loadPercentage: number;
  hasCapacity: boolean;
  averageResponseTime: number;
  averageResolutionTime: number;
  averageRating: number;
  totalRatings: number;
  stats: {
    totalHandoffs: number;
    resolvedHandoffs: number;
    activeHandoffs: number;
    pendingHandoffs: number;
    abandonedHandoffs: number;
    transferredHandoffs: number;
    resolutionRate: number;
    totalEscalations: number;
    escalationRate: number;
    avgResponseTimeInSeconds: number;
    avgResolutionTimeInSeconds: number;
    avgUserRating: number;
    totalRatingsReceived: number;
  };
  skills: string[];
  timezone: string;
  emailNotifications: boolean;
  soundNotifications: boolean;
  autoAcceptChats: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSummary {
  totalAgents: number;
  activeAgents: number;
  onlineAgents: number;
  passwordSetAgents: number;
  totalHandoffs: number;
  totalResolved: number;
  totalEscalations: number;
  overallResolutionRate: number;
  avgResponseTimeInSeconds: number;
}

export interface LowConfidenceQuestion {
  sessionId: string;
  question: string;
  answer: string;
  score: number | null;
  timestamp: string;
}

export interface ArizeRecommendation {
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
}

export interface BotHealthScore {
  score: number;
  status: "healthy" | "watch" | "needs_attention";
  trend: "up" | "down" | "stable" | string;
  sampleSize: number;
  components: {
    answerConfidence: { value: number | null; score: number };
    lowConfidenceRate: { value: number; score: number };
    groundedness: { value: number | null; score: number };
    latency: { valueMs: number | null; score: number };
    fallbackRate: { value: number; score: number };
    handoffEscalationRate: { value: number; score: number };
  };
}

export interface BotObservabilityInsights {
  bot: {
    id: string;
    name: string;
    llmProvider: string;
    model: string;
  };
  phoenix: {
    projectName: string;
    tracingEnabled: boolean;
    mcpServer: string;
    mcpConfig: Record<string, unknown>;
  };
  metrics: {
    totalQa: number;
    sampledSessions: number;
    sampledSessionMessages: number;
    averageConfidence: number | null;
    lowConfidenceCount: number;
    sourceBreakdown: Record<string, number>;
  };
  healthScore: BotHealthScore;
  lowConfidenceQuestions: LowConfidenceQuestion[];
  recommendations: ArizeRecommendation[];
  selfImprovementLoop: string[];
}

export type ImprovementAction =
  | "add_to_eval_dataset"
  | "create_training_qa"
  | "mark_expected"
  | "send_to_human_review";

export interface ImprovementItem {
  key: string;
  type:
    | "weak_answer"
    | "unanswered_question"
    | "low_confidence_session"
    | "hallucination_risk"
    | "repeated_unknown_intent";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  question: string;
  answer: string;
  source: string;
  confidence: number | null;
  hallucinationRisk: number | null;
  sessionId: string | null;
  createdAt: string;
  suggestedActions: ImprovementAction[];
  actionState: Array<{
    action: ImprovementAction;
    status: string;
    createdAt: string;
  }>;
}

export interface BotSelfImprovementDashboard {
  bot: {
    id: string;
    name: string;
  };
  summary: {
    totalItems: number;
    highPriority: number;
    weakAnswers: number;
    unanswered: number;
    hallucinationRisk: number;
    repeatedIntents: number;
    handoffReview: number;
  };
  healthScore: BotHealthScore;
  items: ImprovementItem[];
}

export interface BotSelfIntrospectionResponse {
  question: string;
  answer: string;
  defaultQuestions: string[];
  evidence: {
    phoenix: {
      enabled?: boolean;
      projectName?: string;
      baseUrl?: string;
      mcpServer?: string;
      traceUrl?: string | null;
      linkedTraceCount?: number;
      recentTraceUrls?: Array<{
        traceId: string;
        spanId?: string | null;
        traceUrl?: string | null;
        question: string;
        confidence?: number | null;
      }>;
    };
    metrics: {
      sampledInteractions: number;
      lowConfidenceCount: number;
      unansweredCount: number;
      fallbackRate: number;
      averageConfidence: number | null;
      averageLatencyMs: number | null;
      sourceBreakdown: Record<string, number>;
      fallbackBreakdown: Record<string, number>;
    };
    failureClusters: Array<{
      intentKey: string;
      count: number;
      avgConfidence: number | null;
      avgLatencyMs: number | null;
      fallbackCount: number;
      examples: Array<{
        question: string;
        answer: string;
        source: string;
        confidence: number | null;
        traceUrl?: string | null;
        createdAt: string;
      }>;
    }>;
    topLowConfidenceQuestions: Array<Record<string, unknown>>;
    topUnansweredQuestions: Array<Record<string, unknown>>;
    latestJudgeRun: Record<string, unknown> | null;
    bestExperiment: Record<string, unknown> | null;
  };
}

export interface EvalDatasetSummary {
  datasetName: string;
  sourceTypes: string[];
  itemCount: number;
  latestItemAt: string;
}

export interface EvalRun {
  _id: string;
  datasetName: string;
  status: "running" | "completed" | "failed";
  judgeModel: string;
  criteria?: Record<string, number>;
  overallScore: number | null;
  explanations: Array<{
    itemId: string;
    question: string;
    scores: Record<string, number>;
    explanation: string;
  }>;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface BotEvalDatasetsResponse {
  datasets: EvalDatasetSummary[];
  items: Array<Record<string, unknown>>;
  runs: EvalRun[];
}

// Regression Test Types
export interface TestCase {
  questionId: string;
  question: string;
  expectedAnswer: string;
  priority: "high" | "medium" | "low";
  source: "low_confidence" | "handoff" | "negative_feedback" | "manual";
  createdFrom?: {
    sessionId?: string;
    score?: number;
  };
}

export interface RegressionTestRun {
  testCaseId: string;
  botVersionId: string;
  actualAnswer: string;
  relevanceScore: number;
  groundednessScore: number;
  verdict: "passed" | "failed" | "regressed" | "improved";
  explanation?: string;
  runAt: string;
}

export interface RegressionTestStatistics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  regressions: number;
  improvements: number;
}

export interface BotRegressionTest {
  _id: string;
  bot: string;
  user: string;
  name: string;
  description?: string;
  testCases: TestCase[];
  lastRunAt?: string;
  status: "active" | "archived" | "disabled";
  statistics: RegressionTestStatistics;
  testRuns: RegressionTestRun[];
  createdAt: string;
  updatedAt: string;
}

export interface TestRunResults {
  testSuiteId: string;
  statistics: RegressionTestStatistics;
  testRuns: RegressionTestRun[];
  summary: {
    improved: number;
    regressed: number;
    message: string;
  };
}

// Regression Test API Functions
export const createRegressionTests = async (botId: string) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/regression-tests`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to create regression tests");
  }

  return res.json();
};

export const getRegressionTests = async (botId: string) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/regression-tests`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch regression tests");
  }

  return res.json();
};

export const runRegressionTests = async (
  botId: string,
  testSuiteId: string,
  botVersionId?: string
): Promise<{ result: TestRunResults }> => {
  const res = await fetch(
    `${API_BASE_URL}/api/bots/${botId}/regression-tests/${testSuiteId}/run`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ botVersionId: botVersionId || "current" }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to run regression tests");
  }

  return res.json();
};

export const getTestSuiteDetails = async (
  botId: string,
  testSuiteId: string
): Promise<{ result: BotRegressionTest }> => {
  const res = await fetch(
    `${API_BASE_URL}/api/bots/${botId}/regression-tests/${testSuiteId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch test suite details");
  }

  return res.json();
};

export const addTestCase = async (
  botId: string,
  testSuiteId: string,
  testCase: {
    question: string;
    expectedAnswer: string;
    priority?: "high" | "medium" | "low";
  }
) => {
  const res = await fetch(
    `${API_BASE_URL}/api/bots/${botId}/regression-tests/${testSuiteId}/test-cases`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(testCase),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to add test case");
  }

  return res.json();
};
