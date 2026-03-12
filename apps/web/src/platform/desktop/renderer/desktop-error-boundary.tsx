'use client';

import { Component, type ReactNode } from 'react';

import { DesktopErrorFallback } from '@/platform/desktop/renderer/desktop-error-fallback';

interface DesktopErrorBoundaryProps {
  children: ReactNode;
}

interface DesktopErrorBoundaryState {
  error: Error | null;
}

export class DesktopErrorBoundary extends Component<DesktopErrorBoundaryProps, DesktopErrorBoundaryState> {
  state: DesktopErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): DesktopErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <DesktopErrorFallback title="desktop renderer가 중단되었습니다." error={this.state.error} onRetry={() => this.setState({ error: null })} />;
    }

    return this.props.children;
  }
}
