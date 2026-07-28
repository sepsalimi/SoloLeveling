// Builds the offline app shell for the GitHub Pages deployment.
module.exports = {
  globDirectory: "dist",
  globPatterns: ["**/*.{html,js,json,png,svg,ico,ttf}"],
  globIgnores: ["sw.js"],
  swDest: "dist/sw.js",
  modifyURLPrefix: {
    "": "/SoloLeveling/"
  },
  navigateFallback: "/SoloLeveling/index.html",
  navigateFallbackAllowlist: [/^\/SoloLeveling(?:\/.*)?$/],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  inlineWorkboxRuntime: true,
  sourcemap: false
};
