import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Video } from "lucide-react";

interface VideoBotSectionProps {
  botConfig: {
    isVideoBot: boolean;
  };
  updateConfig: (field: string, value: any) => void;
}

export const VideoBotSection = ({ botConfig, updateConfig }: VideoBotSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Video className="w-5 h-5 text-primary" />
          <div>
            <Label htmlFor="video-bot-toggle" className="text-base font-medium cursor-pointer">
              Enable Video Bot
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Enable real-time video chatbot to speak with a virtual human bot. 
              You can ask questions by speaking and receive video responses.
            </p>
          </div>
        </div>
        <Switch
          id="video-bot-toggle"
          checked={botConfig.isVideoBot}
          onCheckedChange={(checked) => updateConfig("isVideoBot", checked)}
        />
      </div>
      
      {botConfig.isVideoBot && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm text-primary font-medium">
            Video Bot is enabled! Your bot will respond with realistic video avatars powered by AI.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Note: Voice configuration is disabled when Video Bot is enabled as video responses include audio.
          </p>
        </div>
      )}
    </div>
  );
};
