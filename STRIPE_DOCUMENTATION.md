# Documentation Stripe - Tests et Intégration Frontend

## 🚨 Erreur Corrigée

**Problème initial :** Version d'API Stripe incompatible
- ❌ Ancienne version : `'2023-10-16'`
- ✅ Version corrigée : `'2025-05-28.basil'`

## 📁 Structure des Fichiers

```
src/api/payment/
├── services/
│   └── stripe.ts                 # Service principal Stripe
├── controllers/
│   └── payment.ts               # Contrôleur API Strapi
├── routes/
│   └── payment.ts               # Routes API
├── test/
│   └── stripe-test.ts           # Tests automatisés
└── examples/
    └── frontend-examples.ts     # Exemples pour le frontend
```

## 🔧 Configuration Requise

### Variables d'Environnement

Ajoutez ces variables dans votre fichier `.env` :

```env
# Clés Stripe (obtenues depuis votre dashboard Stripe)
STRIPE_SECRET_KEY=sk_test_51xxxxx...  # Clé secrète de test
STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxx...  # Clé publique de test

# Pour les webhooks (optionnel)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx...
```

### Installation des Dépendances

```bash
npm install stripe
npm install --save-dev @types/stripe  # Si vous utilisez TypeScript
```

## 🧪 Utilisation des Tests

### 1. Tests Backend (dans Strapi)

```typescript
import stripeTestService from '../test/stripe-test';

// Test simple
const result = await stripeTestService.tests.testBasicCheckout();
console.log('Session créée:', result);

// Test avec plusieurs produits
const multiResult = await stripeTestService.tests.testMultipleItemsCheckout();

// Exécuter tous les tests
await stripeTestService.runAllTests();
```

### 2. Tests Frontend

#### React/Next.js

```jsx
import { useState } from 'react';

function PaymentTest() {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineItems: [
            {
              name: 'Produit Test',
              description: 'Description du produit',
              amount: 2999, // 29.99 EUR en centimes
              currency: 'eur',
              quantity: 1,
            }
          ],
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/cancel`,
          customerEmail: 'test@example.com',
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Rediriger vers Stripe Checkout
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? 'Création...' : 'Payer avec Stripe'}
    </button>
  );
}
```

#### JavaScript Vanilla

```javascript
async function createTestPayment() {
  const response = await fetch('/api/payments/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lineItems: [
        {
          name: 'T-shirt Premium',
          amount: 2999, // 29.99 EUR
          currency: 'eur',
          quantity: 1,
        }
      ],
      successUrl: 'http://localhost:3000/success',
      cancelUrl: 'http://localhost:3000/cancel',
    }),
  });

  const result = await response.json();
  
  if (result.success) {
    window.location.href = result.url;
  }
}

// Ajouter à un bouton
document.getElementById('pay-button').addEventListener('click', createTestPayment);
```

## 🃏 Cartes de Test Stripe

Utilisez ces numéros de carte pour tester différents scénarios :

| Carte | Numéro | Résultat |
|-------|--------|----------|
| Succès | `4242424242424242` | Paiement réussi |
| Déclinée | `4000000000000002` | Carte déclinée |
| 3D Secure | `4000002500003155` | Authentification requise |
| Fonds insuffisants | `4000000000009995` | Fonds insuffisants |
| Expirée | `4000000000000069` | Carte expirée |

**Date d'expiration :** N'importe quelle date future (ex: 12/25)  
**CVC :** N'importe quel code à 3 chiffres (ex: 123)

## 🌐 Endpoints API Disponibles

### 1. Créer une Session de Checkout

```http
POST /api/payments/create-checkout-session
Content-Type: application/json

{
  "lineItems": [
    {
      "name": "Nom du produit",
      "description": "Description optionnelle",
      "amount": 2999,
      "currency": "eur",
      "quantity": 1
    }
  ],
  "successUrl": "https://yoursite.com/success",
  "cancelUrl": "https://yoursite.com/cancel",
  "customerEmail": "client@example.com",
  "metadata": {
    "orderId": "order_123",
    "userId": "user_456"
  }
}
```

### 2. Récupérer une Session

```http
GET /api/payments/session/:sessionId
```

### 3. Créer un PaymentIntent

```http
POST /api/payments/create-payment-intent
Content-Type: application/json

