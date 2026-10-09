/// <reference types="vite/client" />

// server-only (SSR branch in api.ts); the app tsconfig has no Node types
declare const process: { env: Record<string, string | undefined> }
