import Stripe from 'stripe';

const stripeService = {
  
  getStripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY manquant');
    }
    return new Stripe(secretKey, {
      apiVersion: '2025-05-28.basil',
    });
  },

  async createCheckoutSession(data: {
    lineItems: Array<{
      name: string;
      amount: number;
      currency: string;
      quantity: number;
      description?: string;
    }>;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    metadata?: Record<string, string>;
  }) {
    const stripe = this.getStripe();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: data.lineItems.map(item => ({
        price_data: {
          currency: item.currency,
          product_data: {
            name: item.name,
            description: item.description,
          },
          unit_amount: Math.round(item.amount * 100),
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      customer_email: data.customerEmail,
      metadata: data.metadata || {},
    });

    return {
      sessionId: session.id,
      url: session.url,
      status: session.status,
    };
  },

  async retrieveSession(sessionId: string) {
    const stripe = this.getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return {
      sessionId: session.id,
      status: session.payment_status,
      customerEmail: session.customer_email,
      amountTotal: session.amount_total,
      currency: session.currency,
      metadata: session.metadata,
    };
  },

  async createPaymentIntent(amount: number, currency: string = 'eur', metadata?: Record<string, string>) {
    const stripe = this.getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
    };
  },

};

export default stripeService;
