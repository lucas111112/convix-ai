let sentryInitialized = false;

/**
 * Initializes Sentry error monitoring.
 * No-op when SENTRY_DSN is not set in the environment.
 */
export async function initSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import('@sentry/node');
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
  sentryInitialized = true;
}

/**
 * Captures an exception in Sentry with optional extra context.
 * No-op when Sentry is not initialized.
 */
export async function captureException(
  err: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  if (!sentryInitialized) return;
  const Sentry = await import('@sentry/node');
  Sentry.captureException(err, { extra });
}
