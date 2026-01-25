import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Headphones, 
  MessageSquare, 
  Clock, 
  User, 
  LogOut, 
  RefreshCw,
  Bot,
  CheckCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Star,
  Zap,
  Circle,
  ArrowRight,
  Settings
} from "lucide-react";
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

const AgentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<HandoffSession[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const agentEmail = getAgentEmail();

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-950">
      {/* Header */}
      <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Headphones className="w-6 h-6 text-white" />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Agent Portal
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{agentEmail}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className={`text-xs font-medium ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {stats && (
                <Button 
                  variant={isOnline ? "outline" : "default"}
                  size="sm" 
                  onClick={() => updateStatus(!stats.agent.isOnline)}
                  className={isOnline 
                    ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400" 
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }
                >
                  <Circle className={`w-2 h-2 mr-2 fill-current ${isOnline ? 'text-red-500' : 'text-emerald-300'}`} />
                  {isOnline ? "Go Offline" : "Go Online"}
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={fetchData}
                disabled={isLoading}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/agent/profile")}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickStatCard 
            icon={Clock}
            label="Pending"
            value={pendingSessions.length}
            color="amber"
            pulse={pendingSessions.length > 0}
          />
          <QuickStatCard 
            icon={MessageSquare}
            label="Active Chats"
            value={activeSessions.length}
            color="emerald"
          />
          <QuickStatCard 
            icon={CheckCircle}
            label="Resolved Today"
            value={stats?.sessions.today || 0}
            color="blue"
          />
          <QuickStatCard 
            icon={Zap}
            label="Capacity"
            value={`${stats?.agent.loadPercentage || 0}%`}
            color="purple"
            showProgress
            progress={stats?.agent.loadPercentage || 0}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Metrics */}
          <Card className="lg:col-span-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border-slate-200/50 dark:border-slate-800/50 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <MetricItem 
                label="Total Handled"
                value={stats?.metrics.totalChatsHandled || 0}
                icon={MessageSquare}
              />
              <MetricItem 
                label="Avg Response"
                value={formatDuration(stats?.metrics.averageResponseTime || 0)}
                icon={Clock}
              />
              <MetricItem 
                label="Avg Resolution"
                value={formatDuration(stats?.metrics.averageResolutionTime || 0)}
                icon={CheckCircle}
              />
              <MetricItem 
                label="Rating"
                value={stats?.metrics.averageRating ? `${stats.metrics.averageRating.toFixed(1)}/5` : "N/A"}
                icon={Star}
                highlight={stats?.metrics.averageRating ? stats.metrics.averageRating >= 4 : false}
              />
            </CardContent>
          </Card>

          {/* Sessions List */}
          <Card className="lg:col-span-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border-slate-200/50 dark:border-slate-800/50 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                    Support Queue
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    Manage incoming support requests
                  </CardDescription>
                </div>
                {pendingSessions.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 animate-pulse">
                    {pendingSessions.length} waiting
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                  <TabsTrigger 
                    value="active" 
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-md text-sm"
                  >
                    Active
                    {(pendingSessions.length + activeSessions.length) > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
                        {pendingSessions.length + activeSessions.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="resolved"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-md text-sm"
                  >
                    Resolved
                  </TabsTrigger>
                  <TabsTrigger 
                    value="all"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-md text-sm"
                  >
                    All
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-0">
                  {isLoading ? (
                    <LoadingState />
                  ) : (pendingSessions.length + activeSessions.length) === 0 ? (
                    <EmptyState 
                      icon={MessageSquare}
                      title="No active sessions"
                      description="New support requests will appear here"
                    />
                  ) : (
                    <ScrollArea className="h-[420px] pr-4">
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
                      description="Completed conversations will appear here"
                    />
                  ) : (
                    <ScrollArea className="h-[420px] pr-4">
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
                      icon={AlertCircle}
                      title="No sessions yet"
                      description="All support sessions will appear here"
                    />
                  ) : (
                    <ScrollArea className="h-[420px] pr-4">
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
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-600">
          Powered by <span className="font-medium text-slate-500 dark:text-slate-500">TasteAI Studio</span>
        </p>
      </footer>
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
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-4 transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${colors.icon} rounded-lg flex items-center justify-center ${pulse ? 'animate-pulse' : ''}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
        </div>
      </div>
      {showProgress && (
        <Progress value={progress} className="mt-3 h-1.5" />
      )}
    </div>
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
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
        <Icon className={`w-4 h-4 ${highlight ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
      </div>
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
    </div>
    <span className={`text-sm font-semibold ${highlight ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
      {value}
    </span>
  </div>
);

// Loading State Component
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-16">
    <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mb-3" />
    <p className="text-sm text-slate-500">Loading sessions...</p>
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
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-slate-400" />
    </div>
    <h3 className="font-medium text-slate-900 dark:text-white mb-1">{title}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
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
    <div
      className={`group p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-all hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none ${session.status === 'pending' ? `ring-2 ${styles.ring}` : ''}`}
      onClick={() => onClick(session._id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </div>
            <span className="font-medium text-slate-900 dark:text-white truncate">{session.bot.name}</span>
            <Badge className={`${styles.badge} text-xs border`}>
              {session.status}
            </Badge>
          </div>
          {session.userQuestion && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2 pl-10">
              "{session.userQuestion}"
            </p>
          )}
          <div className="flex items-center gap-3 pl-10 text-xs text-slate-500 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {session.messages.length} messages
            </span>
            <span>•</span>
            <span>{formatTime(session.requestedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.status === "pending" && (
            <Badge className="bg-amber-500 text-white border-0 text-xs animate-pulse">
              New
            </Badge>
          )}
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
