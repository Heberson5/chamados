// Service worker mínimo, só para satisfazer o requisito de instalabilidade
// do Chrome/Android (PWA precisa de um SW com handler de fetch registrado).
// Não faz cache de nada de propósito: o app depende de dados em tempo real
// do Supabase, então servir uma versão antiga em cache causaria mais
// confusão do que ajuda. Toda requisição segue normalmente para a rede.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Sem respondWith: o navegador trata a requisição normalmente.
});
