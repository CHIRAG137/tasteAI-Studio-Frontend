import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Code2, Globe, Check, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/utils/auth";

export default function Integration() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [botName, setBotName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBotInfo = async () => {
      if (!botId) return;
      
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          const bot = data.result.bots.find((b: any) => b._id === botId);
          if (bot) {
            setBotName(bot.name);
          }
        }
      } catch (error) {
        console.error("Error fetching bot info:", error);
        toast({
          title: "Error",
          description: "Failed to load bot information",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBotInfo();
  }, [botId]);

  const copyToClipboard = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(type);
    toast({ title: "Copied!", description: `${type} code copied to clipboard` });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const webWidgetCode = `<!-- Add this script tag to your HTML -->
<script src="${import.meta.env.VITE_BACKEND_URL}/widget.js"></script>
<script>
  ChatBotWidget.init({
    botId: "${botId}",
    apiUrl: "${import.meta.env.VITE_FRONTEND_URL}",
    theme: "modern",
    position: "bottom-right",
    triggerLabel: "Chat with ${botName}",
    primaryColor: "#3b82f6",
    headerTitle: "${botName}",
    placeholder: "Type your message...",
    welcomeMessage: "Hi! How can I help you today?"
  });
</script>`;

  const CodeBlock = ({ code, language, type }: { code: string; language: string; type: string }) => (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-xs">
          {language}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(code, type)}
          className="h-8 px-2"
        >
          {copiedCode === type ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Code2 className="h-8 w-8 text-primary" />
            Integrate {botName}
          </h1>
          <p className="text-muted-foreground">
            Add your bot to your website with just a few lines of code
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 h-5 text-primary" />
              Web Widget Integration
            </CardTitle>
            <CardDescription>
              Add a floating chat widget to any website with just a few lines of code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Step 1: Add the script to your HTML</h4>
              <CodeBlock code={webWidgetCode} language="HTML" type="Web Widget" />
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Features:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Floating chat widget with customizable position</li>
                <li>• Responsive design for mobile and desktop</li>
                <li>• Customizable colors and branding</li>
                <li>• Auto-expanding chat window</li>
                <li>• Session persistence</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
