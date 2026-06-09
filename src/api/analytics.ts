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
  | "high_confidence_traces"
  | "handoff_sessions"
  | "resolved_handoffs"
  | "negative_feedback"
  | "positive_feedback"
  | "unanswered_questions"
  | "grounded_answers"
  | "hallucination_risk"
  | "qa_retrieval_hits"
  | "slow_responses"
  | "custom";

export type EvalDatasetPolarity = "positive" | "negative" | "neutral";

export type EvalTraceSource = "interaction_metrics" | "handoff_sessions";

export interface EvalTraceFilters {
  confidenceMin?: number | null;
  confidenceMax?: number | null;
  hallucinationRiskMin?: number | null;
  hallucinationRiskMax?: number | null;
  groundednessScoreMin?: number | null;
  groundednessScoreMax?: number | null;
  usedFallback?: boolean | null;
  sources?: string[];
  userEmotions?: string[];
  latencyMsMin?: number | null;
  latencyMsMax?: number | null;
  retrievalScoreMin?: number | null;
}

export interface EvalHandoffFilters {
  statuses?: string[];
  escalated?: boolean | null;
  userRatingMin?: number | null;
  userRatingMax?: number | null;
  hasFeedback?: boolean | null;
}

export interface BotEvalDatasetType {
  _id: string;
  name: string;
  description: string;
  polarity: EvalDatasetPolarity;
  traceSource: EvalTraceSource;
  traceFilters: EvalTraceFilters;
  handoffFilters: EvalHandoffFilters;
  datasetName?: string | null;
  createdAt: string;
}

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
  sourceType: EvalDatasetSourceType,
  customTypeId?: string
) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/eval-datasets/build`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ sourceType, customTypeId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to build eval dataset");
  }

  return data;
};

export const getBotEvalDatasetTypes = async (botId: string) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/eval-dataset-types`, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch eval dataset types");
  }

  return data;
};

export const createBotEvalDatasetType = async (
  botId: string,
  payload: {
    name: string;
    description?: string;
    polarity?: EvalDatasetPolarity;
    traceSource?: EvalTraceSource;
    traceFilters?: EvalTraceFilters;
    handoffFilters?: EvalHandoffFilters;
    datasetName?: string;
  }
) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/eval-dataset-types`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to create eval dataset type");
  }

  return data;
};

export const deleteBotEvalDatasetType = async (botId: string, typeId: string) => {
  const res = await fetch(
    `${API_BASE_URL}/api/bots/${botId}/eval-dataset-types/${typeId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to delete eval dataset type");
  }

  return data;
};

export type JudgeEvalMode = "standard" | "regression" | "gold_standard" | "custom";

export interface JudgeCriterion {
  key: string;
  label: string;
  description: string;
}

export interface JudgeEvalModeOption {
  key: JudgeEvalMode;
  label: string;
  description: string;
}

export const runBotLLMJudge = async (
  botId: string,
  options: {
    datasetName: string;
    evalMode?: JudgeEvalMode;
    selectedCriteria?: string[];
    passThreshold?: number;
  }
) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/evals/judge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(options),
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

export interface BotSelfIntrospectionEvidence {
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
  handoffs?: {
    sampled: number;
    unresolved: number;
    escalated: number;
    recentQuestions: Array<Record<string, unknown>>;
  };
  latestJudgeRun: Record<string, unknown> | null;
  bestExperiment: Record<string, unknown> | null;
  recentExperiments?: Array<Record<string, unknown>>;
}

export interface BotSelfIntrospectionResponse {
  _id?: string;
  createdAt?: string;
  question: string;
  answer: string;
  defaultQuestions: string[];
  evidence: BotSelfIntrospectionEvidence;
}

