export default {
  expo: {
    name: 'Scrapiz-Vendor-App',
    slug: 'Scrapiz-Vendor-App',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'scrapizvendorapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      [
        '@sentry/react-native/expo',
        {
          url: 'https://sentry.io/',
          project: 'react-native',
          organization: 'scrapiz-greentech-private-l-w6',
        },
      ],
      "expo-localization"
    ],
    experiments: {
      reactCompiler: true,
    },
    extra: {
      posthogApiKey: process.env.POSTHOG_API_KEY,
      posthogHost: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
    },
  },
}
