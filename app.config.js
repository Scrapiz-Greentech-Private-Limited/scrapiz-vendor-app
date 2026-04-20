const mapboxDownloadsToken =
  process.env.MAPBOX_DOWNLOADS_TOKEN ||
  process.env.ORG_GRADLE_PROJECT_MAPBOX_DOWNLOADS_TOKEN ||
  process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN ||
  "";

export default {
  expo: {
    name: "Scrapiz Partner",
    slug: "scrapiz-vendor",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/image_splashScreen_green.jpg",
    scheme: "scrapizvendorapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      package: "com.scrapizVendor.app",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",
      ],
      adaptiveIcon: {
        backgroundColor: "#16a34a",
        foregroundImage: "./assets/images/image_splashScreen_green.jpg",
      },
      versionCode: 1,
      config: {
        googleMaps: {
          apiKey:
            process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
            "AIzaSyCXv6HR4agCc7eHo02CjVgN4yMVxbvQRqg",
        },
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      googleServicesFile: "./google-services1.json",
    },
    notification: {
      icon: "./assets/images/vendorApp_logo1.png",
      color: "#16a34a"
    },
    plugins: [
      "expo-notifications",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/image_splashScreen_green.jpg",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Allow $(PRODUCT_NAME) to access your location while using the app.",
          locationAlwaysAndWhenInUsePermission:
            "Allow $(PRODUCT_NAME) to use your location.",
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          project: "react-native",
          organization: "scrapiz-greentech-private-l-w6",
        },
      ],
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsImpl: "mapbox",
          RNMapboxMapsDownloadToken: mapboxDownloadsToken,
        },
      ],
      [
        "./plugins/withMapboxAccessToken",
        {
          accessToken:
            process.env.EXPO_PUBLIC_MAPBOX_API_KEY ||
            "<MAPBOX_PUBLIC_TOKEN>",
        },
      ],
      "expo-localization",
    ],
    experiments: {
      reactCompiler: true,
    },
    extra: {
      posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
      posthogHost:
        process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_API_KEY,
      env: {
        EXPO_PUBLIC_API_URL:
          process.env.EXPO_PUBLIC_API_URL || "https://api.scrapiz.in/api",
        EXPO_PUBLIC_API_BASE_URL:
          process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.scrapiz.in/api",
        EXPO_PUBLIC_VENDOR_FALLBACK_TESTING:
          process.env.EXPO_PUBLIC_VENDOR_FALLBACK_TESTING || "true",
        EXPO_PUBLIC_FRONTEND_SECRET:
          process.env.EXPO_PUBLIC_FRONTEND_SECRET ||
          "ScrapizVendor#0nn$(tab!z",
        EXPO_PUBLIC_VENDOR_FRONTEND_SECRET:
          process.env.EXPO_PUBLIC_VENDOR_FRONTEND_SECRET ||
          "ScrapizVendor#0nn$(tab!z",
      },
      eas: {
        projectId: "84300c01-403e-46d0-bc86-af4fb17348e2",
      },
    },
  },
};
