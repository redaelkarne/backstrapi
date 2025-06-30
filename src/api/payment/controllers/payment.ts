/**
 * Contrôleur pour gérer les paiements Stripe
 */

import stripeService from '../services/stripe';

export default {
  
  /**
   * Créer une session de checkout Stripe
   * POST /api/payments/create-checkout-session
   */
  async createCheckoutSession(ctx) {
    try {
      const { lineItems, successUrl, cancelUrl, customerEmail, metadata } = ctx.request.body;

      if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
        return ctx.badRequest('Les articles sont requis');
      }

      if (!successUrl || !cancelUrl) {
        return ctx.badRequest('Les URLs sont requises');
      }

      const result = await stripeService.createCheckoutSession({
        lineItems,
        successUrl,
        cancelUrl,
        customerEmail,
        metadata,
      });

      return ctx.send(result);

    } catch (error) {
      strapi.log.error('Erreur session:', error.message);
      return ctx.badRequest(`Erreur Stripe: ${error.message}`);
    }
  },

  /**
   * Créer un PaymentIntent
   * POST /api/payments/create-payment-intent
   */
  async createPaymentIntent(ctx) {
    try {
      const { amount, currency = 'eur', metadata } = ctx.request.body;

      if (!amount || amount <= 0) {
        return ctx.badRequest('Montant requis');
      }

      const result = await stripeService.createPaymentIntent(amount, currency, metadata);

      return ctx.send(result);

    } catch (error) {
      strapi.log.error('Erreur PaymentIntent:', error.message);
      return ctx.badRequest(`Erreur Stripe: ${error.message}`);
    }
  },

  /**
   * Récupérer une session
   * GET /api/payments/session/:sessionId
   */
  async getSession(ctx) {
    try {
      const { sessionId } = ctx.params;
      const result = await stripeService.retrieveSession(sessionId);
      return ctx.send(result);

    } catch (error) {
      strapi.log.error('Erreur session:', error.message);
      return ctx.notFound('Session introuvable');
    }
  },

  /**
   * Webhook Stripe
   * POST /api/payments/webhook
   */
  async webhook(ctx) {
    try {
      const sig = ctx.request.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!endpointSecret) {
        return ctx.badRequest('Webhook secret manquant');
      }

      const stripe = stripeService.getStripe();
      
      const event = stripe.webhooks.constructEvent(
        ctx.request.body,
        sig,
        endpointSecret
      );

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        default:
          strapi.log.info('Unhandled event:', event.type);
      }

      return ctx.send({ received: true });

    } catch (error) {
      strapi.log.error('Webhook error:', error.message);
      return ctx.badRequest(`Webhook error: ${error.message}`);
    }
  },

  /**
   * Gérer la completion d'une session de checkout
   */
  async handleCheckoutCompleted(session) {
    try {
      strapi.log.info('Session completed:', session.id);
      
      // Traitement spécifique pour session complétée
      if (session.metadata) {
        const { orderId } = session.metadata;
        if (orderId) {
          strapi.log.info(`Commande ${orderId} payée avec succès`);
          // Ici vous pouvez ajouter la logique pour mettre à jour le statut de la commande
        }
      }
    } catch (error) {
      strapi.log.error('Erreur lors du traitement de la session complétée:', error);
    }
  },

  /**
   * Gérer le succès d'un paiement
   */
  async handlePaymentSucceeded(paymentIntent) {
    try {
      strapi.log.info('Payment succeeded:', paymentIntent.id);
      
      // Log des détails du succès
      strapi.log.info('Détails du paiement réussi:', {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      });

      // Traitement des métadonnées si nécessaire
      if (paymentIntent.metadata) {
        const { orderId } = paymentIntent.metadata;
        if (orderId) {
          strapi.log.info(`Paiement réussi pour la commande ${orderId}`);
          // Ici vous pouvez ajouter la logique pour confirmer la commande
        }
      }
    } catch (error) {
      strapi.log.error('Erreur lors du traitement du paiement réussi:', error);
    }
  },

  /**
   * Gérer l'échec d'un paiement
   */
  async handlePaymentFailed(paymentIntent) {
    try {
      strapi.log.info('PaymentIntent échoué:', paymentIntent.id);

      // Log des métadonnées pour traitement ultérieur
      if (paymentIntent.metadata) {
        const { orderId } = paymentIntent.metadata;
        
        if (orderId) {
          strapi.log.error(`Échec de paiement pour la commande ${orderId}`);
          // Ici vous pouvez ajouter la logique pour gérer l'échec (notification, etc.)
        }
      }

      // Log des détails de l'échec
      strapi.log.error('Détails de l\'échec:', {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      });

    } catch (error) {
      strapi.log.error('Erreur lors du traitement du PaymentIntent échoué:', error);
    }
  },

  /**
   * Méthode de test pour valider la configuration Stripe
   * GET /api/payments/test
   */
  async test(ctx) {
    try {
      const hasSecretKey = !!process.env.STRIPE_SECRET_KEY;
      const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;

      const config: any = {
        stripeConfigured: hasSecretKey,
        webhookConfigured: hasWebhookSecret,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        secretKeyFormat: hasSecretKey
          ? process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
            ? 'test'
            : 'live'
          : 'missing',
      };

      if (hasSecretKey) {
        try {
          const testResult = await stripeService.createPaymentIntent(100, 'eur', {
            test: 'configuration_check',
          });
          config.stripeConnection = 'success';
          config.testPaymentIntentId = testResult.paymentIntentId;
        } catch (error: any) {
          config.stripeConnection = 'failed';
          config.stripeError = error.message;
          config.stripeErrorType = error.type;
          config.stripeErrorCode = error.code;
        }
      } else {
        config.stripeConnection = 'no_secret_key';
        config.help = 'Ajoutez STRIPE_SECRET_KEY=sk_test_... dans votre fichier .env';
      }

      return ctx.send(config);
    } catch (error: any) {
      strapi.log.error('Erreur lors du test Stripe:', error);
      return ctx.internalServerError('Erreur lors du test');
    }
  },

  /**
   * Créer un formulaire de paiement (test)
   * POST /api/payments/create-payment-form
   */
  async createPaymentForm(ctx) {
    try {
      const { amount, currency = 'eur', description = 'Paiement test' } = ctx.request.body;

      if (!amount || amount <= 0) {
        return ctx.badRequest('Montant requis');
      }

      const result = await stripeService.createPaymentIntent(amount, currency, {
        description: description
      });

      // Retourner aussi la clé publique pour le frontend
      return ctx.send({
        ...result,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      });

    } catch (error: any) {
      strapi.log.error('Erreur PaymentForm:', error.message);
      return ctx.badRequest(`Erreur Stripe: ${error.message}`);
    }
  },

  /**
   * Obtenir un formulaire de paiement (test)
   * GET /api/payments/get-payment-form/:sessionId
   */
  async getPaymentForm(ctx) {
    try {
      const { sessionId } = ctx.params;
      
      // Générer un formulaire HTML simple pour les tests
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Payment Form</title>
          <script src="https://js.stripe.com/v3/"></script>
          <style>
            body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
            .form-group { margin: 15px 0; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #635bff; color: white; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
            button:hover { background: #5a52e8; }
            .card-element { padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
            .error { color: #e74c3c; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h2>Formulaire de Paiement Test</h2>
          <form id="payment-form">
            <div class="form-group">
              <label>Montant (EUR)</label>
              <input type="number" id="amount" value="10" min="1" step="0.01">
            </div>
            
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="email" value="test@example.com">
            </div>
            
            <div class="form-group">
              <label>Informations de carte (utilisez 4242 4242 4242 4242 pour les tests)</label>
              <div id="card-element" class="card-element"></div>
            </div>
            
            <button type="submit" id="submit-button">Payer</button>
            <div id="error-message" class="error"></div>
          </form>

          <script>
            const stripe = Stripe('${process.env.STRIPE_PUBLISHABLE_KEY}');
            const elements = stripe.elements();
            const cardElement = elements.create('card');
            cardElement.mount('#card-element');

            document.getElementById('payment-form').addEventListener('submit', async (event) => {
              event.preventDefault();
              
              const amount = document.getElementById('amount').value;
              const email = document.getElementById('email').value;
              
              // Créer PaymentIntent
              const response = await fetch('/api/payments/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: parseFloat(amount), metadata: { email } })
              });
              
              const { clientSecret } = await response.json();
              
              // Confirmer le paiement
              const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                  card: cardElement,
                  billing_details: { email: email }
                }
              });
              
              if (result.error) {
                document.getElementById('error-message').textContent = result.error.message;
              } else {
                alert('Paiement réussi! ID: ' + result.paymentIntent.id);
              }
            });
          </script>
        </body>
        </html>
      `;
      
      ctx.set('Content-Type', 'text/html');
      return ctx.send(html);

    } catch (error: any) {
      return ctx.badRequest(`Erreur: ${error.message}`);
    }
  },

};