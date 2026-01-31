import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Headphones, MessageSquare, Clock, LogOut, RefreshCw, Bot, CheckCircle, BarChart3, TrendingUp, Star, Zap, ArrowRight, Settings, Activity, Users, Timer } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-primary shadow-medium">
                  <Headphones className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">
                    Agent Portal
                  </h1>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
                    <span className="text-xs text-muted-foreground">
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchData}
                className="h-9 w-9 p-0"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>

              {stats && (
                <Button
                  size="sm"
                  onClick={() => updateStatus(!stats.agent.isOnline)}
                  variant={isOnline ? "outline" : "default"}
                  className={isOnline 
                    ? "border-destructive/50 text-destructive hover:bg-destructive/10" 
                    : "bg-success hover:bg-success/90 text-success-foreground"
                  }
                >
                  {isOnline ? "Go Offline" : "Go Online"}
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/agent/profile")}
                className="h-9 w-9 p-0"
              >
                <Settings className="w-4 h-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-sm">
              {agentEmail}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="w-4 h-4" />
            <span>Auto-refreshing every 5s</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={MessageSquare}
            label="Active Chats"
            value={stats?.agent.currentActiveChats || 0}
            variant="primary"
            animate={stats && stats.agent.currentActiveChats > 0}
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={pendingSessions.length}
            variant="warning"
            animate={pendingSessions.length > 0}
          />
          <StatCard
            icon={CheckCircle}
            label="Resolved Today"
            value={stats?.sessions.today || 0}
            variant="success"
          />
          <StatCard
            icon={Zap}
            label="Load"
            value={`${stats?.agent.loadPercentage || 0}%`}
            variant="accent"
            progress={stats?.agent.loadPercentage || 0}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Sessions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Support Queue */}
            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Support Queue</CardTitle>
                      <CardDescription>Manage incoming requests</CardDescription>
                    </div>
                  </div>
                  {(pendingSessions.length + activeSessions.length) > 0 && (
                    <Badge variant="default" className="text-xs">
                      {pendingSessions.length + activeSessions.length} active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full grid grid-cols-3 mb-4">
                    <TabsTrigger value="active" className="text-sm">
                      Active
                      {(pendingSessions.length + activeSessions.length) > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-primary text-primary-foreground">
                          {pendingSessions.length + activeSessions.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="resolved" className="text-sm">Resolved</TabsTrigger>
                    <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
                  </TabsList>

                  <TabsContent value="active" className="mt-0">
                    {isLoading ? (
                      <LoadingState />
                    ) : (pendingSessions.length + activeSessions.length) === 0 ? (
                      <EmptyState
                        icon={MessageSquare}
                        title="No active sessions"
                        description="You're all caught up! New requests will appear here."
                      />
                    ) : (
                      <ScrollArea className="h-[380px]">
                        <div className="space-y-3 pr-4">
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
                        description="Resolved conversations will appear here"
                      />
                    ) : (
                      <ScrollArea className="h-[380px]">
                        <div className="space-y-3 pr-4">
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
                        title="No sessions yet"
                        description="Support sessions will appear here"
                      />
                    ) : (
                      <ScrollArea className="h-[380px]">
                        <div className="space-y-3 pr-4">
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

          {/* Right Column - Stats & Bots */}
          <div className="space-y-6">
            {/* Performance Card */}
            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <BarChart3 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Performance</CardTitle>
                    <CardDescription>Your metrics</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricRow
                  icon={Users}
                  label="Total Handled"
                  value={stats?.metrics.totalChatsHandled || 0}
                />
                <MetricRow
                  icon={Timer}
                  label="Avg Response"
                  value={stats?.metrics.averageResponseTime ? formatDuration(stats.metrics.averageResponseTime) : '0s'}
                />
                <MetricRow
                  icon={TrendingUp}
                  label="Avg Resolution"
                  value={stats?.metrics.averageResolutionTime ? formatDuration(stats.metrics.averageResolutionTime) : '0s'}
                />
                <MetricRow
                  icon={Star}
                  label="Rating"
                  value={stats?.metrics.averageRating ? `${stats.metrics.averageRating.toFixed(1)} ★` : 'N/A'}
                  highlight={stats?.metrics.averageRating >= 4}
                />
              </CardContent>
            </Card>

            {/* My Bots Card */}
            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Bot className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">My Bots</CardTitle>
                      <CardDescription>Assigned bots</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {bots.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingBots ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : bots.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No bots assigned</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bots.slice(0, 4).map((bot) => (
                      <div
                        key={bot._id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {bot.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {bot.name}
                          </p>
                          {bot.category && (
                            <p className="text-xs text-muted-foreground">{bot.category}</p>
                          )}
                        </div>
                        {bot.isActive && (
                          <div className="w-2 h-2 rounded-full bg-success" />
                        )}
                      </div>
                    ))}
                    {bots.length > 4 && (
                      <p className="text-xs text-center text-muted-foreground pt-2">
                        +{bots.length - 4} more bots
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pt-4 pb-6">
          <p className="text-xs text-muted-foreground">
            Powered by TasteAI Studio
          </p>
        </footer>
      </main>
    </div>
  );
};

// Stat Card Component
const StatCard = ({
  icon: Icon,
  label,
  value,
  variant,
  animate = false,
  progress
}: {
  icon: any;
  label: string;
  value: string | number;
  variant: 'primary' | 'success' | 'warning' | 'accent';
  animate?: boolean;
  progress?: number;
}) => {
  const variantStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-amber-500/10 text-amber-600',
    accent: 'bg-accent/10 text-accent'
  };

  return (
    <Card className="shadow-soft hover:shadow-medium transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${variantStyles[variant]} ${animate ? 'animate-pulse' : ''}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-2xl font-bold text-foreground">{value}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{label}</p>
        {progress !== undefined && (
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Metric Row Component
const MetricRow = ({
  icon: Icon,
  label,
  value,
  highlight = false
}: {
  icon: any;
  label: string;
  value: string | number;
  highlight?: boolean;
}) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </div>
    <span className={`text-sm font-semibold ${highlight ? 'text-success' : 'text-foreground'}`}>
      {value}
    </span>
  </div>
);

// Loading State Component
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mb-3" />
    <p className="text-sm text-muted-foreground">Loading sessions...</p>
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
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="p-3 rounded-full bg-muted mb-3">
      <Icon className="w-6 h-6 text-muted-foreground" />
    </div>
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{description}</p>
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
  const statusConfig = {
    pending: {
      badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      dot: 'bg-amber-500',
      label: 'Pending'
    },
    active: {
      badge: 'bg-success/10 text-success border-success/20',
      dot: 'bg-success',
      label: 'Active'
    },
    resolved: {
      badge: 'bg-muted text-muted-foreground border-border',
      dot: 'bg-muted-foreground',
      label: 'Resolved'
    }
  };

  const config = statusConfig[session.status];

  return (
    <Card
      className="group cursor-pointer border hover:border-primary/30 hover:shadow-soft transition-all"
      onClick={() => onClick(session._id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {session.bot.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-foreground truncate">
                {session.bot.name}
              </span>
              <Badge variant="outline" className={`text-xs ${config.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.dot} ${session.status === 'active' ? 'animate-pulse' : ''}`} />
                {config.label}
              </Badge>
              {session.status === "pending" && (
                <Badge className="bg-destructive text-destructive-foreground text-xs animate-pulse">
                  New
                </Badge>
              )}
            </div>

            {session.userQuestion && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                "{session.userQuestion}"
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {session.messages.length}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(session.requestedAt)}
              </span>
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentDashboard;
