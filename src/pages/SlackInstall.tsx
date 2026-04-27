import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getAuthHeaders, getAuthToken, isAuthenticated } from "@/utils/auth";
import { API_BASE_URL } from "@/api/auth";
import {
  ArrowLeft,
  Slack,
  CheckCircle2,
  Shield,
  Zap,
  MessageSquare,
  Users,
  Hash,
  ExternalLink,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Slash Commands",
    description: "Create custom commands that trigger your workflows",
  },
  {
    icon: MessageSquare,
    title: "Interactive Messages",
    description: "Send approval buttons, forms, and rich messages",
  },
  {
    icon: Hash,
    title: "Channel Monitoring",
    description: "Listen for keywords and route messages automatically",
  },
  {
    icon: Users,
    title: "User Management",
    description: "Assign tasks and manage approvals across your team",
  },
];

const permissions = [
  "Send messages to channels",
  "Read messages in channels where the app is added",
  "Create and manage slash commands",
  "Post interactive message components",
  "Access user profile information",
  "Manage workflow data",
];

export default function SlackInstall() {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [workspace, setWorkspace] = useState<{ name: string; icon?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      setIsLoading(true);
      setHasError(false);

      if (!isAuthenticated()) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to load Slack status');
        }

        const data = await response.json();
        const slackIntegration = data.result?.slackIntegration;
        setIsConnected(!!slackIntegration);
        setWorkspace(slackIntegration ? { name: slackIntegration.teamName } : null);
      } catch (error) {
        console.error('Failed to fetch Slack integration status:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [navigate]);

  const handleInstall = () => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    window.location.href = `${API_BASE_URL}/api/slack/install?token=${token}`;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/workflows")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Workflows
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#4A154B]/10">
                <Slack className="h-5 w-5 text-[#4A154B]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Slack Workspace</h1>
                <p className="text-sm text-muted-foreground">Connect and manage your workspace</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Connection Status */}
        <Card className={isConnected ? "border-emerald-200 bg-emerald-50/50" : ""}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${isConnected ? "bg-emerald-100" : "bg-[#4A154B]/10"}`}>
                  <Slack className={`w-8 h-8 ${isConnected ? "text-emerald-600" : "text-[#4A154B]"}`} />
                </div>
                <div>
                  {isConnected ? (
                    <>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-foreground">{workspace?.name}</h2>
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your Slack workspace is connected and ready to use
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-foreground">Connect Your Workspace</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Install our app to your Slack workspace to enable workflows
                      </p>
                    </>
                  )}
                </div>
              </div>
              {isConnected ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleInstall} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Reconnect
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/workflows/create")}
                    className="bg-gradient-primary gap-2"
                  >
                    Create Workflow
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleInstall}
                  size="lg"
                  className="bg-[#4A154B] hover:bg-[#3a1039] text-white gap-2 px-6"
                >
                  <Slack className="w-5 h-5" />
                  Add to Slack
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">What You Can Do</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <Card key={f.title} className="border-border/50">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{f.title}</h4>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Permissions Required
            </CardTitle>
            <CardDescription>
              The app will request the following permissions in your Slack workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {permissions.map((p) => (
                <div key={p} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-foreground">{p}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security note */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 flex items-start gap-4">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">Security & Privacy</h4>
              <p className="text-sm text-muted-foreground">
                We only access the channels you explicitly configure. Your messages and data are encrypted
                in transit and at rest. You can revoke access at any time from your Slack workspace settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
