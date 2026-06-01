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
