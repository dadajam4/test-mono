import { defineProjectConfig } from '@dadajam4/plugboy';

export default defineProjectConfig({
  peerDependencies: {
    vue: '^3.2.0',
  },
  scripts: [
    {
      name: 'default',
      scripts: {
        build: 'pnpm plugboy build',
        clean: 'rm -rf .turbo && rm -rf node_modules && rm -rf dist',
        lint: 'eslint',
        plugboy: 'node ../plugboy/dist/cli.mjs',
        predev: 'pnpm plugboy link',
        test: 'vitest run',
      },
    },
  ],
});