export interface BotSelfIntrospectionRun {
  _id: string;
  bot: string;
  user: string;
  question: string;
  answer: string;
  evidence: BotSelfIntrospectionEvidence;
  summary: {
    linkedTraceCount: number;
    sampledInteractions: number;
    lowConfidenceCount: number;
    unansweredCount: number;
    fallbackRate: number | null;
    failureClusterCount: number;
    phoenixProjectName: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BotSelfIntrospectionHistoryResponse {
  runs: BotSelfIntrospectionRun[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const getBotSelfIntrospectionHistory = async (
  botId: string,
  options?: { page?: number; pageSize?: number; search?: string }
) => {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.pageSize) params.set("pageSize", String(options.pageSize));
  if (options?.search?.trim()) params.set("search", options.search.trim());

  const query = params.toString();
  const res = await fetch(
    `${API_BASE_URL}/api/bots/${botId}/improvements/introspect/history${query ? `?${query}` : ""}`,
    { headers: getAuthHeaders() }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch introspection history");
  }

  return data as { result: BotSelfIntrospectionHistoryResponse };
};

export interface EvalDatasetSummary {
  datasetName: string;
  sourceTypes: string[];
  itemCount: number;
  latestItemAt: string;
  polarity?: EvalDatasetPolarity | "mixed";
  description?: string;
  latestRun?: EvalRun | null;
}

export interface EvalRun {
  _id: string;
  datasetName: string;
  status: "running" | "completed" | "failed";
  judgeModel: string;
  evalMode?: JudgeEvalMode;
  polarity?: EvalDatasetPolarity | "mixed";
  sourceTypes?: string[];
  itemCount?: number;
  passThreshold?: number;
  passedCount?: number;
  failedCount?: number;
  passRate?: number | null;
  selectedCriteria?: string[];
  criteria?: Record<string, number>;
  overallScore: number | null;
  explanations: Array<{
    itemId: string;
    question: string;
    scores: Record<string, number>;
    overallItemScore?: number | null;
    verdict?: "pass" | "fail" | "review";
    sourceType?: string | null;
    explanation: string;
  }>;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface JudgeSummary {
  totalDatasets: number;
  totalItems: number;
  totalRuns: number;
  completedRuns: number;
  averageOverallScore: number | null;
  latestRun: EvalRun | null;
}

export interface JudgeConfig {
  criteria: JudgeCriterion[];
  evalModes: JudgeEvalModeOption[];
  defaultPassThreshold: number;
  sourceTypePolarity: Record<string, EvalDatasetPolarity>;
}

export interface BotEvalDatasetsResponse {
  datasets: EvalDatasetSummary[];
  items: Array<Record<string, unknown>>;
  runs: EvalRun[];
  customTypes?: BotEvalDatasetType[];
  builtinTypes?: Array<{
    sourceType: EvalDatasetSourceType;
    datasetName: string;
    polarity?: EvalDatasetPolarity;
  }>;
  judgeSummary?: JudgeSummary;
  judgeConfig?: JudgeConfig;
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
export const createRegressionTests = async (
  botId: string,
  options?: { name?: string; description?: string }
) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/regression-tests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(options || {}),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to create regression tests");
  }

  return data;
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
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ botVersionId: botVersionId || "current" }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to run regression tests");
  }

  return data;
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

export type AutopilotCadence = "daily" | "weekly" | "monthly";

export interface BotAutopilotDelivery {
  email: { enabled: boolean; recipients: string[] };
  slack: { enabled: boolean; channelId: string };
}

export interface BotAutopilotConfig {
  _id: string;
  bot: string;
  enabled: boolean;
  prompt: string;
  cadence: AutopilotCadence;
  timeOfDay: string;
  timezone: string;
  delivery: BotAutopilotDelivery;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  lastStatus?: "never_run" | "completed" | "failed";
  lastError?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BotAutopilotRecommendation {
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
  evidence?: string[];
  suggestedAction?: string;
  channel?: string;
}

export interface BotAutopilotRun {
  _id: string;
  bot: string;
  trigger: "preview" | "manual" | "scheduled";
  prompt: string;
  period: { from: string; to: string; cadence: AutopilotCadence };
  status: "completed" | "failed";
  summary: string;
  recommendations: BotAutopilotRecommendation[];
  evidence?: Record<string, unknown>;
  deliveries?: Array<{
    channel: string;
    target: string;
    status: string;
    error?: string;
    sentAt?: string;
  }>;
  error?: string | null;
  createdAt: string;
}

export interface BotAutopilotResponse {
  config: BotAutopilotConfig;
  runs: BotAutopilotRun[];
  phoenix?: Record<string, unknown>;
  defaults?: {
    prompt: string;
    cadence: AutopilotCadence;
    timeOfDay: string;
    timezone: string;
  };
}

export const getBotAutopilot = async (botId: string) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/autopilot`, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch bot autopilot");
  }

  return data as { result: BotAutopilotResponse };
};

export const saveBotAutopilot = async (
  botId: string,
  payload: Partial<{
    enabled: boolean;
    prompt: string;
    cadence: AutopilotCadence;
    timeOfDay: string;
    timezone: string;
    delivery: BotAutopilotDelivery;
  }>
) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/autopilot`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to save bot autopilot");
  }

  return data;
};

export const generateBotAutopilotRecommendations = async (
  botId: string,
  options: {
    trigger?: "preview" | "manual" | "scheduled";
    send?: boolean;
    promptOverride?: string;
  } = {}
) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/autopilot/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(options),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to generate autopilot recommendations");
  }

  return data as { result: BotAutopilotRun };
};

