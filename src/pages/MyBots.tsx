import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/utils/auth";
import { Navbar } from "@/components/Navbar";
import { BotCard } from "@/components/BotCard";
import { BotCardSkeleton } from "@/components/BotCardSkeleton";
import { BotFilters, BotFilterState } from "@/components/BotFilters";
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
      const mappedBots = bots.map((bot: any) => ({
        id: bot._id,
        name: bot.name,
        description: bot.description,
        websiteUrl: bot.website_url,
        voiceEnabled: bot.is_voice_enabled,
        languages: Array.isArray(bot.supported_languages) ? bot.supported_languages : ["English"],
        primaryPurpose: bot.primary_purpose,
        conversationalTone: bot.conversation_tone,
        isVideoBot: bot.is_video_bot,
        videoBotImageUrl: bot.video_bot_image_url,
        videoBotImagePublicId: bot.video_bot_image_public_id,
        voiceId: bot.voice_id,
        humanHandoffEnabled: bot.human_handoff_enabled,
        requireVisitorAuth0Identity: !!bot.require_visitor_auth0_identity,
      }));
      setSavedBots((prev) => (append ? [...prev, ...mappedBots] : mappedBots));
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

  // Add newly created bots to the list immediately
  useEffect(() => {
    if (newlyCreatedBots.length > 0) {
      setSavedBots((prev) => {
        // Filter out any bots that are already in the list
        const newBots = newlyCreatedBots.filter(
          (newBot) => !prev.some((existingBot) => existingBot.id === newBot.id)
        );
        // Add new bots to the beginning of the list
        return [...newBots, ...prev];
      });
      // Clear the newly created bots from context after adding them
      clearNewlyCreatedBots();
    }
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

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
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
                  <h1 className="text-lg font-semibold text-foreground">Your Bots</h1>
                  <p className="text-xs text-muted-foreground">Manage your AI chatbots</p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => navigate("/create")}
              className="bg-gradient-primary hover:opacity-90 gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Bot
            </Button>
          </div>
        </div>

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
            {/* Show bots in progress first */}
            {botsInProgress.map((botProgress) => (
              <BotCardSkeleton
                key={botProgress.id}
                progress={botProgress.progress}
                botName={botProgress.name}
                type={botProgress.type}
              />
            ))}

            {/* Then show regular bots */}
            {isFetchingBots
              ? Array.from({ length: 6 }).map((_, i) => <BotCardSkeleton key={i} />)
              : filteredBots.length === 0 && botsInProgress.length === 0 ? (
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
                    <Button onClick={() => navigate("/create")} className="bg-gradient-primary hover:opacity-90 gap-2">
                      <Plus className="w-4 h-4" />
                      Create Your First Bot
                    </Button>
                  )}
                </div>
              )
              : filteredBots.map((bot) => (
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
          </div>

          {!isFetchingBots && (page > 1 || hasNextPage) && (
            <div className="flex justify-center gap-4 pt-4">
              {page > 1 && (
                <Button onClick={() => { setPage(1); setSavedBots((prev) => prev.slice(0, limit)); setHasNextPage(true); }} variant="outline">
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
