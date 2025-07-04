export default {
  routes: [
    {
      method: 'POST',
      path: '/referrals/create',
      handler: 'referral.createReferral',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/referrals/use',
      handler: 'referral.useReferralCode',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/referrals/stats',
      handler: 'referral.getReferralStats',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Nouvelle route pour utiliser les récompenses
    {
      method: 'POST',
      path: '/referrals/use-rewards',
      handler: 'referral.useRewards',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};