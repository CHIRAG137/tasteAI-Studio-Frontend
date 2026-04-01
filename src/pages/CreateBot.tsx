import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot, Bell, BellRing } from "lucide-react";
import { BotCreationWizard } from "@/components/BotBuilder/BotCreationWizard";
import { Node, Edge } from "@xyflow/react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders, isAuthenticated } from "@/utils/auth";
import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";

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
  scrapedUrls?: string[];
  isVideoBot: boolean;
  videoBotImageUrl?: string;
  videoBotImagePublicId?: string;
  voiceId?: string;
  humanHandoffEnabled?: boolean;
  humanHandoffEmails?: string;
}

const CreateBot = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreatingBot, setIsCreatingBot] = useState(false);
  const [notifyOnComplete, setNotifyOnComplete] = useState(false);
  const [progress, setProgress] = useState(0);

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
    voiceId: "",
    humanHandoffEnabled: false,
    humanHandoffEmails: "",
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
      if (!botConfig.voiceId)
        return "Voice ID is required for Video Bot. Please select a voice.";
    }
    return null;
  };

  const playNotificationSound = () => {
    if (notifyOnComplete) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1174.66, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }
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

      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 5 : prev));
      }, 1000);

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
        voice_id: botConfig.voiceId || "",
        human_handoff_enabled: (botConfig.humanHandoffEnabled || false).toString(),
        human_handoff_emails: botConfig.humanHandoffEmails || "",
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

      playNotificationSound();
      navigate("/bots");
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
      setNotifyOnComplete(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        {/* Top bar with back button */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-[57px] z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Create New Bot</h1>
                <p className="text-xs text-muted-foreground">Configure your AI chatbot step by step</p>
              </div>
            </div>
          </div>
        </div>

        {/* Wizard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
          <BotCreationWizard
            botConfig={botConfig}
            updateConfig={updateConfig}
            onSubmit={handleSubmit}
            isCreatingBot={isCreatingBot}
            notifyOnComplete={notifyOnComplete}
            setNotifyOnComplete={setNotifyOnComplete}
          />
        </motion.div>
      </div>
    </>
  );
};

export default CreateBot;
