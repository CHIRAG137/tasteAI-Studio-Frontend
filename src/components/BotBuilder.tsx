import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { useNavigate } from "react-router-dom";

export const BotBuilder = () => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <HeroSection
          onCreateBot={() => navigate("/create")}
          onViewBots={() => navigate("/bots")}
        />
      </div>
    </>
  );
};
