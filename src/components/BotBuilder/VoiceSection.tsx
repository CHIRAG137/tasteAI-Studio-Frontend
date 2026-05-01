import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mic, MicOff } from "lucide-react";

interface VoiceSectionProps {
  botConfig: any;
  updateConfig: (field: string, value: any) => void;
}

export const VoiceSection = ({ botConfig, updateConfig }: VoiceSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          {botConfig.voiceEnabled ? (
            <Mic className="w-5 h-5 text-primary" />
          ) : (
            <MicOff className="w-5 h-5 text-primary" />
          )}
          <div>
            <Label className="text-base font-medium cursor-pointer">
              Enable Voice Interaction
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Enable voice capabilities for your bot to speak and listen.
            </p>
          </div>
        </div>
        <Switch
          checked={botConfig.voiceEnabled}
          onCheckedChange={(checked) => updateConfig("voiceEnabled", checked)}
        />
      </div>
      
      {botConfig.voiceEnabled && (
        <div className="mt-4 p-4 bg-accent/10 rounded-lg">
          <p className="text-sm text-accent-foreground">
            🎉 Voice features enabled! Your bot will be able to:
          </p>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
            <li>• Convert text responses to speech</li>
            <li>• Accept voice input from users</li>
            <li>• Provide natural conversation experience</li>
          </ul>
        </div>
      )}
    </div>
  );
};
