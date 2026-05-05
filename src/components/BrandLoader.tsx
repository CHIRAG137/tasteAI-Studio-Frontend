import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const TAGLINES = [
  "Build production-ready chatbots in minutes",
  "Deploy video bots, voice bots & real-time AI",
  "No-code conversational flow builder",
  "Seamless human handoff for your agents",
  "Train bots on your website & documents",
  "Multilingual support out of the box",
];

interface BrandLoaderProps {
  /** Render full viewport height. Defaults to true. Set false to fit a parent. */
  fullScreen?: boolean;
  /** Optional override label shown above the rotating taglines. */
  label?: string;
  className?: string;
}

export const BrandLoader = ({
  fullScreen = true,
  label,
  className,
}: BrandLoaderProps) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % TAGLINES.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 px-6",
        fullScreen ? "min-h-screen w-full bg-background" : "py-12 w-full",
        className,
      )}
    >
      {/* Animated logo */}
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 blur-xl opacity-60 animate-pulse" />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg animate-[btn-breathe_3s_ease-in-out_infinite]">
          <Bot className="w-9 h-9 text-white" />
        </div>
      </div>

      {/* Brand */}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">
          TasteAI Studio
        </h2>
        {label && (
          <p className="text-sm font-medium text-foreground">{label}</p>
        )}
      </div>

      {/* Rotating taglines */}
      <div className="h-5 overflow-hidden text-center" aria-live="polite">
        <p
          key={index}
          className="text-sm text-muted-foreground animate-[fade-in_0.5s_ease-out]"
        >
          {TAGLINES[index]}
        </p>
      </div>

      {/* Subtle progress dots */}
      <div className="flex gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-[bounce_1.4s_ease-in-out_infinite]" />
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
      </div>
    </div>
  );
};

export default BrandLoader;