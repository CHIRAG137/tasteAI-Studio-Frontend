import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Path to navigate back to. Defaults to "/" */
  backTo?: string;
  /** Label for the back button. Defaults to "Back" */
  backLabel?: string;
  /** Icon component for the page identity */
  icon?: LucideIcon;
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Optional right-aligned action buttons */
  actions?: ReactNode;
  /** Container width. Defaults to "max-w-7xl" */
  container?: "max-w-4xl" | "max-w-7xl" | "full";
  /** Override sticky behavior. Defaults to true */
  sticky?: boolean;
  className?: string;
}

/**
 * Standardized page header used across all pages.
 * Provides consistent height (h-16), padding, and brand layout.
 */
export const PageHeader = ({
  backTo = "/",
  backLabel = "Back",
  icon: Icon,
  title,
  subtitle,
  actions,
  container = "max-w-7xl",
  sticky = true,
  className,
}: PageHeaderProps) => {
  const navigate = useNavigate();

  const containerClass =
    container === "full"
      ? "w-full px-4 sm:px-6 lg:px-8"
      : container === "max-w-4xl"
      ? "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
      : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";

  return (
    <header
      className={cn(
        "border-b border-border bg-background/95 backdrop-blur-sm z-40",
        sticky ? "sticky top-0" : "flex-shrink-0",
        className
      )}
    >
      <div className={containerClass}>
        <div className="h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-lg font-bold text-foreground hover:text-primary transition-colors whitespace-nowrap"
            >
              tasteAI
            </button>
            <div className="h-5 w-px bg-border flex-shrink-0" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(backTo)}
              className="gap-2 text-muted-foreground hover:!text-foreground hover:bg-muted flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </Button>
            <div className="h-5 w-px bg-border flex-shrink-0" />
            <div className="flex items-center gap-2.5 min-w-0">
              {Icon && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-foreground leading-tight truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground leading-tight truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
          )}
        </div>
      </div>
    </header>
  );
};