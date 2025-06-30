export default {
  routes: [
    {
      method: 'POST',
      path: '/payments/create-checkout-session',
      handler: 'payment.createCheckoutSession',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/payments/create-payment-intent',
      handler: 'payment.createPaymentIntent',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/payments/session/:sessionId',
      handler: 'payment.getSession',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/payments/webhook',
      handler: 'payment.webhook',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/payments/test',
      handler: 'payment.test',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/payments/create-payment-form',
      handler: 'payment.createPaymentForm',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/payments/form/:sessionId',
      handler: 'payment.getPaymentForm',
      config: { auth: false },
    },
  ],
};
