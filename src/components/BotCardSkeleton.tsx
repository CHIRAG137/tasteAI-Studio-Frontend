interface BotCardSkeletonProps {
  progress?: number;
  botName?: string;
  type?: 'creating' | 'editing';
}

export const BotCardSkeleton = ({ progress, botName, type = 'creating' }: BotCardSkeletonProps) => {
  const isComplete = progress === 100;
  
  return (
    <div className="relative rounded-xl border bg-card p-6 space-y-4 overflow-hidden">
      {/* Shimmer overlay - only show if not complete */}
      {!isComplete && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-muted/40 to-transparent" />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="h-3 w-1/2 bg-muted rounded" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2 relative z-10">
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-5/6 bg-muted rounded" />
      </div>

      {/* Progress Section */}
      <div className="space-y-3 pt-2 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            {type === 'creating' ? 'Creating Bot' : 'Updating Bot'}
          </span>
          <span className="text-sm font-semibold text-primary">{progress ?? 0}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress ?? 0}%` }}
          />
        </div>
        
        {/* Status Message */}
        <div className="text-xs text-muted-foreground">
          {isComplete
            ? `${botName} has been ${type === 'creating' ? 'created' : 'updated'} successfully!`
            : `${type === 'creating' ? 'Creating' : 'Updating'} ${botName}...`}
        </div>
      </div>

      {/* Button placeholder */}
      <div className="pt-3 relative z-10">
        <div className="h-9 w-full bg-muted rounded-md" />
      </div>
    </div>
  );
};
