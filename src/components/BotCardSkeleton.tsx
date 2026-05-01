import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Bell, BellRing } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface BotCardSkeletonProps {
  progress?: number;
  botName?: string;
  type?: "creating" | "editing";
  showProgress?: boolean;
}

export const BotCardSkeleton = ({
  progress,
  botName,
  type = "creating",
  showProgress = false,
}: BotCardSkeletonProps) => {
  const isComplete = showProgress && progress === 100;
  const showProgressSection = showProgress && typeof progress === "number";
  const [notifyOnComplete, setNotifyOnComplete] = useState(false);
  const hasPlayedRef = useRef(false);

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1174.66, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.error("Could not play notification sound:", e);
    }
  };

  useEffect(() => {
    if (isComplete && notifyOnComplete && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      playNotificationSound();
    }
  }, [isComplete, notifyOnComplete]);

  return (
    <div className="relative rounded-xl border bg-card overflow-hidden">
      {/* Progress overlay — absolutely centered, doesn't affect card height */}
      {showProgressSection && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-card/80 backdrop-blur-sm px-8">
          <span className="text-sm font-semibold text-foreground">
            {type === "creating" ? "Creating Bot" : "Updating Bot"}
          </span>
          <div className="w-full space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{botName}</span>
              <span className="font-semibold text-primary">{progress ?? 0}%</span>
            </div>
            <Progress value={progress ?? 0} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground">
            {isComplete
              ? `${botName} has been ${type === "creating" ? "created" : "updated"} successfully!`
              : `${type === "creating" ? "Creating" : "Updating"} ${botName}...`}
          </p>
          {!isComplete && (
            <Button
              type="button"
              size="sm"
              variant={notifyOnComplete ? "default" : "outline"}
              onClick={() => setNotifyOnComplete((v) => !v)}
              className={
                notifyOnComplete
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white animate-[btn-breathe_8s_ease-in-out_infinite] hover:[animation-play-state:paused] h-8"
                  : "h-8 animate-[btn-breathe_8s_ease-in-out_infinite] hover:[animation-play-state:paused]"
              }
            >
              {notifyOnComplete ? (
                <BellRing className="w-3.5 h-3.5 mr-1" />
              ) : (
                <Bell className="w-3.5 h-3.5 mr-1" />
              )}
              {notifyOnComplete ? "Will Notify" : "Notify Me"}
            </Button>
          )}
        </div>
      )}

      {/* Shimmer */}
      {!isComplete && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-muted/30 to-transparent pointer-events-none z-0" />
      )}

      {/* Three-dot menu placeholder */}
      <div className="absolute top-4 right-4 z-10">
        <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
      </div>

      {/* CardHeader */}
      <div className="p-6 pb-4 space-y-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2 pr-8">
            <div className="h-[18px] w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-5 w-24 bg-muted animate-pulse rounded-full" />
          </div>
        </div>
        <div className="space-y-2 pt-1">
          <div className="h-3 w-full bg-muted animate-pulse rounded" />
          <div className="h-3 w-5/6 bg-muted animate-pulse rounded" />
        </div>
      </div>

      {/* CardContent */}
      <div className="px-6 pb-6 space-y-4 relative z-10">
        <div className="space-y-3">
          {/* Voice */}
          <div className="flex items-center justify-between">
            <div className="h-3 w-9 bg-muted animate-pulse rounded" />
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
              <div className="h-3 w-14 bg-muted animate-pulse rounded" />
            </div>
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            <div className="flex flex-wrap gap-1">
              <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
              <div className="h-5 w-12 bg-muted animate-pulse rounded-full" />
              <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
            </div>
          </div>

          {/* Purpose & Tone */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-3 w-14 bg-muted animate-pulse rounded" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-3 w-10 bg-muted animate-pulse rounded" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid gap-2 pt-3 border-t border-border mt-3">
            <div className="flex justify-between">
              <div className="h-[11px] w-12 bg-muted animate-pulse rounded" />
              <div className="h-[11px] w-32 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-[11px] w-12 bg-muted animate-pulse rounded" />
              <div className="h-[11px] w-32 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>

        {/* Button */}
        <div className="pt-2">
          <div className="h-9 w-full bg-muted animate-pulse rounded-md" />
        </div>
      </div>
    </div>
  );
};