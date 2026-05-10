import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { ChatBot } from "@/components/ChatBot";
import { getAuthHeaders } from "@/utils/auth";

function mapBotFromApi(bot: any) {
  return {
    id: bot._id || bot.id,
    name: bot.name,
    description: bot.description,
    websiteUrl: bot.website_url,
    voiceEnabled: bot.is_voice_enabled,
    languages: Array.isArray(bot.supported_languages) ? bot.supported_languages : ["English"],
    primaryPurpose: bot.primary_purpose,
    conversationalTone: bot.conversation_tone,
    conversationalStyle: bot.response_style,
    targetAudience: bot.target_audience,
    specializationArea: bot.specialisation_area,
    isVideoBot: bot.is_video_bot,
    videoBotImageUrl: bot.video_bot_image_url,
    videoBotImagePublicId: bot.video_bot_image_public_id,
    humanHandoffEnabled: bot.human_handoff_enabled,
    isSlackEnabled: bot.is_slack_enabled,
    customLLMProvider: bot.custom_llm_provider,
    training_files: bot.training_files,
    scrapedUrls: bot.scraped_urls,
    conversationFlow: bot.conversationFlow,
  };
}

export default function TestBotChat() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const [bot, setBot] = useState<ReturnType<typeof mapBotFromApi> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!botId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`, {
          headers: getAuthHeaders(),
        });
        const data = res.data?.result;
        if (!data) throw new Error("Bot not found");
        if (!cancelled) setBot(mapBotFromApi(data));
      } catch {
        if (!cancelled) setError("Unable to load this bot.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [botId]);

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">{error}</p>
        <button
          type="button"
          className="text-primary underline"
          onClick={() => navigate("/bots")}
        >
          Back to bots
        </button>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading bot…</p>
      </div>
    );
  }

  return (
    <ChatBot
      bot={bot}
      layout="meet"
      onClose={() => (window.history.length > 1 ? navigate(-1) : navigate("/bots"))}
    />
  );
}
