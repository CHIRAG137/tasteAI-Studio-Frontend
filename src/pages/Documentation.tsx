import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Code2, 
  Copy, 
  ExternalLink,
  Settings,
  Check,
  Palette
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmbedCustomizer, EmbedCustomization } from "@/components/EmbedCustomizer";
import axios from "axios";

interface Bot {
  id: string;
  name: string;
  description: string;
}

export default function Documentation() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bot, setBot] = useState<Bot | null>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [customization, setCustomization] = useState<EmbedCustomization | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (botId) {
      fetchBot();
      loadCustomization();
    }
  }, [botId]);

  const fetchBot = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`);
      const botData = response.data;
      setBot({
        id: botData._id,
        name: botData.name,
        description: botData.description
      });
    } catch (error) {
      console.error("Error fetching bot:", error);
      toast({
        title: "Error",
        description: "Failed to load bot information",
        variant: "destructive"
      });
    }
  };

  const loadCustomization = () => {
    try {
      const saved = localStorage.getItem(`embed-customization-${botId}`);
      if (saved) {
        setCustomization(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading customization:", error);
    }
  };

  const copyToClipboard = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(type);
    toast({ title: "Copied!", description: `${type} code copied to clipboard` });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCustomizationSave = (newCustomization: EmbedCustomization) => {
    setCustomization(newCustomization);
  };

  if (!bot) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading bot information...</p>
        </div>
      </div>
    );
  }

  const embedUrl = `${window.location.origin}/embed?botId=${botId}`;
  
  const basicEmbedCode = `<!-- Basic Embed Code -->
<script src="https://tastebot-studio-backend-gvvb.onrender.com/widget.js"></script>
<script>
  ChatBotWidget.init({
    botId: "${botId}",
    apiUrl: "https://tastebot-studio.onrender.com",
    position: "bottom-right",
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

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Documentation</h1>
          <p className="text-muted-foreground">Integration guide for {bot.name}</p>
        </div>
      </div>

      {/* Bot Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              {bot.name}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCustomizerOpen(true)}
                className="flex items-center gap-2"
              >
                <Palette className="h-4 w-4" />
                Customize UI
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(embedUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Test Chat
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{bot.description}</p>
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-1">Embed URL:</p>
            <code className="text-sm bg-background px-2 py-1 rounded">{embedUrl}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(embedUrl, 'Embed URL')}
              className="ml-2 h-6 px-2"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Embed Code Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            Embed Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The simplest way to embed your chatbot. Choose between direct HTML integration or Google Tag Manager.
          </p>
          <CodeBlock code={basicEmbedCode} language="HTML" type="Basic Embed" />
          
          <Separator className="my-6" />
          
          <div className="space-y-4">
            <h4 className="font-semibold text-base">📋 Installation Instructions</h4>
            
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Method 1: Direct HTML Integration (For Developers)
              </h5>
              <ol className="text-sm space-y-2 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">1.</span>
                  <span>Open your website's <code className="bg-background px-1.5 py-0.5 rounded text-xs">index.html</code> file in a code editor</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">2.</span>
                  <span>Locate the <code className="bg-background px-1.5 py-0.5 rounded text-xs">&lt;body&gt;</code> tag in your HTML file</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">3.</span>
                  <span>Paste the embed code above just before the closing <code className="bg-background px-1.5 py-0.5 rounded text-xs">&lt;/body&gt;</code> tag</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">4.</span>
                  <span>Save the file and refresh your website</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">5.</span>
                  <span>The chatbot widget will appear at the bottom-right corner of your website</span>
                </li>
              </ol>
            </div>

            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
              <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Method 2: Google Tag Manager (No Coding Required)
              </h5>
              <ol className="text-sm space-y-2 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">1.</span>
                  <span>Log in to your <a href="https://tagmanager.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Tag Manager</a> account</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">2.</span>
                  <span>Select your website's container</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">3.</span>
                  <span>Click <strong>"Add a new tag"</strong> button</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">4.</span>
                  <span>Click on <strong>"Tag Configuration"</strong> and choose <strong>"Custom HTML"</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">5.</span>
                  <span>Copy and paste the embed code above into the HTML field</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">6.</span>
                  <span>Under <strong>"Triggering"</strong>, select <strong>"All Pages"</strong> to display the chatbot on every page</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">7.</span>
                  <span>Name your tag (e.g., "Chatbot Widget - {bot.name}")</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">8.</span>
                  <span>Click <strong>"Save"</strong> and then <strong>"Submit"</strong> to publish the changes</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">9.</span>
                  <span>The chatbot will appear on your website within a few minutes</span>
                </li>
              </ol>
            </div>
          </div>

          <Separator className="my-6" />
          
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">✨ Features:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Easy to implement - just copy and paste</li>
              <li>• Automatically positioned at bottom-right corner</li>
              <li>• Responsive design that works on all devices</li>
              <li>• Works on any website or platform</li>
              <li>• Secure iframe implementation</li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              💡 Pro Tip
            </h4>
            <p className="text-sm text-muted-foreground">
              For WordPress, Shopify, Wix, or Squarespace users: Use Google Tag Manager for the easiest installation without touching any code!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Customization Section */}
      {customization && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Current Customization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium">Header Title</p>
                <p className="text-muted-foreground">{customization.headerTitle}</p>
              </div>
              <div>
                <p className="font-medium">Primary Color</p>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: customization.primaryColor }}
                  />
                  <p className="text-muted-foreground">{customization.primaryColor}</p>
                </div>
              </div>
              <div>
                <p className="font-medium">Border Radius</p>
                <p className="text-muted-foreground">{customization.borderRadius}px</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsCustomizerOpen(true)}
              className="mt-4"
            >
              Edit Customization
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Customizer Modal */}
      <EmbedCustomizer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        botId={botId!}
        botName={bot.name}
        onSave={handleCustomizationSave}
        initialCustomization={customization || undefined}
      />
    </div>
  );
}
