// Capture the browser offer before React mounts or the user opens Settings.
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  window.lifeAnalyticsInstallPrompt = event;
  window.dispatchEvent(new Event("lifeanalytics-install-ready"));
});
window.addEventListener("appinstalled", () => {
  window.lifeAnalyticsInstallPrompt = null;
  window.lifeAnalyticsInstalled = true;
});
