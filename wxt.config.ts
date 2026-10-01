import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Job Autofill',
    description:
      'Lê seu currículo e preenche formulários de candidatura em qualquer site.',
    permissions: ['storage', 'unlimitedStorage'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Job Autofill',
    },
  },
});
