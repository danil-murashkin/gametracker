import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@docs': path.resolve(__dirname, '../docs/game_model'),
    },
  },
  test: {
    environment: 'node',
  },
});
