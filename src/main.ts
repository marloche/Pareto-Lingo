import './style.css';
import { boot, toast } from './app.ts';

void boot(document.querySelector<HTMLElement>('#app')!);

// Offline support, in built versions only. A new version takes over at once (see sw.js); when it does
// while the app is open, offer a reload. The first install also fires this, so skip it then.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadWorker = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadWorker) toast('Pareto-Lingo was updated.', { label: 'Reload', run: () => location.reload() });
  });
}
