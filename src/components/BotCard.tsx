import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Bot, Globe, MoreHorizontal, Play, Share, Code, Trash2, Edit, MessageSquare, Video, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BotCardProps {
  bot: {
    id: string;
    name: string;
    description: string;
    websiteUrl: string;
    voiceEnabled: boolean;
    languages: string[];
    primaryPurpose: string;
    conversationalTone: string;
    responseStyle?: string;
    targetAudience?: string;
    conversationalStyle?: string;
    specializationArea?: string;
    isVideoBot: boolean;
    humanHandoffEnabled: boolean;
    isSlackEnabled?: boolean;
    customLLMProvider?: string;
    training_files?: Array<{ originalname: string; size: number; mimeType: string }>;
    scrapedUrls?: string[];
    createdAt?: string;
    updatedAt?: string;
  };
  onTest: (id: string) => void;
  onShare: (id: string) => void;
  onIntegrate: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSessions: (id: string) => void;
  onAnalytics: (id: string) => void;
}

export const BotCard = ({ bot, onTest, onShare, onIntegrate, onEdit, onDelete, onSessions, onAnalytics }: BotCardProps) => {
  const isLoading = (bot as any).isLoading;
  const progress = (bot as any).progress || 0;
  const isVoiceEnabledForUI = bot.isVideoBot || bot.voiceEnabled;
  const createdAt = bot.createdAt || (bot as any).created_at;
  const updatedAt = bot.updatedAt || (bot as any).updated_at;
  const createdLabel = createdAt ? new Date(createdAt).toLocaleString() : "N/A";
  const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleString() : "N/A";
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const featureBadges = [
    isVoiceEnabledForUI && {
      key: "voice",
      label: "🎤 Voice Enabled",
      variant: "secondary",
    },
    bot.isVideoBot && {
      key: "video",
      label: "🎬 Video Bot Enabled",
      variant: "secondary",
    },
    bot.training_files && bot.training_files.length > 0 && {
      key: "training",
      label: `📁 Training data added (${bot.training_files.length})`,
      title: bot.training_files.map((file) => file.originalname).join("\n"),
      variant: "secondary",
    },
    bot.websiteUrl && {
      key: "website",
      label: "🌐 Website training data added",
      variant: "secondary",
    },
    {
      key: "llm",
      label: bot.customLLMProvider ? `🤖 Custom LLM (${bot.customLLMProvider})` : "🤖 Platform LLM",
      variant: bot.customLLMProvider ? "secondary" : "outline",
    },
    bot.isSlackEnabled && {
      key: "slack",
      label: "💬 Slack integrated",
      variant: "secondary",
    },
    bot.humanHandoffEnabled && {
      key: "handoff",
      label: "👤 Human handoff enabled",
      variant: "secondary",
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    variant: "secondary" | "outline";
    title?: string;
  }>;

  const visibleFeatures = showAllFeatures ? featureBadges : featureBadges.slice(0, 2);

  return (
    <Card className={`relative group transition-all duration-300 ${isLoading ? "opacity-80" : "hover:shadow-strong"}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
          <Bot className="w-6 h-6 text-primary animate-pulse mb-2" />
          <p className="text-sm font-medium text-primary mb-2">Creating bot...</p>
          <Progress value={progress} className="w-2/3" />
        </div>
      )}

      {/* Three dots menu */}
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onShare(bot.id)} className="cursor-pointer">
              <Share className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onIntegrate(bot.id)} className="cursor-pointer">
              <Code className="mr-2 h-4 w-4" />
              Integrate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSessions(bot.id)} className="cursor-pointer">
              <MessageSquare className="mr-2 h-4 w-4" />
              Sessions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAnalytics(bot.id)} className="cursor-pointer">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(bot.id)} className="cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTest(bot.id)} className="cursor-pointer">
              <Play className="mr-2 h-4 w-4" />
              Test
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(bot.id)}
              className="cursor-pointer text-destructive focus:bg-destructive focus:!text-white hover:bg-destructive hover:!text-white"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold pr-8 truncate" title={bot.name}>
              {bot.name}
            </CardTitle>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {bot.isVideoBot ? (
                <Badge variant="secondary" className="text-xs">
                  <Video className="w-3 h-3 mr-1" />
                  Video Bot
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Normal Bot
                </Badge>
              )}
            </div>
          </div>
        </div>

        <CardDescription className="text-sm line-clamp-2">
          {bot.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <span className="text-sm font-medium">Languages</span>
            <div className="flex flex-wrap gap-1">
              {bot.languages.map((language) => (
                <Badge key={language} variant="secondary" className="text-xs">
                  {language}
                </Badge>
              ))}
            </div>
          </div>

          {/* Persona Tags */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Persona</span>
            <div className="flex flex-wrap gap-1">
              {bot.primaryPurpose && (
                <Badge variant="outline" className="text-xs">
                  🎯 {bot.primaryPurpose}
                </Badge>
              )}
              {bot.conversationalTone && (
                <Badge variant="outline" className="text-xs">
                  🎭 {bot.conversationalTone}
                </Badge>
              )}
              {bot.targetAudience && (
                <Badge variant="outline" className="text-xs">
                  👥 {bot.targetAudience}
                </Badge>
              )}
              {(bot.conversationalStyle || bot.responseStyle) && (
                <Badge variant="outline" className="text-xs">
                  🧭 {bot.conversationalStyle || bot.responseStyle}
                </Badge>
              )}
            </div>
          </div>

          {/* Feature Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Features</span>
              {featureBadges.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs px-2 h-6"
                  onClick={() => setShowAllFeatures((value) => !value)}
                >
                  {showAllFeatures ? "Show less" : `+${featureBadges.length - 2} more`}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 items-center">
              {visibleFeatures.map((feature) => (
                <Badge key={feature.key} variant={feature.variant} className="text-xs" title={feature.title}>
                  {feature.label}
                </Badge>
              ))}
            </div>
          </div>
        
          <div className="grid gap-2 text-xs text-muted-foreground pt-3 border-t border-border mt-3">
            <div className="flex justify-between">
              <span>Created</span>
              <span className="text-right">{createdLabel}</span>
            </div>
            <div className="flex justify-between">
              <span>Updated</span>
              <span className="text-right">{updatedLabel}</span>
            </div>
          </div>
        </div>

        {/* Test Button */}
        <div className="pt-2">
          <Button
            onClick={() => onTest(bot.id)}
            className="w-full bg-gradient-primary hover:opacity-90"
            size="sm"
          >
            <Play className="w-4 h-4 mr-2" />
            Test Bot
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};