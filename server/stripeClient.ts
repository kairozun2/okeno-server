import Stripe from 'stripe';

function getCredentials() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!secretKey || !publishableKey) {
    throw new Error(
      'STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY must be set in environment variables'
    );
  }

  return { publishableKey, secretKey };
}

let cachedClient: Stripe | null = null;

export async function getUncachableStripeClient() {
  const { secretKey } = getCredentials();
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil' as any,
  });
}

export function getStripeClient(): Stripe {
  if (!cachedClient) {
    const { secretKey } = getCredentials();
    cachedClient = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil' as any,
    });
  }
  return cachedClient;
}

export async function getStripePublishableKey() {
  const { publishableKey } = getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = getCredentials();
  return secretKey;
}