export type MonitoringMetricType =
  | "low_confidence_rate"
  | "groundedness_score"
  | "hallucination_risk_avg"
  | "latency_avg_ms"
  | "latency_p95_ms"
  | "handoff_rate"
  | "handoff_rate_spike"
  | "fallback_rate"
  | "unknown_intent_cluster_count"
  | "largest_unknown_cluster";

export type MonitoringOperator = "above" | "below";

export interface MonitoringRule {
  _id?: string;
  ruleKey: string;
  name: string;
  description?: string;
  metricType: MonitoringMetricType;
  operator: MonitoringOperator;
  threshold: number;
  windowHours?: number;
  minOccurrences?: number;
  enabled: boolean;
  isBuiltin?: boolean;
}

export interface MonitoringAlert {
  _id: string;
  ruleKey: string;
  ruleName: string;
  severity: "critical" | "warning" | "info";
  status: "active" | "resolved" | "acknowledged";
  title: string;
  message: string;
  metricType: string;
  operator: string;
  threshold: number;
  currentValue: number | null;
  windowHours: number;
  evidence?: Record<string, unknown>;
  triggeredAt: string;
  notifications?: Array<Record<string, unknown>>;
}

export interface BotMonitoringResponse {
  config: {
    enabled: boolean;
    checkIntervalMinutes: number;
    cooldownMinutes: number;
    notifyOnDashboard: boolean;
    rules: MonitoringRule[];
    delivery: BotAutopilotDelivery;
    lastCheckedAt?: string | null;
    lastStatus?: string;
  };
  snapshot: Record<string, unknown>;
  rulePreviews: Array<{
    ruleKey: string;
    name: string;
    metricType: string;
    operator: string;
    threshold: number;
    currentValue: number | null;
    wouldTrigger: boolean;
    formattedCurrent: string;
    formattedThreshold: string;
  }>;
  activeAlerts: MonitoringAlert[];
  recentAlerts: MonitoringAlert[];
  phoenix?: Record<string, unknown>;
  metricCatalog: Array<{ metricType: string; label: string }>;
  builtinRules: MonitoringRule[];
}

export const getBotMonitoring = async (botId: string) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/monitoring`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to fetch monitoring");
  return data as { result: BotMonitoringResponse };
};

export const saveBotMonitoring = async (
  botId: string,
  payload: Record<string, unknown>
) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/monitoring`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to save monitoring");
  return data;
};

export const evaluateBotMonitoring = async (botId: string, notify = false) => {
  const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/monitoring/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ notify }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to evaluate monitoring");
  return data;
};

export const acknowledgeMonitoringAlert = async (botId: string, alertId: string) => {
  const res = await fetch(
    `${API_BASE_URL}/api/bots/${botId}/monitoring/alerts/${alertId}/acknowledge`,
    { method: "POST", headers: getAuthHeaders() }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to acknowledge alert");
  return data;
};

export const resolveMonitoringAlert = async (botId: string, alertId: string) => {
  const res = await fetch(
    `${API_BASE_URL}/api/bots/${botId}/monitoring/alerts/${alertId}/resolve`,
    { method: "POST", headers: getAuthHeaders() }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to resolve alert");
  return data;
};