{
  "amount": 5000,
  "currency": "eur",
  "metadata": {
    "orderId": "order_123"
  }
}
```

### 4. Test de Configuration

```http
GET /api/payments/test
```

## 🔄 Flux de Paiement Complet

### 1. Frontend → Backend
```javascript
// 1. Créer la session de paiement
const session = await fetch('/api/payments/create-checkout-session', {
  method: 'POST',
  body: JSON.stringify(paymentData)
});

// 2. Rediriger vers Stripe
window.location.href = session.url;
```

### 2. Stripe → Frontend
```
// URLs de retour
Success: https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}
Cancel:  https://yoursite.com/cancel
```

### 3. Webhooks (Optionnel)
```javascript
// Stripe notifie votre backend des événements
POST /api/payments/webhook
// Events: checkout.session.completed, payment_intent.succeeded, etc.
```

## 🐛 Debugging et Logs

### Vérifier la Configuration

```bash
# Test de l'endpoint de configuration
curl http://localhost:1337/api/payments/test
```

### Logs Strapi

Les logs sont automatiquement générés dans la console Strapi :
- ✅ Succès : `Session Stripe créée`
- ❌ Erreurs : `Erreur lors de la création de la session Stripe`

### Stripe Dashboard

Consultez votre [dashboard Stripe](https://dashboard.stripe.com) pour :
- Voir les paiements en temps réel
- Déboguer les erreurs
- Analyser les performances

## 🚀 Exemples d'Utilisation Avancée

### Panier Multi-Produits

```javascript
const cartItems = [
  {
    name: 'T-shirt',
    amount: 2999,
    currency: 'eur',
    quantity: 2
  },
  {
    name: 'Livre',
    amount: 1999,
    currency: 'eur',
    quantity: 1
  }
];

const response = await fetch('/api/payments/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lineItems: cartItems,
    successUrl: 'https://yoursite.com/success',
    cancelUrl: 'https://yoursite.com/cart',
    customerEmail: user.email,
    metadata: {
      userId: user.id,
      cartId: cart.id
    }
  })
});
```

### Intégration avec État Global (Redux/Zustand)

```javascript
// Store
const usePaymentStore = create((set) => ({
  loading: false,
  session: null,
  
  createPayment: async (items) => {
    set({ loading: true });
    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: items,
          successUrl: window.location.origin + '/success',
          cancelUrl: window.location.origin + '/cart',
        })
      });
      
      const result = await response.json();
      set({ session: result, loading: false });
      
      if (result.success) {
        window.location.href = result.url;
      }
    } catch (error) {
      set({ loading: false });
      console.error('Payment error:', error);
    }
  }
}));
```

## 📱 Responsive et Mobile

```css
/* Styles pour les boutons de paiement */
.stripe-button {
  background: #635bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.stripe-button:hover {
  background: #5a52e6;
}

.stripe-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .stripe-button {
    width: 100%;
    padding: 16px;
  }
}
```

## 🔒 Sécurité

### ✅ Bonnes Pratiques Implémentées

1. **Validation côté serveur** : Tous les paramètres sont validés
2. **Logs détaillés** : Traçabilité complète des opérations
3. **Gestion d'erreurs** : Messages d'erreur sécurisés
4. **Webhooks sécurisés** : Vérification des signatures Stripe

### ⚠️ Points d'Attention

1. **Variables d'environnement** : Ne jamais exposer les clés secrètes
2. **HTTPS obligatoire** : Pour la production
3. **Validation frontend** : Toujours doubler avec validation backend
4. **Logs sensibles** : Ne pas logger les données de carte

## 🎯 Prochaines Étapes

1. **Tester** : Utilisez les exemples fournis
2. **Personnaliser** : Adaptez selon vos besoins métier
3. **Intégrer** : Connectez avec votre frontend
4. **Déployer** : Configurez pour la production
5. **Monitorer** : Surveillez les paiements via Stripe Dashboard

## 📞 Support

- [Documentation Stripe](https://stripe.com/docs)
- [Dashboard Stripe](https://dashboard.stripe.com)
- [Strapi Documentation](https://docs.strapi.io)
