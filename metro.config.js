const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require('nativewind/metro');

const config = getSentryExpoConfig(__dirname);

// Wrap the config with NativeWind
module.exports = withNativeWind(config, { 
    input: './global.css' 
});