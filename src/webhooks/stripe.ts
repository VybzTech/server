import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../database/client.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;

  try {
    // Get raw body from Express
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Verify Stripe signature
    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    // Handle events
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await prisma.transaction.update({
          where: { stripePaymentIntentId: paymentIntent.id },
          data: { status: 'SUCCESS' },
        });
        console.log('✅ Payment succeeded:', paymentIntent.id);
        break;

      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.user.update({
          where: { stripeCustomerId: subscription.customer as string },
          data: {
            subscriptionExpiry: new Date(
              subscription.current_period_end * 1000
            ),
          },
        });
        console.log('✅ Subscription updated');
        break;

      case 'invoice.payment_failed':
        console.log('❌ Payment failed');
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
}
