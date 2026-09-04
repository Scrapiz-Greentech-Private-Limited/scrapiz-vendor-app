import * as Sentry from '@sentry/react-native';
import { posthog } from '../config/posthog';

type EventProperties = Record<string, unknown>;

const normalizeErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';

export const trackVendorClick = (action: string, properties: EventProperties = {}) => {
  posthog.capture('vendor_button_clicked', {
    action,
    ...properties,
  });

  Sentry.addBreadcrumb({
    category: 'ui.click',
    message: action,
    level: 'info',
    data: properties,
  });
};

export const trackVendorNavigation = (target_screen: string, properties: EventProperties = {}) => {
  posthog.capture('vendor_navigation_clicked', {
    target_screen,
    ...properties,
  });

  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `navigate:${target_screen}`,
    level: 'info',
    data: properties,
  });
};

export const trackVendorFailure = (feature: string, error: unknown, properties: EventProperties = {}) => {
  const errorMessage = normalizeErrorMessage(error);

  posthog.capture('vendor_app_failure', {
    feature,
    error_message: errorMessage,
    ...properties,
  });

  if (error instanceof Error) {
    Sentry.captureException(error, {
      tags: { feature },
      extra: properties,
    });
    return;
  }

  Sentry.captureMessage(`${feature}: ${errorMessage}`, {
    level: 'error',
    tags: { feature },
    extra: properties,
  });
};
