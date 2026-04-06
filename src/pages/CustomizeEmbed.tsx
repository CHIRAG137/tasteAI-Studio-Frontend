import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmbedCustomizer, EmbedCustomization } from "@/components/EmbedCustomizer";
import axios from "axios";
import { getAuthHeaders } from "@/utils/auth";

export default function CustomizeEmbed() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [botName, setBotName] = useState("");

  useEffect(() => {
    if (botId) {
      axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`, {
        headers: getAuthHeaders(),
      })
        .then(res => setBotName(res.data.result.name))
        .catch(() => {});
    }
  }, [botId]);

  const handleSave = (customization: EmbedCustomization) => {
    toast({ title: "Saved!", description: "Customization saved successfully" });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-muted/30">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b bg-background/80 backdrop-blur-lg z-20">
        <div className="px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/docs/${botId}`)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-gradient-primary rounded-lg">
                <Palette className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-semibold leading-tight">Customize Widget</h1>
                <p className="text-[11px] text-muted-foreground leading-tight">{botName || "Loading..."}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full page customizer - takes remaining height */}
      <div className="flex-1 min-h-0">
        <EmbedCustomizer
          isOpen={true}
          onClose={() => navigate(`/docs/${botId}`)}
          botId={botId || ""}
          botName={botName}
          onSave={handleSave}
          fullPage={true}
        />
      </div>
    </div>
  );
}
