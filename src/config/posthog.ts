import PostHog from 'posthog-react-native'
import Constants from 'expo-constants'

const apiKey = Constants.expoConfig?.extra?.posthogApiKey as string | undefined
const host = (Constants.expoConfig?.extra?.posthogHost as string) || 'https://us.i.posthog.com'
const isPostHogConfigured = !!apiKey && apiKey !== 'phc_your_api_key_here'

if (__DEV__) {
  console.log('PostHog config:', {
    apiKey: apiKey ? 'SET' : 'NOT SET',
    host,
    isConfigured: isPostHogConfigured,
  })
}

if (!isPostHogConfigured) {
  console.warn(
    'PostHog API key not configured. Analytics will be disabled. ' +
      'Set POSTHOG_API_KEY in your .env.local file to enable analytics.'
  )
}

export const posthog = new PostHog(apiKey || 'placeholder_key', {
  host,
  disabled: !isPostHogConfigured,
  captureAppLifecycleEvents: true,
  flushAt: 20,
  flushInterval: 10000,
  maxBatchSize: 100,
  maxQueueSize: 1000,
  preloadFeatureFlags: true,
  sendFeatureFlagEvent: true,
  featureFlagsRequestTimeoutMs: 10000,
  requestTimeout: 10000,
  fetchRetryCount: 3,
  fetchRetryDelay: 3000,
})

export const isPostHogEnabled = isPostHogConfigured
