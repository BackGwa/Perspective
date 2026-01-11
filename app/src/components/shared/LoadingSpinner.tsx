import '../../../styles/components/loading-spinner.scss';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
}

export function LoadingSpinner({ size = 'md', variant = 'spinner' }: LoadingSpinnerProps) {
  if (variant === 'dots') {
    return (
      <div className={`loading-dots loading-dots--${size}`}>
        <div className="loading-dots__dot"></div>
        <div className="loading-dots__dot"></div>
        <div className="loading-dots__dot"></div>
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={`loading-pulse loading-pulse--${size}`}>
        <div className="loading-pulse__ring"></div>
        <div className="loading-pulse__ring"></div>
      </div>
    );
  }

  return (
    <div className={`loading-spinner loading-spinner--${size}`}>
      <svg viewBox="0 0 50 50" className="loading-spinner__svg">
        <circle
          className="loading-spinner__track"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="4"
        />
        <circle
          className="loading-spinner__progress"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
