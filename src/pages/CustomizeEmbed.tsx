import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Palette, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmbedCustomizer, EmbedCustomization } from "@/components/EmbedCustomizer";
import axios from "axios";

export default function CustomizeEmbed() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [botName, setBotName] = useState("");

  useEffect(() => {
    if (botId) {
      axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/bots/${botId}`)
        .then(res => setBotName(res.data.result.name))
        .catch(() => {});
    }
  }, [botId]);

  const handleSave = (customization: EmbedCustomization) => {
    toast({ title: "Saved!", description: "Customization saved successfully" });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Modern Header */}
      <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/docs/${botId}`)}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Integration Guide
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-primary rounded-xl shadow-soft">
                  <Palette className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold leading-tight">Customize Widget</h1>
                  <p className="text-xs text-muted-foreground">{botName || "Loading..."}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full page customizer */}
      <EmbedCustomizer
        isOpen={true}
        onClose={() => navigate(`/docs/${botId}`)}
        botId={botId || ""}
        botName={botName}
        onSave={handleSave}
        fullPage={true}
      />
    </div>
  );
}
