// Learn more https://docs.expo.io/guides/customizing-metro
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

// Get the default config from Sentry
const config = getSentryExpoConfig(__dirname);

// Wrap the config with NativeWind
module.exports = withNativeWind(config, {
  input: "./global.css",
});
