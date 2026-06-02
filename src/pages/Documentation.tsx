import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code2,
  Copy,
  Settings,
  Check,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmbedCustomization } from "@/components/EmbedCustomizer";
import { Navbar } from "@/components/Navbar";
import axios from "axios";
import { getAuthHeaders } from "@/utils/auth";

interface Bot {
  id: string;
  name: string;
  description: string;
}

interface FoundUrl {
  url: string;
  selected: boolean;
}

export default function Documentation() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bot, setBot] = useState<Bot | null>(null);
  const [customization, setCustomization] = useState<EmbedCustomization | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Page control state
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [foundUrls, setFoundUrls] = useState<FoundUrl[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPageControl, setShowPageControl] = useState(false);

  useEffect(() => {
    if (botId) {
      fetchBot();
    }
  }, [botId]);

  const fetchBot = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`,
        { headers: getAuthHeaders() }
      );
      const botData = response.data.result;
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

  const searchUrls = async () => {
    if (!websiteUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a website URL",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/scrape/search-urls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: websiteUrl,
          limit: 50,
          includeSubdomains: true,
          ignoreSitemap: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const urls = data.result.links.map((url: string) => ({
          url,
          selected: false,
        }));
        setFoundUrls(urls);
        toast({
          title: "URLs Found",
          description: `Found ${urls.length} URLs on your website`,
        });
      } else {
        throw new Error(data.error || "Failed to search URLs");
      }
    } catch (error) {
      console.error("Error searching URLs:", error);
      toast({
        title: "Error",
        description: "Failed to search website URLs",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleUrlSelection = (index: number) => {
    setFoundUrls(prev =>
      prev.map((url, i) =>
        i === index ? { ...url, selected: !url.selected } : url
      )
    );
  };

  const selectAllUrls = () => {
    setFoundUrls(prev => prev.map(url => ({ ...url, selected: true })));
  };

  const deselectAllUrls = () => {
    setFoundUrls(prev => prev.map(url => ({ ...url, selected: false })));
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

  const selectedUrls = foundUrls.filter(u => u.selected);
  const hasSelectedUrls = selectedUrls.length > 0;

  // Generate allowed pages array for the code - convert full URLs to paths
  const allowedPagesArray = hasSelectedUrls
    ? selectedUrls.map(u => {
      try {
        const urlObj = new URL(u.url);
        return `"${urlObj.pathname}"`;
      } catch {
        return `"${u.url}"`;
      }
    }).join(',\n      ')
    : '';

  const basicEmbedCode = `<!-- Basic Embed Code (Shows on All Pages) -->
<script src="https://tastebot-studio-backend-gvvb.onrender.com/widget.js"></script>
<script>
  ChatBotWidget.init({
    botId: "${botId}",
    apiUrl: "https://tastebot-studio.onrender.com",
    position: "bottom-right",
  });
</script>`;

  const restrictedEmbedCode = hasSelectedUrls ? `<!-- Restricted Embed Code (Shows Only on Selected Pages) -->
<script src="https://tastebot-studio-backend-gvvb.onrender.com/widget.js"></script>
<script>
  ChatBotWidget.init({
    botId: "${botId}",
    apiUrl: "https://tastebot-studio.onrender.com",
    position: "bottom-right",
    allowedPages: [
      ${allowedPagesArray}
    ]
  });
</script>` : '';

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
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar pageTitle={bot?.name ? `Integration Guide - ${bot.name}` : "Integration Guide"} />

      {/* Main Content */}
      <Tabs defaultValue="normal-integration" orientation="vertical" className="flex-1 min-h-0 flex flex-col md:flex-row">
          <TabsList className="h-auto w-full md:w-72 md:h-full md:flex-col md:items-stretch md:justify-start rounded-none p-3 gap-1 border-b md:border-b-0 md:border-r border-border/60 bg-muted/30 shrink-0">
            <TabsTrigger value="normal-integration" className="w-full justify-start text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400">
              Normal Integration
            </TabsTrigger>
            <TabsTrigger value="advanced-integration" className="w-full justify-start text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400">
              Advanced Integration
            </TabsTrigger>
            <TabsTrigger
              value="customise-ui"
              onClick={() => navigate(`/customize/${botId}`)}
              className="w-full justify-start text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400"
            >
              Customise UI
            </TabsTrigger>
            <TabsTrigger
              value="test-embed-bot-ui"
              onClick={() => navigate(`/test/${botId}`)}
              className="w-full justify-start text-left rounded-md px-3 py-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-purple-500 dark:data-[state=active]:to-cyan-400"
            >
              Test UI
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-w-0 overflow-y-auto px-4 py-6 md:px-8 lg:px-10">
            <TabsContent value="normal-integration" className="mt-0">
              <Card className="mb-6 border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-primary" />
                    Quick Start - Embed Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-start gap-2 mb-3">
                      <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Default Configuration</p>
                        <p className="text-muted-foreground text-sm">
                          This code will display your chatbot on every page of your website.
                        </p>
                      </div>
                    </div>
                    <CodeBlock code={basicEmbedCode} language="HTML" type="Basic Embed" />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold text-base">Installation Instructions</h4>

                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                      <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Code2 className="h-4 w-4" />
                        Method 1: Direct HTML Integration
                      </h5>
                      <ol className="text-sm space-y-2 text-muted-foreground">
                        <li className="flex gap-2"><span className="font-semibold text-foreground">1.</span><span>Copy the embed code above</span></li>
                        <li className="flex gap-2"><span className="font-semibold text-foreground">2.</span><span>Paste it before the closing <code className="bg-background px-1.5 py-0.5 rounded text-xs">&lt;/body&gt;</code> tag</span></li>
                        <li className="flex gap-2"><span className="font-semibold text-foreground">3.</span><span>Save and refresh your website</span></li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced-integration" className="mt-0">
              <Card className="mb-6 border-border/60 shadow-sm">
                <CardHeader>
                  <div className="space-y-2">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Advanced: Page Control
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowPageControl(!showPageControl)}
                      >
                        {showPageControl ? "Hide" : "Show"} Page Selector
                      </Button>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Display your chatbot only on selected website pages.
                    </p>
                  </div>
                </CardHeader>
                {showPageControl && (
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter your website URL (e.g., https://example.com)"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={searchUrls}
                        disabled={isSearching}
                        className="flex items-center gap-2"
                      >
                        {isSearching ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4" />
                            Find Pages
                          </>
                        )}
                      </Button>
                    </div>

                    {foundUrls.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            Found {foundUrls.length} pages ({selectedUrls.length} selected)
                          </p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={selectAllUrls}>
                              Select All
                            </Button>
                            <Button variant="outline" size="sm" onClick={deselectAllUrls}>
                              Deselect All
                            </Button>
                          </div>
                        </div>

                        <div className="border rounded-lg max-h-64 overflow-y-auto">
                          {foundUrls.map((urlObj, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                              onClick={() => toggleUrlSelection(index)}
                            >
                              <div className="flex-shrink-0">
                                {urlObj.selected ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <span className="text-sm truncate flex-1">{urlObj.url}</span>
                            </div>
                          ))}
                        </div>

                        {hasSelectedUrls && (
                          <CodeBlock code={restrictedEmbedCode} language="HTML" type="Custom Embed" />
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              <Card className="mb-6 border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-primary" />
                    Advanced Configuration Examples
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Example 1</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                      <code>{`ChatBotWidget.init({
  botId: "${botId}",
  apiUrl: "https://tastebot-studio.onrender.com",
  position: "bottom-right",
  allowedPages: ["/products/*", "/blog/*"]
});`}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </div>
      </Tabs>
    </div>
  );
}
