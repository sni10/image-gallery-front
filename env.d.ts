/// <reference types="vite/client" />

// server-only (SSR branch in api.ts); the app tsconfig has no Node types
declare const process: { env: Record<string, string | undefined> }

// Cloudflare Turnstile, loaded by ComplaintView (only the calls we use)
interface Window {
  turnstile?: {
    render(
      el: HTMLElement,
      opts: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void },
    ): string
    reset(id: string): void
    remove(id: string): void
  }
}
