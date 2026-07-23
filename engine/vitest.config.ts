import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@examples': path.resolve(__dirname, '../examples'),
    },
  },
  test: {
    environment: 'node',
  },
});
