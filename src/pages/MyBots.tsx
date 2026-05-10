import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bot, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/utils/auth";
import { BotCard } from "@/components/BotCard";
import { BotCardSkeleton } from "@/components/BotCardSkeleton";
import { BotFilters, BotFilterState } from "@/components/BotFilters";
import { Navbar } from "@/components/Navbar";
import { ChatBot } from "@/components/ChatBot";
import { motion } from "framer-motion";
import { useBotCreation } from "@/contexts/BotCreationContext";

const MyBots = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { botsInProgress, newlyCreatedBots, clearNewlyCreatedBots } = useBotCreation();
  const [savedBots, setSavedBots] = useState<any[]>([]);
  const [selectedBotForTest, setSelectedBotForTest] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(9);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFetchingBots, setIsFetchingBots] = useState(true);
  const [filters, setFilters] = useState<BotFilterState>({
    searchQuery: "",
    primaryPurpose: "all",
    conversationalTone: "all",
    voiceEnabled: "all",
    isVideoBot: "all",
    humanHandoffEnabled: "all",
  });

  // Set of bot IDs currently being created or edited
  const botsInProgressIds = useMemo(
    () => new Set(botsInProgress.map((b) => b.id)),
    [botsInProgress]
  );

  const sortBotsByUpdatedAt = (bots: any[]) =>
    [...bots].sort((a, b) => {
      const aDate = new Date(a.updatedAt || a.createdAt || a.created_at || 0).getTime();
      const bDate = new Date(b.updatedAt || b.createdAt || b.created_at || 0).getTime();
      return bDate - aDate;
    });

  const mapBotFromApi = (bot: any) => ({
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
    createdAt: bot.createdAt || bot.created_at,
    updatedAt: bot.updatedAt || bot.updated_at,
  });

  const filteredBots = useMemo(() => {
    return savedBots.filter((bot) => {
      if (filters.searchQuery && !bot.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
      if (filters.primaryPurpose !== "all" && bot.primaryPurpose !== filters.primaryPurpose) return false;
      if (filters.conversationalTone !== "all" && bot.conversationalTone !== filters.conversationalTone) return false;
      if (filters.voiceEnabled !== "all") {
        const voiceValue = filters.voiceEnabled === "true";
        if (bot.voiceEnabled !== voiceValue && !bot.isVideoBot) return false;
        if (bot.isVideoBot && !voiceValue) return false;
      }
      if (filters.isVideoBot !== "all") {
        const isVideoValue = filters.isVideoBot === "true";
        if (bot.isVideoBot !== isVideoValue) return false;
      }
      if (filters.humanHandoffEnabled !== "all") {
        const handoffValue = filters.humanHandoffEnabled === "true";
        if (bot.humanHandoffEnabled !== handoffValue) return false;
      }
      return true;
    });
  }, [savedBots, filters]);

  // Exclude bots that are currently in-progress (being created or edited)
  // so their BotCard doesn't show alongside the skeleton
  const visibleBots = useMemo(
    () => filteredBots.filter((bot) => !botsInProgressIds.has(bot.id)),
    [filteredBots, botsInProgressIds]
  );

  const fetchBots = async (pageNumber = 1, append = false) => {
    try {
      pageNumber === 1 ? setIsFetchingBots(true) : setIsLoadingMore(true);
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/bots?page=${pageNumber}&limit=${limit}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error("Failed to fetch bots");
      const data = await res.json();
      const { bots, pagination } = data.result;
      const mappedBots = bots.map((bot: any) => mapBotFromApi(bot));
      setSavedBots((prev) => {
        const next = append ? [...prev, ...mappedBots] : mappedBots;
        return sortBotsByUpdatedAt(next);
      });
      setHasNextPage(pagination.hasNextPage);
      setPage(pagination.page);
    } catch (err) {
      console.error("Error fetching bots:", err);
    } finally {
      setIsFetchingBots(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => { fetchBots(1); }, []);

  // Add newly created/updated bots immediately, then hydrate from DB by bot id.
  useEffect(() => {
    if (newlyCreatedBots.length === 0) return;

    let isCancelled = false;
    const incoming = [...newlyCreatedBots];
    const incomingIds = new Set(incoming.map((b) => b.id).filter(Boolean));

    setSavedBots((prev) => {
      const existingWithoutIncoming = prev.filter((bot) => !incomingIds.has(bot.id));
      return sortBotsByUpdatedAt([...incoming, ...existingWithoutIncoming]);
    });

    const hydrateIncomingBots = async () => {
      const hydrated = await Promise.all(
        incoming
          .filter((b) => b.id)
          .map(async (bot) => {
            try {
              const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${bot.id}`, {
                headers: getAuthHeaders(),
              });
              if (!res.ok) return bot;
              const data = await res.json();
              const fetchedBot = data?.result;
              if (!fetchedBot) return bot;
              return mapBotFromApi(fetchedBot);
            } catch (error) {
              return bot;
            }
          })
      );

      if (isCancelled) return;
      if (hydrated.length > 0) {
        setSavedBots((prev) => {
          const hydratedIds = new Set(hydrated.map((b) => b.id));
          const existingWithoutHydrated = prev.filter((bot) => !hydratedIds.has(bot.id));
          return sortBotsByUpdatedAt([...hydrated, ...existingWithoutHydrated]);
        });
      }
    };

    hydrateIncomingBots();
    clearNewlyCreatedBots();

    return () => {
      isCancelled = true;
    };
  }, [newlyCreatedBots, clearNewlyCreatedBots]);

  const handleLoadMore = () => {
    if (hasNextPage && !isLoadingMore) fetchBots(page + 1, true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete bot");
      setSavedBots((prev) => prev.filter((bot) => bot.id !== id));
      toast({ title: "Bot Deleted", description: data.message || "Bot deleted successfully." });
    } catch (error) {
      console.error("Delete bot error:", error);
      toast({
        title: "Error Deleting Bot",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  const isEmpty = !isFetchingBots && visibleBots.length === 0 && botsInProgress.length === 0;

  return (
    <>
      <div className="min-h-screen bg-background">
        <Navbar pageTitle="Your Bots" />

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
        >
          <BotFilters
            onFiltersChange={setFilters}
            totalBots={savedBots.length}
            filteredCount={filteredBots.length}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isFetchingBots ? (
              // Initial loading skeletons
              Array.from({ length: 6 }).map((_, i) => <BotCardSkeleton key={i} />)
            ) : isEmpty ? (
              <div className="col-span-full text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No bots found</h3>
                <p className="text-muted-foreground mb-6">
                  {savedBots.length === 0
                    ? "Create your first bot to get started"
                    : "Try adjusting your search or filters"}
                </p>
                {savedBots.length === 0 && (
                  <Button
                    onClick={() => navigate("/create")}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Bot
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Progress skeletons rendered in-grid (not prepended above).
                    For editing bots this replaces the existing BotCard since
                    visibleBots already excludes any bot whose ID is in botsInProgressIds. */}
                {botsInProgress.map((botProgress) => (
                  <BotCardSkeleton
                    key={botProgress.id}
                    progress={botProgress.progress}
                    botName={botProgress.name}
                    type={botProgress.type}
                    showProgress
                  />
                ))}

                {/* Regular bot cards — bots currently in progress are excluded */}
                {visibleBots.map((bot) => (
                  <BotCard
                    key={bot.id}
                    bot={bot}
                    onTest={(id) => {
                      const b = savedBots.find((b) => b.id === id);
                      if (b) setSelectedBotForTest(b);
                    }}
                    onShare={(botId) => {
                      const shareUrl = `${window.location.origin}/bot/${botId}`;
                      navigator.clipboard.writeText(shareUrl);
                      toast({ title: "Link Copied", description: "Shareable link copied to clipboard." });
                    }}
                    onIntegrate={(id) => navigate(`/docs/${id}`)}
                    onEdit={(id) => navigate(`/edit/${id}`)}
                    onDelete={handleDelete}
                    onSessions={(id) => navigate(`/sessions/${id}`)}
                    onAnalytics={(id) => navigate(`/analytics/${id}`)}
                  />
                ))}
              </>
            )}
          </div>

          {!isFetchingBots && (page > 1 || hasNextPage) && (
            <div className="flex justify-center gap-4 pt-4">
              {page > 1 && (
                <Button
                  onClick={() => {
                    setPage(1);
                    setSavedBots((prev) => prev.slice(0, limit));
                    setHasNextPage(true);
                  }}
                  variant="outline"
                >
                  Show Less
                </Button>
              )}
              {hasNextPage && (
                <Button onClick={handleLoadMore} variant="outline" disabled={isLoadingMore}>
                  {isLoadingMore ? "Loading..." : "Load More"}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {selectedBotForTest && (
        <ChatBot bot={selectedBotForTest} onClose={() => setSelectedBotForTest(null)} />
      )}
    </>
  );
};

export default MyBots;