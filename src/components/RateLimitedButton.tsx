import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle } from 'lucide-react';
import { useRateLimit } from '@/hooks/useRateLimit';

interface RateLimitedButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  style?: React.CSSProperties;
  rateLimitKey: string;
  maxRequests?: number;
  windowMs?: number;
  showCountdown?: boolean;
  countdownMessage?: string;
  showLimitedIcon?: boolean;
  keepOriginalVariantWhenLimited?: boolean;
  disabledTooltipMessage?: string;
}

export const RateLimitedButton: React.FC<RateLimitedButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  size = 'default',
  className = '',
  style,
  rateLimitKey,
  maxRequests = 20,
  windowMs = 15 * 60 * 1000, // 15 minutes
  showCountdown = true,
  countdownMessage = 'Rate limit exceeded. Try again in',
  showLimitedIcon = true,
  keepOriginalVariantWhenLimited = false,
  disabledTooltipMessage
}) => {
  const {
    isLimited,
    remainingTime,
    formatTimeRemaining,
    canMakeRequest,
    recordRequest
  } = useRateLimit({
    maxRequests,
    windowMs,
    key: rateLimitKey
  });

  const handleClick = () => {
    if (canMakeRequest && !disabled) {
      recordRequest();
      onClick();
    }
  };

  const isDisabled = disabled || !canMakeRequest;
  const disabledTitle = !canMakeRequest && disabledTooltipMessage
    ? disabledTooltipMessage
    : undefined;

  return (
    <div className={`space-y-2 ${disabledTitle ? 'cursor-not-allowed' : ''}`} title={disabledTitle}>
      <Button
        onClick={handleClick}
        disabled={isDisabled}
        variant={isLimited && !keepOriginalVariantWhenLimited ? 'outline' : variant}
        size={size}
        className={className}
        style={style}
      >
        {isLimited && showLimitedIcon && <Clock className="w-4 h-4 mr-2" />}
        {children}
      </Button>

      {isLimited && showCountdown && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {countdownMessage} {formatTimeRemaining(remainingTime)}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};