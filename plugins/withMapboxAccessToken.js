const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Plugin to add Mapbox access token to AndroidManifest.xml
 * This is required for @rnmapbox/maps to work properly
 */
const withMapboxAccessToken = (config, { accessToken }) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // Remove existing Mapbox token meta-data if present
    if (mainApplication["meta-data"]) {
      mainApplication["meta-data"] = mainApplication["meta-data"].filter(
        (item) => item.$["android:name"] !== "MAPBOX_ACCESS_TOKEN",
      );
    } else {
      mainApplication["meta-data"] = [];
    }

    // Add Mapbox access token
    mainApplication["meta-data"].push({
      $: {
        "android:name": "MAPBOX_ACCESS_TOKEN",
        "android:value": accessToken || "",
      },
    });

    return config;
  });
};

module.exports = withMapboxAccessToken;
