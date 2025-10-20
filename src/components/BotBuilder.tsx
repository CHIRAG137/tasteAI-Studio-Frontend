import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Bot, Sparkles, User, Globe, Mic, Languages, Brain, MessageSquare } from "lucide-react";
import { BasicInfoSection } from "./BotBuilder/BasicInfoSection";
import { WebsiteSection } from "./BotBuilder/WebsiteSection";
import { VoiceSection } from "./BotBuilder/VoiceSection";
import { LanguageSection } from "./BotBuilder/LanguageSection";
import { PersonaSection } from "./BotBuilder/PersonaSection";
import { SlackSection } from "./BotBuilder/SlackSection";
import { ConversationFlowSection } from "./BotBuilder/ConversationFlowSection";
import { Node, Edge } from '@xyflow/react';
import { useToast } from "@/hooks/use-toast";
import { BotCard } from "@/components/BotCard";
import { ChatBot } from "@/components/ChatBot";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders, isAuthenticated } from "@/utils/auth";
import { Navbar } from "@/components/Navbar";

interface BotConfig {
  name: string;
  websiteUrl: string;
  description: string;
  file: File | null;
  voiceEnabled: boolean;
  languages: string[];
  primaryPurpose: string;
  specializationArea: string;
  conversationalTone: string;
  responseStyle: string;
  targetAudience: string;
  keyTopics: string;
  keywords: string;
  customInstructions: string;
  isSlackEnabled: boolean;
  slackChannelId: string;
  conversationFlow?: { nodes: Node[]; edges: Edge[] };
  scrapedMarkdown?: string[];
  scrapedUrls?: string[]
}

