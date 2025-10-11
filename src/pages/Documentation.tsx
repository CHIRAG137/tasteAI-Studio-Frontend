import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Code2, 
  Globe, 
  Palette, 
  Copy, 
  ExternalLink,
  Settings,
  Check
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
<iframe 
  src="${embedUrl}"
  width="400" 
  height="600"
  frameborder="0"
  style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
</iframe>`;

  const advancedEmbedCode = `<!-- Advanced Embed with Custom Styling -->
<div id="chatbot-container">
  <iframe 
    src="${embedUrl}"
    width="100%" 
    height="500"
    frameborder="0"
    style="border-radius: 12px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);">
  </iframe>
</div>

<style>
#chatbot-container {
  max-width: 400px;
  margin: 20px auto;
  padding: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
}

@media (max-width: 768px) {
  #chatbot-container {
    max-width: 100%;
    margin: 10px;
  }
  
  #chatbot-container iframe {
    height: 400px;
  }
}
</style>`;

  const jsIntegrationCode = `<!-- JavaScript Integration -->
<div id="chatbot-widget"></div>

<script>
function loadChatbot() {
  const container = document.getElementById('chatbot-widget');
  const iframe = document.createElement('iframe');
  
  iframe.src = '${embedUrl}';
  iframe.width = '400';
  iframe.height = '600';
  iframe.frameBorder = '0';
  iframe.style.borderRadius = '8px';
  iframe.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  
  container.appendChild(iframe);
  
  // Optional: Add custom styling or events
  iframe.onload = function() {
    console.log('Chatbot loaded successfully');
  };
}

// Load when page is ready
document.addEventListener('DOMContentLoaded', loadChatbot);
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
    <div className="container mx-auto p-6 max-w-6xl">
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

      {/* Integration Methods */}
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Embed</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Styling</TabsTrigger>
          <TabsTrigger value="javascript">JavaScript Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Basic HTML Embed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The simplest way to embed your chatbot. Just copy and paste this code into your HTML.
              </p>
              <CodeBlock code={basicEmbedCode} language="HTML" type="Basic Embed" />
              
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Features:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Easy to implement - just copy and paste</li>
                  <li>• Responsive design</li>
                  <li>• Works on any website</li>
                  <li>• Secure iframe implementation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Advanced Styling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Enhanced embed with custom styling and responsive design.
              </p>
              <CodeBlock code={advancedEmbedCode} language="HTML + CSS" type="Advanced Embed" />
              
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Additional Features:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Custom container styling</li>
                  <li>• Gradient backgrounds</li>
                  <li>• Responsive breakpoints</li>
                  <li>• Enhanced shadows and borders</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="javascript" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />
                JavaScript Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Dynamic loading with JavaScript for more control and customization.
              </p>
              <CodeBlock code={jsIntegrationCode} language="JavaScript" type="JS Integration" />
              
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Benefits:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Dynamic loading</li>
                  <li>• Event handling</li>
                  <li>• Conditional loading</li>
                  <li>• Custom initialization</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Customization Section */}
      {customization && (
        <Card className="mt-6">
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