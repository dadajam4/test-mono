import { defineConfig } from 'vite';
import JSX from '@vitejs/plugin-vue-jsx';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  // resolve: {
  //   alias: {
  //     '@@': path.resolve(__dirname, '../..'),
  //     '@': path.resolve(__dirname, '..'),
  //     '~': path.join(__dirname, 'src'),
  //     sortablejs: path.resolve(
  //       __dirname,
  //       '../../node_modules/sortablejs/modular/sortable.core.esm.js',
  //     ),
  //   },
  // },
  plugins: [vanillaExtractPlugin(), JSX()],
  optimizeDeps: {
    exclude: ['@datadog/browser-logs'],
  },
});
