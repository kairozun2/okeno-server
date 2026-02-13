import { getStripeSync } from './stripeClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. '
      );
    }

    try {
      const body = JSON.parse(payload.toString());
      if (body?.type) {
        await WebhookHandlers.handleStripeEvent(body);
      }
    } catch (err: any) {
      console.log('[Stripe] Custom event processing:', err?.message);
    }

    const sync = await getStripeSync();
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
