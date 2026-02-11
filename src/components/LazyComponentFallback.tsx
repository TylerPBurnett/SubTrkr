/**
 * Fallback UI shown while lazy-loaded components are being loaded
 * Used for code-split components like Analytics and Settings
 */
export function LazyComponentFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full animate-pulse" style={{ backgroundColor: 'var(--brand-muted)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    </div>
  );
}
