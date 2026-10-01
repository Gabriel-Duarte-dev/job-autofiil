import ReactDOM from 'react-dom/client';
import App from './App';
import '@/styles/content.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  async main(ctx) {
    if (window !== window.top) return;

    const ui = await createShadowRootUi(ctx, {
      name: 'job-autofill-ui',
      position: 'modal',
      zIndex: 2147483646,
      inheritStyles: true,
      onMount(container) {
        container.style.pointerEvents = 'none';
        container.style.zIndex = '2147483646';

        const root = ReactDOM.createRoot(container);
        root.render(<App />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
