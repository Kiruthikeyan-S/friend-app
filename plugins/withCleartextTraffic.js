const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to enable `android:usesCleartextTraffic="true"` on Android
 * so standalone APK builds can communicate with local HTTP FastAPI servers (e.g. http://192.168.x.x:8000).
 */
module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (modConfig) => {
    const mainApplication = modConfig.modResults.manifest.application?.[0];
    if (mainApplication) {
      mainApplication.$ = mainApplication.$ || {};
      mainApplication.$['android:usesCleartextTraffic'] = 'true';
    }
    return modConfig;
  });
};
