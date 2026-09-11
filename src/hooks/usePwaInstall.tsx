import { useCallback, useEffect, useState } from "react";

function isIosDevice() {
  const ua = window.navigator.userAgent;
  const isIphoneOrIpad = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ finge ser um Mac no user agent, mas tem touch.
  const isIpadOs13 = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIphoneOrIpad || isIpadOs13;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Expõe o estado de instalação do PWA para os dois cenários possíveis:
 * - Android/Chrome (e derivados): captura o evento `beforeinstallprompt` e
 *   permite disparar o prompt nativo via `promptInstall()`.
 * - iOS/Safari: não existe prompt programático (limitação da Apple) — só dá
 *   pra saber que está no Safari do iPhone/iPad e orientar o usuário a usar
 *   Compartilhar > Adicionar à Tela de Início.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const ios = isIosDevice();

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return {
    // Android: só oferece quando o navegador realmente disparou o evento.
    // iOS: oferece sempre que não estiver já instalado (o botão vira
    // instruções, já que não há evento equivalente por lá).
    canInstall: !installed && (!!deferredPrompt || ios),
    canPromptNatively: !!deferredPrompt,
    isIos: ios,
    installed,
    promptInstall,
  };
}
