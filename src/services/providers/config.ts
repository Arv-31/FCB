/** "static" = real data built into public/data (default); "mock" = fictional demo fixtures for offline testing. */
export const DATA_PROVIDER: 'static' | 'mock' = import.meta.env.VITE_DATA_PROVIDER === 'mock' ? 'mock' : 'static'
