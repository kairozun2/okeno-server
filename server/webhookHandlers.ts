import { getStripeSync } from './stripeClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();

    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (webhookSecret) {
        const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        await WebhookHandlers.handleStripeEvent(event);
      }
    } catch (err: any) {
      console.log('[Stripe] Webhook event processing (custom):', err?.message);
    }

    await sync.processWebhook(payload, signature);
  }

  static async handleStripeEvent(event: any): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (userId && session.payment_status === 'paid') {
          await db.update(users).set({ 
            isPremium: true, 
            stripeCustomerId: session.customer as string 
          }).where(eq(users.id, userId));
          console.log(`[Premium] Activated for user ${userId}`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        if (customerId) {
          await db.update(users).set({ isPremium: false, usernameColor: null, profileEffect: null })
            .where(eq(users.stripeCustomerId, customerId as string));
          console.log(`[Premium] Deactivated for customer ${customerId}`);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        console.log(`[Premium] Payment failed for customer ${customerId}`);
        break;
      }
    }
  }
}
