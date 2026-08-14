import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// GitHub Pages: restaura a rota profunda guardada pelo public/404.html.
// Acontece aqui (e não no <head>) porque os caminhos relativos dos assets já
// foram resolvidos no parse do HTML.
const restore = (window as any).__ATHENEU_RESTORE__ as string | undefined;
if (restore && restore !== window.location.pathname + window.location.search + window.location.hash) {
  window.history.replaceState(null, '', restore);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA: registra o service worker apenas em produção.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW não registrado:', e));
  });
}
