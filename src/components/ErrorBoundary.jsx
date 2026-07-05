import { Component } from "react";

/** True for stale lazy-chunk / dynamic-import failures (Vite re-optimize, deploy,
 * or dev-server restart left the browser pointing at an old module URL). */
function isDynamicImportError(error) {
  const msg = String(error?.message || error || "");
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /'text\/html' is not a valid JavaScript MIME type/i.test(msg)
  );
}

/**
 * Catches render/runtime errors in the routed page tree so a crash shows a
 * readable message instead of a blank white screen. Resets automatically when
 * the route changes (via the `resetKey` prop passed from Layout).
 *
 * Stale dynamic-import failures self-heal: the boundary reloads the page once
 * (guarded against a reload loop) to pull the fresh module graph.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // A stale chunk isn't a real bug — reload once to fetch the new module.
    if (isDynamicImportError(error)) {
      const KEY = "wen:chunk-reload-at";
      const last = Number(sessionStorage.getItem(KEY) || 0);
      // Only auto-reload if we haven't just done so (avoids an infinite loop
      // when the module is genuinely broken rather than merely stale).
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
        return;
      }
    }
    // Surface the real error in the console for debugging.
    // eslint-disable-next-line no-console
    console.error("Page crashed:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Clear the error when navigating to a different route.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-2.992l-6.93-12a2 2 0 00-3.48 0l-6.93 12A2 2 0 005.07 19z" />
            </svg>
          </div>
          <h1 className="mt-5 text-xl font-bold text-gray-800">Something went wrong on this page</h1>
          <p className="mt-2 text-sm text-gray-500">The page hit an unexpected error and couldn't render.</p>
          <pre className="mt-3 text-left text-[11px] text-red-600 bg-red-50/60 rounded-xl p-3 overflow-auto max-h-40 whitespace-pre-wrap break-all">
            {String(error?.message || error)}
          </pre>
          <div className="mt-6 flex gap-2 justify-center">
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
