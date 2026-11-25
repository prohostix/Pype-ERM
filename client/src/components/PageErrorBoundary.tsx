import { Component, type ReactNode } from 'react';

interface State { error: Error | null }

/** Catches render errors in a page so the sidebar stays usable and the real error is visible instead of a blank screen. */
export class PageErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('Page crashed:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="rounded-3xl bg-white border border-slate-100 p-8 max-w-2xl">
        <h2 className="text-xl font-semibold tracking-tight">This page could not be displayed</h2>
        <p className="text-sm text-muted-foreground mt-1.5">Something went wrong while drawing it. Details below.</p>
        <pre className="mt-4 rounded-2xl bg-[#f4f6f3] p-4 text-xs text-red-700 whitespace-pre-wrap break-words">{error.message}</pre>
        <button type="button" onClick={() => this.setState({ error: null })} className="mt-4 h-11 px-5 rounded-full bg-white border border-slate-200 hover:bg-[#eaf6e6] text-sm font-semibold">Try again</button>
      </div>
    );
  }
}
