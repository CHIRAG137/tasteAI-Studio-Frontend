import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Headphones, MessageSquare, Clock, User, LogOut, RefreshCw, Bot, CheckCircle, AlertCircle, BarChart3, TrendingUp, Star, Zap, Circle, ArrowRight, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { removeAgentAuthToken, removeAgentEmail, getAgentEmail, getAgentAuthHeaders } from "@/utils/agentAuth";
import { useToast } from "@/hooks/use-toast";

interface HandoffSession {
  _id: string;
  bot: {
    _id: string;
    name: string;
    description?: string;
  };
  status: "pending" | "active" | "resolved";
  userQuestion: string;
  requestedAt: string;
  acceptedAt?: string;
  resolvedAt?: string;
  messages: Array<{
    sender: string;
    message: string;
    timestamp: string;
  }>;
}

interface AgentStats {
  agent: {
    email: string;
    isOnline: boolean;
    availabilityStatus: string;
    currentActiveChats: number;
    maxConcurrentChats: number;
    loadPercentage: number;
  };
  metrics: {
    totalChatsHandled: number;
    averageResponseTime: number;
    averageResolutionTime: number;
    averageRating: number;
    totalRatings: number;
  };
  sessions: {
    total: number;
    active: number;
    resolved: number;
    today: number;
  };
}

interface BotInfo {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  category?: string;
}

const AgentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<HandoffSession[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBots, setIsLoadingBots] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

  const agentEmail = getAgentEmail();

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch bots on mount
  useEffect(() => {
    fetchBots();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchSessions(), fetchStats()]);
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/handoff/sessions?status=all`,
        {
          headers: {
            "Content-Type": "application/json",
            ...getAgentAuthHeaders(),
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch sessions");
      }
      setSessions(data.result?.sessions || []);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
      if (!isLoading) {
        toast({
          title: "Error",
          description: error.message || "Failed to load sessions",
          variant: "destructive",
        });
      }
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/human-agent/stats`,
        {
          headers: {
            "Content-Type": "application/json",
            ...getAgentAuthHeaders(),
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch stats");
      }
      setStats(data.result);
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBots = async () => {
    try {
      setIsLoadingBots(true);
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/human-agent/bots`,
        {
          headers: {
            "Content-Type": "application/json",
            ...getAgentAuthHeaders(),
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch bots");
      }
      setBots(data.result?.bots || []);
    } catch (error: any) {
      console.error("Error fetching bots:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load bots",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBots(false);
    }
  };

  const updateStatus = async (isOnline: boolean, availabilityStatus?: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/human-agent/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAgentAuthHeaders(),
          },
          body: JSON.stringify({
            isOnline,
            availabilityStatus: availabilityStatus || (isOnline ? "available" : "offline"),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      toast({
        title: "Status Updated",
        description: `You are now ${isOnline ? "online" : "offline"}`,
      });

      await fetchStats();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await updateStatus(false, "offline");
    removeAgentAuthToken();
    removeAgentEmail();
    navigate("/agent/login");
  };

  const handleSessionClick = (sessionId: string) => {
    navigate(`/agent/chat/${sessionId}`);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const pendingSessions = sessions.filter(s => s.status === "pending");
  const activeSessions = sessions.filter(s => s.status === "active");
  const resolvedSessions = sessions.filter(s => s.status === "resolved");

  const isOnline = stats?.agent.isOnline && stats?.agent.availabilityStatus === "available";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                <Headphones className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Agent Portal
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {agentEmail} • {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={fetchData}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>

              {stats && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(!stats.agent.isOnline)}
                  className={isOnline
                    ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }
                >
                  {isOnline ? "Go Offline" : "Go Online"}
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/agent/profile")}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                <Settings className="w-4 h-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleLogout}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickStatCard
            icon={MessageSquare}
            label="Active Chats"
            value={stats?.agent.currentActiveChats || 0}
            color="blue"
            pulse={stats && stats.agent.currentActiveChats > 0}
          />
          <QuickStatCard
            icon={Clock}
            label="Pending Requests"
            value={pendingSessions.length}
            color="amber"
            pulse={pendingSessions.length > 0}
          />
          <QuickStatCard
            icon={CheckCircle}
            label="Resolved Today"
            value={stats?.sessions.today || 0}
            color="emerald"
          />
          <QuickStatCard
            icon={Zap}
            label="Current Load"
            value={`${stats?.agent.loadPercentage || 0}%`}
            color="purple"
            showProgress={true}
            progress={stats?.agent.loadPercentage || 0}
          />
        </div>

        {/* My Bots Section */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
                  <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">My Bots</CardTitle>
                  <CardDescription>Bots where you provide support</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {bots.length} {bots.length === 1 ? 'bot' : 'bots'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingBots ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                <span className="ml-2 text-sm text-slate-500">Loading bots...</span>
              </div>
            ) : bots.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No bots assigned</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  You haven't been assigned to any bots yet
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bots.map((bot) => (
                  <div
                    key={bot._id}
                    className="group p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 group-hover:from-indigo-100 group-hover:to-purple-100 dark:group-hover:from-indigo-900/50 dark:group-hover:to-purple-900/50 transition-colors">
                        <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                            {bot.name}
                          </h4>
                          {bot.isActive && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        {bot.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {bot.description}
                          </p>
                        )}
                        {bot.category && (
                          <div className="flex items-center gap-1 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {bot.category}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30">
                <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Performance</CardTitle>
                <CardDescription>Your support metrics</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricItem
              label="Total Chats"
              value={stats?.metrics.totalChatsHandled || 0}
              icon={MessageSquare}
            />
            <MetricItem
              label="Avg Response"
              value={stats?.metrics.averageResponseTime ? formatDuration(stats.metrics.averageResponseTime) : '0s'}
              icon={Clock}
            />
            <MetricItem
              label="Avg Resolution"
              value={stats?.metrics.averageResolutionTime ? formatDuration(stats.metrics.averageResolutionTime) : '0s'}
              icon={TrendingUp}
            />
            <MetricItem
              label="Rating"
              value={stats?.metrics.averageRating ? `${stats.metrics.averageRating.toFixed(1)}★` : 'N/A'}
              icon={Star}
              highlight={stats?.metrics.averageRating >= 4}
            />
          </CardContent>
        </Card>

        {/* Sessions List */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Support Queue</CardTitle>
                <CardDescription>Manage incoming support requests</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="active" className="relative">
                  Active
                  {(pendingSessions.length + activeSessions.length) > 0 && (
                    <Badge className="ml-2 h-5 px-1.5 text-xs bg-blue-500 hover:bg-blue-600">
                      {pendingSessions.length + activeSessions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-0">
                {isLoading ? (
                  <LoadingState />
                ) : (pendingSessions.length + activeSessions.length) === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="No active sessions"
                    description="You don't have any active support sessions at the moment"
                  />
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {[...pendingSessions, ...activeSessions].map((session) => (
                        <SessionCard
                          key={session._id}
                          session={session}
                          onClick={handleSessionClick}
                          formatTime={formatTime}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="resolved" className="mt-0">
                {resolvedSessions.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle}
                    title="No resolved sessions"
                    description="You haven't resolved any support sessions yet"
                  />
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {resolvedSessions.map((session) => (
                        <SessionCard
                          key={session._id}
                          session={session}
                          onClick={handleSessionClick}
                          formatTime={formatTime}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="all" className="mt-0">
                {sessions.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="No sessions"
                    description="You don't have any support sessions yet"
                  />
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <SessionCard
                          key={session._id}
                          session={session}
                          onClick={handleSessionClick}
                          formatTime={formatTime}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Powered by TasteAI Studio
          </p>
        </div>
      </div>
    </div>
  );
};

// Quick Stat Card Component
const QuickStatCard = ({
  icon: Icon,
  label,
  value,
  color,
  pulse = false,
  showProgress = false,
  progress = 0
}: {
  icon: any;
  label: string;
  value: string | number;
  color: 'amber' | 'emerald' | 'blue' | 'purple';
  pulse?: boolean;
  showProgress?: boolean;
  progress?: number;
}) => {
  const colorMap = {
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      icon: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-900/50',
      progress: 'bg-amber-500'
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      icon: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-900/50',
      progress: 'bg-emerald-500'
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
      border: 'border-blue-100 dark:border-blue-900/50',
      progress: 'bg-blue-500'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      icon: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
      border: 'border-purple-100 dark:border-purple-900/50',
      progress: 'bg-purple-500'
    }
  };

  const colors = colorMap[color];

  return (
    <Card className={`${colors.bg} border ${colors.border} relative overflow-hidden`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.icon} ${pulse ? 'animate-pulse' : ''}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {value}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {label}
            </p>
          </div>
        </div>
        {showProgress && (
          <Progress value={progress} className={`mt-3 h-1.5 ${colors.progress}`} />
        )}
      </CardContent>
    </Card>
  );
};

// Metric Item Component
const MetricItem = ({
  label,
  value,
  icon: Icon,
  highlight = false
}: {
  label: string;
  value: string | number;
  icon: any;
  highlight?: boolean;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
      <Icon className="w-4 h-4" />
      <span className="text-xs">{label}</span>
    </div>
    <p className={`text-xl font-bold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
      {value}
    </p>
  </div>
);

// Loading State Component
const LoadingState = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-3" />
      <p className="text-sm text-slate-500">Loading sessions...</p>
    </div>
  </div>
);

// Empty State Component
const EmptyState = ({
  icon: Icon,
  title,
  description
}: {
  icon: any;
  title: string;
  description: string;
}) => (
  <div className="text-center py-12">
    <Icon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{description}</p>
  </div>
);

// Session Card Component
const SessionCard = ({
  session,
  onClick,
  formatTime
}: {
  session: HandoffSession;
  onClick: (id: string) => void;
  formatTime: (date: string) => string;
}) => {
  const statusStyles = {
    pending: {
      badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
      indicator: 'bg-amber-500',
      ring: 'ring-amber-100 dark:ring-amber-900/50'
    },
    active: {
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
      indicator: 'bg-emerald-500',
      ring: 'ring-emerald-100 dark:ring-emerald-900/50'
    },
    resolved: {
      badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      indicator: 'bg-slate-400',
      ring: ''
    }
  };

  const styles = statusStyles[session.status];

  return (
    <Card
      className={`border-slate-200 dark:border-slate-800 hover:shadow-md transition-all cursor-pointer group ${styles.ring ? 'hover:ring-2 ' + styles.ring : ''}`}
      onClick={() => onClick(session._id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${styles.indicator} ${session.status === 'active' ? 'animate-pulse' : ''}`} />
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  {session.bot.name}
                </span>
              </div>
              <Badge className={`${styles.badge} text-xs`}>
                {session.status}
              </Badge>
            </div>

            {session.userQuestion && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                "{session.userQuestion}"
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {session.messages.length} messages
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(session.requestedAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session.status === "pending" && (
              <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 text-xs animate-pulse">
                New
              </Badge>
            )}
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentDashboard;
