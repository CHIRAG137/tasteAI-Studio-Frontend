import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot } from "lucide-react";
import { BotCreationWizard } from "@/components/BotBuilder/BotCreationWizard";
import { Node, Edge } from "@xyflow/react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders, isAuthenticated } from "@/utils/auth";
import { Navbar } from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import { motion } from "framer-motion";
import { useBotCreation } from "@/contexts/BotCreationContext";

interface BotConfig {
  name: string;
  websiteUrl: string;
  description: string;
  files: File[];
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
  scrapedUrls?: string[];
  isVideoBot: boolean;
  videoBotImageUrl?: string;
  videoBotImagePublicId?: string;
  humanHandoffEnabled?: boolean;
  humanHandoffEmails?: string;
  customLLMProvider?: string | null;
  customApiKeySource?: "bot" | "user";
  customApiKey?: string;
  customModel?: string;
  requireVisitorEmailVerification?: boolean;
}

const resolveBotFromResponse = (result: any) => {
  if (!result || typeof result !== "object") return {};
  return result.result?.bot || result.result || result.data?.bot || result.data || {};
};

const CreateBot = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { startBotCreation, updateBotProgress, completeBotCreation } = useBotCreation();
  const [isCreatingBot, setIsCreatingBot] = useState(false);
  const [progress, setProgress] = useState(0);
  const [botIdRef] = useState(() => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  const [botConfig, setBotConfig] = useState<BotConfig>({
    name: "",
    websiteUrl: "",
    description: "",
    files: [],
    voiceEnabled: false,
    languages: ["English"],
    primaryPurpose: "customer-support",
    specializationArea: "",
    conversationalTone: "professional",
    responseStyle: "concise",
    targetAudience: "customers",
    keyTopics: "",
    keywords: "",
    customInstructions: "",
    isSlackEnabled: false,
    slackChannelId: "",
    conversationFlow: {
      nodes: [
        {
          id: "1",
          type: "message",
          position: { x: 250, y: 50 },
          data: {
            label: "Welcome Message",
            type: "message",
            message: "Hello! I'm here to help you. Let's start by getting some information.",
          },
        },
      ],
      edges: [],
    },
    isVideoBot: false,
    videoBotImageUrl: "",
    videoBotImagePublicId: "",
    humanHandoffEnabled: false,
    humanHandoffEmails: "",
    customLLMProvider: null,
    customApiKeySource: "bot",
    customApiKey: "",
    customModel: "",
    requireVisitorEmailVerification: false,
  });

  const updateConfig = (field: keyof BotConfig, value: any) => {
    setBotConfig((prev) => ({ ...prev, [field]: value }));
  };

  const validateBotConfig = (): string | null => {
    if (!botConfig.name.trim()) return "Bot name is required.";
    if (!botConfig.description.trim()) return "Bot description is required.";
    if (botConfig.isVideoBot) {
      if (!botConfig.videoBotImageUrl || !botConfig.videoBotImagePublicId)
        return "Video bot image is required. Please upload and save a cropped image.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated()) { navigate("/login"); return; }
    const validationError = validateBotConfig();
    if (validationError) {
      toast({ title: "Missing Required Information", description: validationError, variant: "destructive" });
      return;
    }
    if (isCreatingBot) return;

    try {
      setIsCreatingBot(true);
      setProgress(5);
      
      // Start bot creation tracking and redirect immediately
      startBotCreation(botIdRef, botConfig.name, 'creating');
      navigate("/bots");

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
          updateBotProgress(botIdRef, capped);
          return capped;
        });
      }, 500); // Update more frequently for smoother effect

      const formData = new FormData();
      Object.entries({
        name: botConfig.name,
        website_url: botConfig.websiteUrl,
        description: botConfig.description,
        is_voice_enabled: botConfig.voiceEnabled.toString(),
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
        is_video_bot: botConfig.isVideoBot.toString(),
        video_bot_image_url: botConfig.videoBotImageUrl || "",
        video_bot_image_public_id: botConfig.videoBotImagePublicId || "",
        human_handoff_enabled: (botConfig.humanHandoffEnabled || false).toString(),
        human_handoff_emails: botConfig.humanHandoffEmails || "",

        custom_llm_provider: botConfig.customLLMProvider || "",
        custom_api_key_source: botConfig.customApiKeySource || "bot",
        custom_api_key: botConfig.customApiKey || "",
        custom_model: botConfig.customModel || "",
        require_visitor_email_verification: (botConfig.requireVisitorEmailVerification || false).toString(),
      }).forEach(([key, value]) => formData.append(key, value as string));

      if (botConfig.scrapedMarkdown?.length)
        formData.append("scraped_content", JSON.stringify(botConfig.scrapedMarkdown));
      if (botConfig.scrapedUrls?.length)
        formData.append("scraped_urls", JSON.stringify(botConfig.scrapedUrls));
      if (botConfig.files?.length) {
        botConfig.files.forEach((file) => formData.append("files", file));
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/create`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);
      updateBotProgress(botIdRef, 100);

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create bot");

      const createdBot = resolveBotFromResponse(result);
      const createdBotId = createdBot._id || createdBot.id;
      let fullBot = createdBot;

      if (createdBotId) {
        try {
          const botRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${createdBotId}`, {
            headers: getAuthHeaders(),
          });
          if (botRes.ok) {
            const botResult = await botRes.json();
            fullBot = resolveBotFromResponse(botResult);
          }
        } catch (fetchErr) {
          console.warn("Failed to fetch full bot after creation, using immediate response payload.", fetchErr);
        }
      }

      const createdAt = fullBot.createdAt || fullBot.created_at || new Date().toISOString();
      const botData = {
        id: fullBot._id || fullBot.id || createdBotId,
        name: fullBot.name || botConfig.name,
        description: fullBot.description || botConfig.description,
        websiteUrl: fullBot.website_url || botConfig.websiteUrl,
        voiceEnabled: fullBot.is_voice_enabled ?? botConfig.voiceEnabled,
        languages: fullBot.supported_languages || botConfig.languages || ["English"],
        primaryPurpose: fullBot.primary_purpose || botConfig.primaryPurpose,
        conversationalTone: fullBot.conversation_tone || botConfig.conversationalTone,
        conversationalStyle: fullBot.response_style || botConfig.responseStyle,
        targetAudience: fullBot.target_audience || botConfig.targetAudience,
        specializationArea: fullBot.specialisation_area || botConfig.specializationArea,
        isVideoBot: fullBot.is_video_bot ?? botConfig.isVideoBot,
        videoBotImageUrl: fullBot.video_bot_image_url || botConfig.videoBotImageUrl,
        videoBotImagePublicId: fullBot.video_bot_image_public_id || botConfig.videoBotImagePublicId,
        humanHandoffEnabled: fullBot.human_handoff_enabled ?? botConfig.humanHandoffEnabled,
        isSlackEnabled: fullBot.is_slack_enabled ?? botConfig.isSlackEnabled,
        customLLMProvider: fullBot.custom_llm_provider || botConfig.customLLMProvider || undefined,
        training_files: fullBot.training_files || [],
        scrapedUrls: fullBot.scraped_urls || [],
        conversationFlow: fullBot.conversationFlow || botConfig.conversationFlow,

        createdAt,
        updatedAt: fullBot.updatedAt || fullBot.updated_at || createdAt,
      };

      toast({
        title: "Bot Created Successfully!",
        description: result.message || `${botConfig.name} has been created successfully.`,
      });

      // Complete bot creation tracking with bot data
      completeBotCreation(botIdRef, botData);
    } catch (error) {
      console.error("Error creating bot:", error);
      completeBotCreation(botIdRef);
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

  return (
    <>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <PageHeader
          backTo="/"
          backLabel="Back to Home"
          icon={Bot}
          title="Create New Bot"
          subtitle="Configure your AI chatbot step by step"
          sticky={false}
        />

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
            isCreatingBot={isCreatingBot}
          />
        </motion.div>
      </div>
    </>
  );
};

export default CreateBot;
