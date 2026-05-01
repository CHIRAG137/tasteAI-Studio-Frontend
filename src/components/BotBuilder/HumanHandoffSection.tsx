import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users } from "lucide-react";

interface HumanHandoffSectionProps {
  botConfig: {
    humanHandoffEnabled?: boolean;
    humanHandoffEmails?: string;
  };
  updateConfig: (field: string, value: any) => void;
}

export const HumanHandoffSection = ({ botConfig, updateConfig }: HumanHandoffSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <Label htmlFor="human-handoff-toggle" className="text-base font-medium cursor-pointer">
              Enable Talk to Human
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Allow users to request a conversation with a human agent.
            </p>
          </div>
        </div>
        <Switch
          id="human-handoff-toggle"
          checked={botConfig.humanHandoffEnabled || false}
          onCheckedChange={(checked) => updateConfig("humanHandoffEnabled", checked)}
        />
      </div>

      {botConfig.humanHandoffEnabled && (
        <div className="space-y-2">
          <Label htmlFor="handoff-emails">Agent Email Addresses</Label>
          <Textarea
            id="handoff-emails"
            placeholder="Enter email addresses (one per line)&#10;e.g.&#10;agent1@example.com&#10;agent2@example.com"
            value={botConfig.humanHandoffEmails || ""}
            onChange={(e) => updateConfig("humanHandoffEmails", e.target.value)}
            className="min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground">
            These email addresses will be notified when a user requests to talk to a human.
          </p>
        </div>
      )}
    </div>
  );
};
