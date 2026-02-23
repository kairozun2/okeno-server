import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { getStripeClient } from './stripeClient';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. '
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;

    if (webhookSecret) {
      // Verify signature if webhook secret is set
      const stripe = getStripeClient();
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
    } else {
      // Parse directly (development mode)
      event = JSON.parse(payload.toString()) as Stripe.Event;
    }

    if (event?.type) {
      await WebhookHandlers.handleStripeEvent(event);
    }
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
