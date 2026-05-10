import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, Code2, Globe, Server, Check, Palette, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  botName: string;
}

export const IntegrationModal = ({ isOpen, onClose, botId, botName }: IntegrationModalProps) => {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const backendSDKCode = `// Install the SDK
npm install your-chatbot-sdk

// Initialize and use the SDK
import { ChatBotSDK } from 'your-chatbot-sdk';

const chatBot = new ChatBotSDK({
  botId: "${botId}",
  apiUrl: "import.meta.env.VITE_BACKEND_URL",
  apiKey: "your-api-key" // Get this from your dashboard
});

// Send a message
const response = await chatBot.sendMessage({
  message: "Hello, how can you help me?",
  userId: "user-123",
  sessionId: "session-456"
});

console.log(response.reply);`;

  const reactComponentCode = `// Install React component
npm install @your-org/react-chatbot

// Use in your React app
import { ChatBotWidget } from '@your-org/react-chatbot';

function App() {
  return (
    <div>
      {/* Your app content */}
      
      <ChatBotWidget
        botId="${botId}"
        apiUrl="import.meta.env.VITE_BACKEND_URL"
        theme="modern"
        position="bottom-right"
        primaryColor="#3b82f6"
        headerTitle="${botName}"
        welcomeMessage="Hi! How can I help you today?"
      />
    </div>
  );
}`;

  const uiCustomizationCode = `ChatBotWidget.init({
  botId: "${botId}",
  apiUrl: "${import.meta.env.VITE_FRONTEND_URL}",
  theme: "modern",
  position: "bottom-right",
  triggerLabel: "Ask ${botName}",
  primaryColor: "#7c3aed",
  secondaryColor: "#1f2937",
  headerTitle: "${botName} Assistant",
  headerSubtitle: "Typically replies in a few seconds",
  placeholder: "Ask anything...",
  borderRadius: "14px",
  showAvatar: true,
  welcomeMessage: "Welcome! I can guide you through interactive flows."
});`;

  const testEmbedCode = `<iframe
  src="${import.meta.env.VITE_FRONTEND_URL}/embed/${botId}?mode=interactive"
  title="${botName} interactive embed"
  width="100%"
  height="720"
  style="border:1px solid #e5e7eb;border-radius:12px;background:#fff;"
  allow="microphone"
></iframe>`;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Code2 className="h-6 w-6 text-primary" />
            Integrate {botName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="normal-integration" orientation="vertical" className="space-y-0">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <TabsList className="h-auto w-full md:w-64 md:flex-col md:items-stretch md:justify-start rounded-lg p-1">
              <TabsTrigger value="normal-integration" className="w-full justify-start text-left">
                Normal Integration
              </TabsTrigger>
              <TabsTrigger value="advanced-integration" className="w-full justify-start text-left">
                Advanced Integration
              </TabsTrigger>
              <TabsTrigger value="customise-ui" className="w-full justify-start text-left">
                Customise UI
              </TabsTrigger>
              <TabsTrigger value="test-embed-bot-ui" className="w-full justify-start text-left">
                Test Embed Bot UI
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-w-0">
              <TabsContent value="normal-integration" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      Normal Integration
                    </CardTitle>
                    <CardDescription>
                      Add a floating chat widget to any website with a simple script include.
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
              </TabsContent>

              <TabsContent value="advanced-integration" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-primary" />
                      Advanced Integration
                    </CardTitle>
                    <CardDescription>
                      Use SDKs and React components for deeper app-level integrations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CodeBlock code={backendSDKCode} language="JavaScript" type="Backend SDK" />
                    <CodeBlock code={reactComponentCode} language="React" type="React Component" />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="customise-ui" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-primary" />
                      Customise UI
                    </CardTitle>
                    <CardDescription>
                      Tune branding, colors, copy, and interactive behavior to match your product.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CodeBlock code={uiCustomizationCode} language="JavaScript" type="UI Customization" />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="test-embed-bot-ui" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      Test Embed Bot UI for Interactive Screens
                    </CardTitle>
                    <CardDescription>
                      Embed the bot in a full-screen test surface to validate interactive flows.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CodeBlock code={testEmbedCode} language="HTML" type="Test Embed" />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.open(`/docs/${botId}`, '_blank')}>
            View Full Documentation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};