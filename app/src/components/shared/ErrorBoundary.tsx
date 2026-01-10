import { Component, ReactNode } from 'react';
import { ERROR_BOUNDARY } from '../../config/uiText';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)'
        }}>
          <h2>{ERROR_BOUNDARY.SOMETHING_WENT_WRONG}</h2>
          <p style={{ margin: '1rem 0' }}>
            {this.state.error?.message || ERROR_BOUNDARY.UNEXPECTED_ERROR}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.6rem 1.25rem',
              background: 'var(--interactive-normal)',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              color: 'var(--bg-primary)',
              fontSize: 'var(--font-size-base)',
              cursor: 'pointer'
            }}
          >
            {ERROR_BOUNDARY.RELOAD_PAGE}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
