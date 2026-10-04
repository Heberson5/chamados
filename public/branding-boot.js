/* Aplica favicon/título da marca salvos em cache antes do React carregar
   (arquivo separado para permitir CSP sem 'unsafe-inline'). */
(function () {
  try {
    var cached = JSON.parse(localStorage.getItem("chamados_branding_cache") || "null");
    if (cached && cached.companyFavicon) {
      var link = document.createElement("link");
      link.rel = "icon";
      link.href = cached.companyFavicon;
      document.head.appendChild(link);
    }
    if (cached && cached.companyName) {
      document.title = cached.companyName;
    }
  } catch (e) {}
})();
