import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Bot, Sparkles, User, Mic, Languages, Brain, Globe, MessageSquare, GitBranch, ArrowLeft } from "lucide-react";
import { BasicInfoSection } from "@/components/BotBuilder/BasicInfoSection";
import { VoiceSection } from "@/components/BotBuilder/VoiceSection";
import { LanguageSection } from "@/components/BotBuilder/LanguageSection";
import { PersonaSection } from "@/components/BotBuilder/PersonaSection";
import { WebsiteSection } from "@/components/BotBuilder/WebsiteSection";
import { SlackSection } from "@/components/BotBuilder/SlackSection";
import { ConversationFlowSection } from "@/components/BotBuilder/ConversationFlowSection";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/utils/auth";

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
  slackCommand: string;
  slackChannelId: string;
  conversationFlow: {
    nodes: any[];
    edges: any[];
  };
  scrapedMarkdown?: string[];
  scrapedUrls?: string[];
  existingScrapedUrls?: string[];
}

const EditBot = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
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
    slackCommand: "",
    slackChannelId: "",
    conversationFlow: { nodes: [], edges: [] },
    scrapedMarkdown: [],
    scrapedUrls: [],
    existingScrapedUrls: [],
  });

  useEffect(() => {
    const fetchBot = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`, {
          headers: getAuthHeaders(),
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch bot");
        }

        const data = await response.json();
        const bot = data.result;
        
        setBotConfig({
          name: bot.name || "",
          websiteUrl: bot.website_url || "",
          description: bot.description || "",
          file: null,
          voiceEnabled: bot.is_voice_enabled || false,
          languages: bot.supported_languages || ["English"],
          primaryPurpose: bot.primary_purpose || "",
          specializationArea: bot.specialisation_area || "",
          conversationalTone: bot.conversation_tone || "",
          responseStyle: bot.response_style || "",
          targetAudience: bot.target_audience || "",
          keyTopics: bot.key_topics || "",
          keywords: bot.keywords || "",
          customInstructions: bot.custom_instructions || "",
          isSlackEnabled: bot.is_slack_enabled || false,
          slackCommand: bot.slack_command || "",
          slackChannelId: bot.slack_channel_id || "",
          conversationFlow: bot.conversationFlow || { nodes: [], edges: [] },
          scrapedMarkdown: [],
          scrapedUrls: [],
          existingScrapedUrls: bot.scraped_urls || [],
        });
      } catch (error) {
        console.error("Error fetching bot:", error);
        toast({
          title: "Error",
          description: "Failed to load bot details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBot();
  }, [botId, toast]);

  const updateConfig = (field: keyof BotConfig, value: any) => {
    setBotConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("name", botConfig.name);
      formData.append("website_url", botConfig.websiteUrl);
      formData.append("description", botConfig.description);
      formData.append("is_voice_enabled", botConfig.voiceEnabled.toString());
      formData.append("is_auto_translate", "false");
      formData.append("supported_languages", JSON.stringify(botConfig.languages));
      formData.append("primary_purpose", botConfig.primaryPurpose);
      formData.append("specialisation_area", botConfig.specializationArea);
      formData.append("conversation_tone", botConfig.conversationalTone);
      formData.append("response_style", botConfig.responseStyle);
      formData.append("target_audience", botConfig.targetAudience);
      formData.append("key_topics", botConfig.keyTopics);
      formData.append("keywords", botConfig.keywords);
      formData.append("custom_instructions", botConfig.customInstructions);
      formData.append("is_slack_enabled", botConfig.isSlackEnabled.toString());
      formData.append("slack_command", botConfig.slackCommand);
      formData.append("slack_channel_id", botConfig.slackChannelId);
      formData.append("conversationFlow", JSON.stringify(botConfig.conversationFlow));

      // Add new scraped markdown data if available
      if (botConfig.scrapedMarkdown && botConfig.scrapedMarkdown.length > 0) {
        formData.append("scraped_content", JSON.stringify(botConfig.scrapedMarkdown));
      }

      // Add new scraped URLs if available (will be merged with existing ones in backend)
      if (botConfig.scrapedUrls && botConfig.scrapedUrls.length > 0) {
        formData.append("scraped_urls", JSON.stringify(botConfig.scrapedUrls));
      }

      if (botConfig.file) {
        formData.append("file", botConfig.file);
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update bot");
      }

      toast({
        title: "Bot Updated Successfully!",
        description: result.message || `${botConfig.name} has been updated successfully.`,
      });

      navigate("/");
    } catch (error) {
      console.error("Error updating bot:", error);
      toast({
        title: "Error Updating Bot",
        description: error instanceof Error ? error.message : "Failed to update bot. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Bot className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">Loading bot details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="shadow-strong border-0">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-primary rounded-xl shadow-medium">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Edit Bot
                </CardTitle>
                <CardDescription className="text-base">
                  Update your bot's configuration and settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
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
              
              <CollapsibleSection title="Slack Integration" icon={<MessageSquare className="w-5 h-5 text-primary" />}>
                <SlackSection botConfig={botConfig} updateConfig={updateConfig} />
              </CollapsibleSection>
              
              <ConversationFlowSection 
                botId={botId}
                onFlowChange={(nodes, edges) => {
                  updateConfig("conversationFlow", { nodes, edges });
                }}
                initialNodes={botConfig.conversationFlow.nodes}
                initialEdges={botConfig.conversationFlow.edges}
              />

              <div className="flex justify-end gap-3 pt-6">
                <Button type="button" variant="outline" onClick={() => navigate("/")}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  className="bg-gradient-primary hover:opacity-90 shadow-medium px-8"
                >
                  <Bot className="w-5 h-5 mr-2" />
                  Update Bot
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditBot;
