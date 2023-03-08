import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    plugboy: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  // splitting: false,
  sourcemap: true,
  outExtension: ({ format }) => ({
    js: `.mjs`,
  }),
  external: [/^@vanilla\-extract/, /^@babel/, /^@vue/, 'typescript'],
});
