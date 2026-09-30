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
  sourcemap: false,
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
      handler: "CacheFirst",
      options: {
        cacheName: "life-analytics-google-fonts-v1",
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
      }
    }
  ]
};
