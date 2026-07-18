const CACHE_KEY = "stavespil:mediaCache";
let maxSizeBytes = 5 * 1024 * 1024; // 5 MB default
const SIZE_THRESHOLD = 0.8; // 80%

type CacheEntry = {
  data: string;
  lastUsed: number;
};

type CacheData = {
  lru: string[];
  entries: Record<string, CacheEntry>;
};

function createEmptyCache(): CacheData {
  return { lru: [], entries: {} };
}

function loadCache(): CacheData {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return createEmptyCache();
    const parsed = JSON.parse(raw);
    if (!parsed.lru || !parsed.entries) return createEmptyCache();
    return parsed;
  } catch {
    return createEmptyCache();
  }
}

function saveCache(cache: CacheData): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function updateLRU(cache: CacheData, key: string): void {
  const idx = cache.lru.indexOf(key);
  if (idx !== -1) {
    cache.lru.splice(idx, 1);
  }
  cache.lru.push(key);
  cache.entries[key].lastUsed = Date.now();
}

function estimateEntrySize(key: string, entry: CacheEntry): number {
  return (key.length + entry.data.length) * 2;
}

function calculateSize(cache: CacheData): number {
  let total = 0;
  for (const key of cache.lru) {
    total += estimateEntrySize(key, cache.entries[key]);
  }
  return total;
}

function evictIfNeeded(cache: CacheData): void {
  let currentSize = calculateSize(cache);
  while (currentSize > maxSizeBytes * SIZE_THRESHOLD && cache.lru.length > 0) {
    const oldestKey = cache.lru.shift()!;
    const removedSize = estimateEntrySize(oldestKey, cache.entries[oldestKey]);
    delete cache.entries[oldestKey];
    currentSize -= removedSize;
  }
}

/**
 * Set max cache size in bytes (for testing).
 * @param bytes - Maximum cache size in bytes
 */
export function setMaxSize(bytes: number): void {
  maxSizeBytes = bytes;
}

/**
 * Check if a media file exists in the cache.
 * @param key - Type-prefixed key (e.g., "sound:hello.mp3")
 */
export function has(key: string): boolean {
  const cache = loadCache();
  return key in cache.entries;
}

/**
 * Retrieve a media file from the cache. Updates LRU order.
 * @param key - Type-prefixed key
 * @returns Base64 data URL or null if not cached
 */
export function get(key: string): string | null {
  const cache = loadCache();
  if (!(key in cache.entries)) return null;
  updateLRU(cache, key);
  saveCache(cache);
  return cache.entries[key].data;
}

/**
 * Store a media file in the cache. Triggers eviction if over 80% capacity.
 * @param key - Type-prefixed key
 * @param data - Base64 data URL
 */
export function set(key: string, data: string): void {
  const cache = loadCache();
  cache.entries[key] = { data, lastUsed: Date.now() };
  updateLRU(cache, key);
  evictIfNeeded(cache);
  saveCache(cache);
}

/**
 * Remove a specific media file from the cache.
 * @param key - Type-prefixed key
 */
export function remove(key: string): void {
  const cache = loadCache();
  if (!(key in cache.entries)) return;
  const idx = cache.lru.indexOf(key);
  if (idx !== -1) {
    cache.lru.splice(idx, 1);
  }
  delete cache.entries[key];
  saveCache(cache);
}

/**
 * Clear all cached media files.
 */
export function clear(): void {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Get the number of cached entries.
 */
export function size(): number {
  const cache = loadCache();
  return cache.lru.length;
}

/**
 * Get all cached keys.
 */
export function keys(): string[] {
  const cache = loadCache();
  return [...cache.lru];
}
