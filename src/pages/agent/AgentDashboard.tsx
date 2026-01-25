import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BarChart3
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
      if (!isLoading) { // Only show toast if not initial load
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "resolved":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-500 rounded-lg flex items-center justify-center">
                <Headphones className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  Agent Dashboard
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{agentEmail}</p>
                  {stats && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        stats.agent.isOnline && stats.agent.availabilityStatus === "available"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {stats.agent.availabilityStatus}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => updateStatus(!stats.agent.isOnline)}
                  className={stats.agent.isOnline ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                >
                  {stats.agent.isOnline ? "Go Offline" : "Go Online"}
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchData}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingSessions.length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeSessions.length}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.sessions.today || 0}</p>
                  <p className="text-sm text-muted-foreground">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats ? `${stats.agent.loadPercentage}%` : "0%"}
                  </p>
                  <p className="text-sm text-muted-foreground">Load</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        {stats && (
          <Card className="bg-white/80 backdrop-blur-sm mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Handled</p>
                  <p className="text-2xl font-bold">{stats.metrics.totalChatsHandled}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold">
                    {formatDuration(stats.metrics.averageResponseTime)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Resolution</p>
                  <p className="text-2xl font-bold">
                    {formatDuration(stats.metrics.averageResolutionTime)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold">
                    {stats.metrics.averageRating > 0 
                      ? `${stats.metrics.averageRating.toFixed(1)}/5`
                      : "N/A"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sessions List with Tabs */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Support Sessions
            </CardTitle>
            <CardDescription>
              Users requesting human support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active">
                  Active ({pendingSessions.length + activeSessions.length})
                </TabsTrigger>
                <TabsTrigger value="resolved">
                  Resolved ({resolvedSessions.length})
                </TabsTrigger>
                <TabsTrigger value="all">
                  All ({sessions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                  </div>
                ) : (pendingSessions.length + activeSessions.length) === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-lg mb-1">No active sessions</h3>
                    <p className="text-muted-foreground text-sm">
                      New requests will appear here
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {[...pendingSessions, ...activeSessions].map((session) => (
                        <SessionCard 
                          key={session._id}
                          session={session}
                          onClick={handleSessionClick}
                          getStatusColor={getStatusColor}
                          formatTime={formatTime}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="resolved" className="mt-4">
                {resolvedSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="font-medium text-lg mb-1">No resolved sessions</h3>
                    <p className="text-muted-foreground text-sm">
                      Completed sessions will appear here
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {resolvedSessions.map((session) => (
                        <SessionCard 
                          key={session._id}
                          session={session}
                          onClick={handleSessionClick}
                          getStatusColor={getStatusColor}
                          formatTime={formatTime}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="all" className="mt-4">
                {sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="font-medium text-lg mb-1">No sessions yet</h3>
                    <p className="text-muted-foreground text-sm">
                      All sessions will appear here
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <SessionCard 
                          key={session._id}
                          session={session}
                          onClick={handleSessionClick}
                          getStatusColor={getStatusColor}
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
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground">
        Powered by TasteAI Studio
      </footer>
    </div>
  );
};

// Session Card Component
const SessionCard = ({ 
  session, 
  onClick, 
  getStatusColor, 
  formatTime 
}: {
  session: HandoffSession;
  onClick: (id: string) => void;
  getStatusColor: (status: string) => string;
  formatTime: (date: string) => string;
}) => (
  <div
    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
    onClick={() => onClick(session._id)}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate">{session.bot.name}</span>
          <Badge className={`${getStatusColor(session.status)} text-xs`}>
            {session.status}
          </Badge>
        </div>
        {session.userQuestion && (
          <p className="text-sm text-muted-foreground truncate mb-1">
            <User className="w-3 h-3 inline mr-1" />
            {session.userQuestion}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {session.messages.length} messages
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-muted-foreground">
          {formatTime(session.requestedAt)}
        </p>
        {session.status === "pending" && (
          <Badge variant="outline" className="text-xs mt-1 bg-yellow-50 text-yellow-700 border-yellow-200 animate-pulse">
            New
          </Badge>
        )}
      </div>
    </div>
  </div>
);

export default AgentDashboard;