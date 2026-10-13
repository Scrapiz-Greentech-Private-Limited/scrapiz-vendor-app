import Constants from 'expo-constants'
import PostHog from 'posthog-react-native'

const rawProjectToken =
  (Constants.expoConfig?.extra?.posthogProjectToken as string | undefined) ||
  process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN ||
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY ||
  '';

const host =
  (Constants.expoConfig?.extra?.posthogHost as string | undefined) ||
  process.env.EXPO_PUBLIC_POSTHOG_HOST ||
  'https://us.i.posthog.com';

const isPostHogConfigured = Boolean(
  rawProjectToken &&
  rawProjectToken !== 'placeholder_token' &&
  rawProjectToken !== 'placeholder_key' &&
  rawProjectToken !== 'disabled_posthog_key' &&
  host,
);

if (__DEV__ && !isPostHogConfigured) {
  console.warn(
    'EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured. Analytics and session replay will be safely disabled.',
  );
}

// PostHog constructor asserts that apiKey is a non-empty string.
// If project token is missing, pass a fallback dummy key with disabled: true so it never crashes at startup.
export const posthog = new PostHog(isPostHogConfigured ? rawProjectToken : 'disabled_posthog_key', {
  host,
  disabled: !isPostHogConfigured,
  captureAppLifecycleEvents: isPostHogConfigured,
  errorTracking: {
    autocapture: {
      uncaughtExceptions: isPostHogConfigured,
      unhandledRejections: isPostHogConfigured,
      console: [],
    },
  },
  enableSessionReplay: isPostHogConfigured,
  sessionReplayConfig: {
    maskAllTextInputs: false,
    maskAllImages: false,
    captureLog: true,
    captureNetworkTelemetry: true,
    sampleRate: undefined,
    throttleDelayMs: 1000,
  },
});

export const isPostHogEnabled = isPostHogConfigured;
