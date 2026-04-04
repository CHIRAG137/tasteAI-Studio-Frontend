import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Palette } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/docs/${botId}`)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Integration Guide
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Customize UI</h1>
                <p className="text-sm text-muted-foreground">{botName || "Loading..."}</p>
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
