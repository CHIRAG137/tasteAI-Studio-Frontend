import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
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
      <Navbar pageTitle={botName ? `Customize Widget - ${botName}` : "Customize Widget"} />

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
