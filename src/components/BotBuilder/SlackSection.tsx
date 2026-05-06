import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/api/auth";
import { getAuthHeaders, isAuthenticated } from "@/utils/auth";
import { MessageSquare, Slack, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

interface SlackSectionProps {
  botConfig: any;
  updateConfig: (field: string, value: any) => void;
}

export const SlackSection = ({ botConfig, updateConfig }: SlackSectionProps) => {
  const navigate = useNavigate();
  const [isLoadingSlackStatus, setIsLoadingSlackStatus] = useState(true);
  const [slackIntegration, setSlackIntegration] = useState<{ teamName?: string } | null>(null);

  useEffect(() => {
    const fetchSlackStatus = async () => {
      if (!isAuthenticated()) {
        setSlackIntegration(null);
        setIsLoadingSlackStatus(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error("Failed to fetch Slack integration status");
        const data = await response.json();
        setSlackIntegration(data?.result?.hasSlackIntegration ? data?.result?.slackIntegration : null);
      } catch (error) {
        setSlackIntegration(null);
      } finally {
        setIsLoadingSlackStatus(false);
      }
    };

    fetchSlackStatus();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-primary" />
          <div>
            <Label htmlFor="isSlackEnabled" className="text-base font-medium cursor-pointer">
              Enable Slack Integration
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Forward bot conversations to a Slack channel of your choice.
            </p>
          </div>
        </div>
        <Switch
          id="isSlackEnabled"
          checked={botConfig.isSlackEnabled || false}
          onCheckedChange={(checked) => updateConfig("isSlackEnabled", checked)}
        />
      </div>
      
      {botConfig.isSlackEnabled && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-md p-2 ${slackIntegration ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {slackIntegration ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isLoadingSlackStatus
                      ? "Checking Slack authorization..."
                      : slackIntegration
                        ? `Connected to Slack workspace: ${slackIntegration.teamName || "Workspace"}`
                        : "You are not authorized to Slack yet."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {slackIntegration
                      ? "Slack is enabled for this bot. Messages will be routed after bot creation or update."
                      : "Authorize Slack first, then create/update this bot with Slack enabled."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={slackIntegration ? "outline" : "default"}
                size="sm"
                className={slackIntegration ? "gap-2" : "gap-2 bg-[#4A154B] hover:bg-[#3a1039] text-white"}
                onClick={() => navigate("/slack/manage")}
              >
                <Slack className="w-4 h-4" />
                Authenticate Slack
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>

            {!isLoadingSlackStatus && !slackIntegration && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs font-medium text-amber-900 mb-1">Steps to authenticate Slack</p>
                <ol className="text-xs text-amber-800 list-decimal pl-4 space-y-1">
                  <li>Click <span className="font-medium">Authenticate Slack</span> above.</li>
                  <li>Choose your Slack workspace and approve app permissions.</li>
                  <li>Return to this bot setup page and keep Slack enabled.</li>
                  <li>Create or update the bot to complete Slack integration.</li>
                </ol>
              </div>
            )}

            {!isLoadingSlackStatus && slackIntegration && (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-xs font-medium text-emerald-900 mb-1">
                  You are connected to {slackIntegration.teamName || "your Slack workspace"}.
                </p>
                <p className="text-xs text-emerald-800 mb-1">
                  If you want to change workspace, follow these steps after create/update:
                </p>
                <ol className="text-xs text-emerald-800 list-decimal pl-4 space-y-1">
                  <li>Finish this bot create/update with Slack enabled.</li>
                  <li>Click <span className="font-medium">Authenticate Slack</span>.</li>
                  <li>Authorize the new workspace in Slack.</li>
                  <li>Edit the bot again (if needed) and verify the target channel ID.</li>
                </ol>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slackChannelId" className="text-sm font-medium">
              Slack Channel ID
            </Label>
            <Input
              id="slackChannelId"
              placeholder="Enter Slack Channel ID (e.g., C1234567890)"
              value={botConfig.slackChannelId || ""}
              onChange={(e) => updateConfig("slackChannelId", e.target.value)}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              You can find the Channel ID by right-clicking on a channel and selecting "Copy link". The ID is at the end of the URL.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};