export const BotBuilder = () => {
  const navigate = useNavigate();

  const { toast } = useToast();
  const [savedBots, setSavedBots] = useState<any[]>([]);
  const [selectedBotForTest, setSelectedBotForTest] = useState<any | null>(null);
  const [visibleBotCount, setVisibleBotCount] = useState(3);
  const [isCreatingBot, setIsCreatingBot] = useState(false);
  const [creatingBot, setCreatingBot] = useState<any | null>(null);
  const [progress, setProgress] = useState(0);

  const handleShowMore = () => {
    setVisibleBotCount(prev => Math.min(prev + 3, savedBots.length));
  };

  const handleShowLess = () => {
    setVisibleBotCount(3);
  };

  const [botConfig, setBotConfig] = useState<BotConfig>({
    name: "",
    websiteUrl: "",
    description: "",
    file: null,
    voiceEnabled: false,
    languages: ["English"],
    primaryPurpose: "",
    specializationArea: "",
    conversationalTone: "",
    responseStyle: "",
    targetAudience: "",
    keyTopics: "",
    keywords: "",
    customInstructions: "",
    isSlackEnabled: false,
    slackChannelId: "",
    conversationFlow: {
      nodes: [
        {
          id: '1',
          type: 'message',
          position: { x: 250, y: 50 },
          data: {
            label: 'Welcome Message',
            type: 'message',
            message: 'Hello! I\'m here to help you. Let\'s start by getting some information.'
          },
        },
      ],
      edges: []
    },
  });

  const fetchBots = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const bots = data.result.bots.map((bot: any) => ({
          id: bot._id,
          name: bot.name,
          description: bot.description,
          websiteUrl: bot.website_url,
          voiceEnabled: bot.is_voice_enabled,
          languages: Array.isArray(bot.supported_languages) ? bot.supported_languages : ["English"],
          primaryPurpose: bot.primary_purpose,
          conversationalTone: bot.conversation_tone,
          conversationFlow: bot.conversationFlow
        }));
        setSavedBots(bots.reverse());
      } else {
        const errorText = await res.text();
        console.error("Failed to load bots:", errorText);
      }
    } catch (err) {
      console.error("Error fetching bots:", err);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const updateConfig = (field: keyof BotConfig, value: any) => {
    setBotConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    if (isCreatingBot) return; // prevent duplicate clicks

    try {
      setIsCreatingBot(true);
      setProgress(5);

      // Create temporary “bot is being created” card
      const tempBot = {
        id: "temp",
        name: botConfig.name || "New Bot",
        description: "Bot is being created. Please wait...",
        websiteUrl: botConfig.websiteUrl,
        voiceEnabled: botConfig.voiceEnabled,
        languages: botConfig.languages,
        primaryPurpose: botConfig.primaryPurpose,
        conversationalTone: botConfig.conversationalTone,
        isLoading: true,
      };

      setCreatingBot(tempBot);
      setSavedBots(prev => [tempBot, ...prev]);

      // Simulate progress bar while backend works
      const progressInterval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 5 : prev));
      }, 1000);

      const formData = new FormData();
      Object.entries({
        name: botConfig.name,
        website_url: botConfig.websiteUrl,
        description: botConfig.description,
        is_voice_enabled: botConfig.voiceEnabled.toString(),
        is_auto_translate: "false",
        supported_languages: JSON.stringify(botConfig.languages),
        primary_purpose: botConfig.primaryPurpose,
        specialisation_area: botConfig.specializationArea,
        conversation_tone: botConfig.conversationalTone,
        response_style: botConfig.responseStyle,
        target_audience: botConfig.targetAudience,
        key_topics: botConfig.keyTopics,
        keywords: botConfig.keywords,
        custom_instructions: botConfig.customInstructions,
        is_slack_enabled: botConfig.isSlackEnabled.toString(),
        slack_channel_id: botConfig.slackChannelId,
        conversationFlow: JSON.stringify(botConfig.conversationFlow || { nodes: [], edges: [] }),
      }).forEach(([key, value]) => formData.append(key, value as string));

      if (botConfig.scrapedMarkdown?.length)
        formData.append("scraped_content", JSON.stringify(botConfig.scrapedMarkdown));
      if (botConfig.scrapedUrls?.length)
        formData.append("scraped_urls", JSON.stringify(botConfig.scrapedUrls));
      if (botConfig.file) formData.append("file", botConfig.file);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/create`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create bot");

      toast({
        title: "Bot Created Successfully!",
        description: result.message || `${botConfig.name} has been created successfully.`,
      });

      // Replace temp bot with real one
      await fetchBots();

      setCreatingBot(null);
    } catch (error) {
      console.error("Error creating bot:", error);
      toast({
        title: "Error Creating Bot",
        description: error instanceof Error ? error.message : "Failed to create bot. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBot(false);
      setProgress(0);
    }
  };

  const handleTest = (id: string) => {
    const bot = savedBots.find(b => b.id === id);
    if (bot) setSelectedBotForTest(bot);
  };

  const handleShare = (botId: string) => {
    const shareUrl = `${window.location.origin}/bot/${botId}`;
    navigator.clipboard.writeText(shareUrl);
    alert(`Shareable link copied:\n${shareUrl}`);
  };


  const handleIntegrate = (id: string) => {
    navigate(`/docs/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/edit/${id}`);
  };

  const handleSessions = (id: string) => {
    navigate(`/sessions/${id}`);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete bot");
      }

      // Remove bot from UI list
      setSavedBots(prev => prev.filter(bot => bot.id !== id));

      toast({
        title: "Bot Deleted",
        description: data.message || "Bot and its data were deleted successfully.",
      });
    } catch (error) {
      console.error("Delete bot error:", error);
      toast({
        title: "Error Deleting Bot",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background py-12 px-4">
        <div id="bot-builder" className="max-w-4xl mx-auto space-y-8 scroll-mt-20">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl shadow-medium mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              tasteAI Studio
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create intelligent, customized AI bots tailored to your specific needs.
              Configure everything from personality to capabilities with our intuitive builder.
            </p>
          </div>

          <Card className="shadow-strong border-0">
            <CardHeader className="space-y-1 pb-8">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                Configure Your Bot
              </CardTitle>
              <CardDescription className="text-base">
                Fill in the details below to create your custom AI assistant
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <CollapsibleSection title="Basic Information" icon={<User className="w-5 h-5 text-primary" />} defaultOpen={true}>
                  <BasicInfoSection botConfig={botConfig} updateConfig={updateConfig} />
                </CollapsibleSection>
                <CollapsibleSection title="Website & Content" icon={<Globe className="w-5 h-5 text-primary" />}>
                  <WebsiteSection botConfig={botConfig} updateConfig={updateConfig} />
                </CollapsibleSection>
                <CollapsibleSection title="Voice Configuration" icon={<Mic className="w-5 h-5 text-primary" />}>
                  <VoiceSection botConfig={botConfig} updateConfig={updateConfig} />
                </CollapsibleSection>
                <CollapsibleSection title="Language Support" icon={<Languages className="w-5 h-5 text-primary" />}>
                  <LanguageSection botConfig={botConfig} updateConfig={updateConfig} />
                </CollapsibleSection>
                <CollapsibleSection title="Persona & Behavior" icon={<Brain className="w-5 h-5 text-primary" />}>
                  <PersonaSection botConfig={botConfig} updateConfig={updateConfig} />
                </CollapsibleSection>
                <CollapsibleSection title="Add Bot to Slack Channel" icon={<MessageSquare className="w-5 h-5 text-primary" />}>
                  <SlackSection botConfig={botConfig} updateConfig={updateConfig} />
                </CollapsibleSection>

                <ConversationFlowSection
                  onFlowSave={(nodes, edges) => {
                    updateConfig('conversationFlow', { nodes, edges });
                    toast({
                      title: "Flow Saved",
                      description: "Conversation flow has been saved to your bot configuration.",
                    });
                  }}
                  onFlowChange={(nodes, edges) => {
                    // Auto-update the bot config whenever the flow changes
                    updateConfig('conversationFlow', { nodes, edges });
                  }}
                  initialNodes={botConfig.conversationFlow?.nodes}
                  initialEdges={botConfig.conversationFlow?.edges}
                />

                <div className="flex justify-end pt-6">
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-gradient-primary hover:opacity-90 shadow-medium px-8 py-3 text-lg font-semibold"
                  >
                    <Bot className="w-5 h-5 mr-2" />
                    Create Bot
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {savedBots.length > 0 && (
          <div id="your-bots" className="w-full px-4 py-12 scroll-mt-20">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-foreground">Your Bots</h2>
                <p className="text-lg text-muted-foreground">
                  Manage and interact with your created AI assistants
                </p>
              </div>

              {/* Show only a limited number of bots */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedBots.slice(0, visibleBotCount).map(bot => (
                  <BotCard
                    key={bot.id}
                    bot={bot.id === "temp" ? { ...bot, progress } : bot}
                    onTest={handleTest}
                    onShare={handleShare}
                    onIntegrate={handleIntegrate}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onSessions={handleSessions}
                  />
                ))}
              </div>

              {/* Show More / Show Less buttons */}
              <div className="flex justify-center gap-4 pt-6">
                {visibleBotCount < savedBots.length && (
                  <Button onClick={handleShowMore} variant="outline">
                    Show More
                  </Button>
                )}
                {visibleBotCount > 3 && (
                  <Button onClick={handleShowLess} variant="ghost">
                    Show Less
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedBotForTest && (
        <ChatBot bot={selectedBotForTest} onClose={() => setSelectedBotForTest(null)} />
      )}
    </>
  );
};
