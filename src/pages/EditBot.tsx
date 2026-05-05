import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot } from "lucide-react";
import { BotCreationWizard } from "@/components/BotBuilder/BotCreationWizard";
import { Node, Edge } from "@xyflow/react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/utils/auth";
import { motion } from "framer-motion";
import { useBotCreation } from "@/contexts/BotCreationContext";

interface TrainingFileMeta {
  originalname: string;
  mimeType: string;
  size: number;
  hash: string;
  path?: string;
}

interface BotConfig {
  name: string;
  websiteUrl: string;
  description: string;
  files: File[];
  existingTrainingFiles: TrainingFileMeta[];
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
  conversationFlow: { nodes: Node[]; edges: Edge[] };
  scrapedMarkdown?: string[];
  scrapedUrls?: string[];
  existingScrapedUrls?: string[];
  isVideoBot: boolean;
  videoBotImageUrl?: string;
  videoBotImagePublicId?: string;
  humanHandoffEnabled?: boolean;
  humanHandoffEmails?: string;
  customLLMProvider?: string | null;
  customApiKey?: string;
  customModel?: string;
}

const EditBot = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { startBotCreation, updateBotProgress, completeBotCreation } = useBotCreation();
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);

  const [botConfig, setBotConfig] = useState<BotConfig>({
    name: "",
    websiteUrl: "",
    description: "",
    files: [],
    existingTrainingFiles: [],
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
    conversationFlow: { nodes: [], edges: [] },
    scrapedMarkdown: [],
    scrapedUrls: [],
    existingScrapedUrls: [],
    isVideoBot: false,
    videoBotImageUrl: "",
    videoBotImagePublicId: "",
    humanHandoffEnabled: false,
    humanHandoffEmails: "",
    customLLMProvider: null,
    customApiKey: "",
    customModel: "",
  });

  useEffect(() => {
    const fetchBot = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`,
          { headers: getAuthHeaders() }
        );
        if (!res.ok) throw new Error("Failed to fetch bot");
        const data = await res.json();
        const bot = data.result;

        setBotConfig({
          name: bot.name || "",
          websiteUrl: bot.website_url || "",
          description: bot.description || "",
          files: [],
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
          slackChannelId: bot.slack_channel_id || "",
          conversationFlow: bot.conversationFlow || { nodes: [], edges: [] },
          scrapedMarkdown: [],
          scrapedUrls: [],
          existingScrapedUrls: bot.scraped_urls || [],
          existingTrainingFiles: bot.training_files || [],
          isVideoBot: bot.is_video_bot || false,
          videoBotImageUrl: bot.video_bot_image_url || "",
          videoBotImagePublicId: bot.video_bot_image_public_id || "",
          humanHandoffEnabled: bot.human_handoff_enabled || false,
          humanHandoffEmails: bot.human_handoff_emails || "",
          customLLMProvider: bot.custom_llm_provider || null,
          customApiKey: "",
          customModel: bot.custom_model || "",
        });
      } catch (err) {
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
    setBotConfig((prev) => ({ ...prev, [field]: value }));
  };

  const validateBotConfig = (): string | null => {
    if (!botConfig.name.trim()) return "Bot name is required.";
    if (!botConfig.description.trim()) return "Bot description is required.";
    if (botConfig.isVideoBot) {
      if (!botConfig.videoBotImageUrl || !botConfig.videoBotImagePublicId)
        return "Video bot image is required.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateBotConfig();
    if (error) {
      toast({ title: "Validation Error", description: error, variant: "destructive" });
      return;
    }
    if (isUpdating) return;

    try {
      setIsUpdating(true);
      setProgress(5);
      
      // Start bot update tracking and redirect immediately
      if (botId) {
        startBotCreation(botId, botConfig.name, 'editing');
        navigate("/bots");
      }

      // Smoother progress increment that slows down as it approaches 90%
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          let newProgress = prev;
          if (prev < 30) {
            newProgress = prev + Math.random() * 8 + 2; // 2-10% increment
          } else if (prev < 60) {
            newProgress = prev + Math.random() * 6 + 1; // 1-7% increment
          } else if (prev < 85) {
            newProgress = prev + Math.random() * 3; // 0-3% increment
          } else {
            newProgress = prev + Math.random() * 1; // 0-1% increment
          }
          const capped = Math.min(newProgress, 90);
          if (botId) updateBotProgress(botId, capped);
          return capped;
        });
      }, 500); // Update more frequently for smoother effect

      const formData = new FormData();
      formData.append("name", botConfig.name);
      formData.append("website_url", botConfig.websiteUrl);
      formData.append("description", botConfig.description);
      formData.append("is_voice_enabled", botConfig.voiceEnabled.toString());
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
      formData.append("slack_channel_id", botConfig.slackChannelId);
      formData.append("conversationFlow", JSON.stringify(botConfig.conversationFlow));
      formData.append("is_video_bot", botConfig.isVideoBot.toString());
      formData.append("video_bot_image_url", botConfig.videoBotImageUrl || "");
      formData.append("video_bot_image_public_id", botConfig.videoBotImagePublicId || "");
      formData.append("human_handoff_enabled", (botConfig.humanHandoffEnabled || false).toString());
      formData.append("human_handoff_emails", botConfig.humanHandoffEmails || "");
      formData.append("custom_llm_provider", botConfig.customLLMProvider || "");
      formData.append("custom_api_key", botConfig.customApiKey || "");
      formData.append("custom_model", botConfig.customModel || "");

      if (botConfig.scrapedMarkdown?.length)
        formData.append("scraped_content", JSON.stringify(botConfig.scrapedMarkdown));
      if (botConfig.scrapedUrls?.length)
        formData.append("scraped_urls", JSON.stringify(botConfig.scrapedUrls));
      if (botConfig.existingTrainingFiles?.length) {
        formData.append(
          "existing_training_files",
          JSON.stringify(botConfig.existingTrainingFiles)
        );
      }
      if (botConfig.files?.length) {
        botConfig.files.forEach((file) => formData.append("files", file));
      }

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);
      if (botId) updateBotProgress(botId, 100);

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Update failed");

      // Extract updated bot data to pass to context
      const updatedBot = result.result || result.data || {};
      const botData = {
        id: botId,
        name: updatedBot.name || botConfig.name,
        description: updatedBot.description || botConfig.description,
        websiteUrl: updatedBot.website_url || botConfig.websiteUrl,
        voiceEnabled: updatedBot.is_voice_enabled || botConfig.voiceEnabled,
        languages: updatedBot.supported_languages || botConfig.languages || ["English"],
        primaryPurpose: updatedBot.primary_purpose || botConfig.primaryPurpose,
        conversationalTone: updatedBot.conversation_tone || botConfig.conversationalTone,
        isVideoBot: updatedBot.is_video_bot || botConfig.isVideoBot,
        videoBotImageUrl: updatedBot.video_bot_image_url || botConfig.videoBotImageUrl,
        videoBotImagePublicId: updatedBot.video_bot_image_public_id || botConfig.videoBotImagePublicId,
        humanHandoffEnabled: updatedBot.human_handoff_enabled || botConfig.humanHandoffEnabled,

        createdAt: updatedBot.createdAt || updatedBot.created_at || new Date().toISOString(),
        updatedAt: updatedBot.updatedAt || updatedBot.updated_at || new Date().toISOString(),
      };

      toast({
        title: "Bot Updated",
        description: `${botConfig.name} updated successfully`,
      });

      if (botId) completeBotCreation(botId, botData);
    } catch (err) {
      if (botId) completeBotCreation(botId);
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setProgress(0);
    }
  };

  if (loading) {
    return (
      <BrandLoader label="Loading bot configuration" />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar - matches CreateBot */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-lg font-bold text-foreground hover:text-primary transition-colors"
          >
            healthAI
          </button>
          <div className="h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/bots")}
            className="gap-2 text-muted-foreground hover:!text-foreground hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Bots
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Edit Bot</h1>
              <p className="text-xs text-muted-foreground">{botConfig.name || "Loading..."}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 min-h-0"
      >
        <BotCreationWizard
          botConfig={botConfig}
          updateConfig={updateConfig}
          onSubmit={handleSubmit}
          isCreatingBot={isUpdating}
          isEditMode={true}
          botId={botId}
        />
      </motion.div>
    </div>
  );
};

export default EditBot;
