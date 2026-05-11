import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BrandLoader } from "@/components/BrandLoader";
import { ChatBot } from "./ChatBot";

export const PublicBotChatPage = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [bot, setBot] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!botId) {
      setLoading(false);
      setLoadError("Bot not found.");
      return;
    }

    const fetchBot = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`);
        if (!response.ok) {
          throw new Error(`Failed to load bot (${response.status})`);
        }

        const data = await response.json();
        if (!data?.result) {
          throw new Error("Bot response is invalid.");
        }

        setBot(data.result);
      } catch (error: any) {
        console.error("PublicBotChatPage load error", error);
        setLoadError(error?.message || "Unable to load bot.");
        setBot(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBot();
  }, [botId]);

  const normalizedBot = bot
    ? {
        id: bot._id ?? bot.id,
        name: bot.name ?? bot.title ?? "Untitled Bot",
        description: bot.description ?? bot.summary ?? "",
        websiteUrl: bot.website_url ?? bot.websiteUrl ?? "",
        voiceEnabled: bot.is_voice_enabled ?? bot.voiceEnabled ?? false,
        isVideoBot: bot.is_video_bot ?? bot.isVideoBot ?? false,
        videoBotImageUrl: bot.video_bot_image_url ?? bot.videoBotImageUrl ?? "",
        languages: bot.languages ?? [],
        primaryPurpose: bot.primary_purpose ?? bot.primaryPurpose ?? "",
        conversationalTone: bot.conversational_tone ?? bot.conversationalTone ?? "",
        humanHandoffEnabled: bot.human_handoff_enabled ?? bot.humanHandoffEnabled ?? false,
        responseStyle: bot.response_style ?? bot.responseStyle ?? "",
        targetAudience: bot.target_audience ?? bot.targetAudience ?? "",
        conversationalStyle: bot.conversational_style ?? bot.conversationalStyle ?? "",
        specializationArea: bot.specialization_area ?? bot.specializationArea ?? "",
        isSlackEnabled: bot.is_slack_enabled ?? bot.isSlackEnabled ?? false,
        customLLMProvider: bot.custom_llm_provider ?? bot.customLLMProvider ?? "",
        training_files: bot.training_files ?? [],
      }
    : null;

  if (loading) {
    return <BrandLoader label="Starting your chat" />;
  }

  if (!botId || loadError || !normalizedBot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full rounded-3xl border bg-white/90 p-8 shadow-2xl backdrop-blur-xl dark:bg-slate-950/90">
          <h1 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">Unable to open chatbot</h1>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">{loadError || "Bot not found."}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return <ChatBot bot={normalizedBot} onClose={() => navigate(-1)} layout="meet" />;
};
