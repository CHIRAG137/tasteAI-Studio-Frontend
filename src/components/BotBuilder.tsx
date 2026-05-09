import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { HomeFooter } from "@/components/HomeFooter";
import { useNavigate } from "react-router-dom";

export const BotBuilder = () => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-background dark:via-background dark:to-background">
        <HeroSection
          onCreateBot={() => navigate("/create")}
          onViewBots={() => navigate("/bots")}
          onCreateSlackWorkflow={() => navigate("/workflows/create")}
          onViewWorkflows={() => navigate("/workflows")}
        />
        <HomeFooter />
      </div>
    </>
  );
};
