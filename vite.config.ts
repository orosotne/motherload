import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset URLs: the same build runs on itch.io, inside Tauri and from a sub-path.
  base: './',
  build: {
    // three.js alone is ~520 kB minified. The real budget is 2 MB gzip for the whole build
    // (GAME_SPEC §9), so warn only when a chunk grows well past three.
    chunkSizeWarningLimit: 1024,
  },
  test: {
    // Logic tests run headless in Node (GAME_SPEC §9.2).
    include: ['tests/**/*.test.ts'],
  },
});
