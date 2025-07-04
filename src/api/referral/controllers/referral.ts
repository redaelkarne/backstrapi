import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::referral.referral', ({ strapi }) => ({
  // Créer un parrainage avec un code
  async createReferral(ctx) {
    try {
      const { referralCode } = ctx.request.body;
      const userId = ctx.state.user.id;

      // Vérifier si l'utilisateur existe
      const referrer = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
      if (!referrer) {
        return ctx.badRequest('Utilisateur introuvable');
      }

      // Vérifier si l'utilisateur a déjà un code de parrainage
      if (referrer.referralCode) {
        return ctx.badRequest('Vous avez déjà un code de parrainage');
      }

      // Générer un code unique si non fourni
      const code = referralCode || this.generateReferralCode();

      // Vérifier l'unicité du code dans la table des utilisateurs (pas dans referral)
      const existingUser = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: { referralCode: code }
      });

      if (existingUser.length > 0) {
        return ctx.badRequest('Code de parrainage déjà existant');
      }

      // Mettre à jour le code de parrainage de l'utilisateur
      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: { referralCode: code }
      });

      ctx.send({ 
        message: 'Code de parrainage créé avec succès',
        referralCode: code 
      });
    } catch (error) {
      console.error('❌ Erreur création code parrainage:', error);
      ctx.throw(500, 'Erreur lors de la création du code de parrainage');
    }
  },

  // Utiliser un code de parrainage
  async useReferralCode(ctx) {
    try {
      const { referralCode } = ctx.request.body;
      const userId = ctx.state.user.id;

      // Trouver l'utilisateur parrain
      const referrer = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: { referralCode }
      });

      if (referrer.length === 0) {
        return ctx.badRequest('Code de parrainage invalide');
      }

      const referrerUser = referrer[0];

      // Vérifier que l'utilisateur ne se parraine pas lui-même
      if (referrerUser.id === userId) {
        return ctx.badRequest('Vous ne pouvez pas utiliser votre propre code');
      }

      // Vérifier si l'utilisateur n'a pas déjà été parrainé
      const existingReferral = await strapi.entityService.findMany('api::referral.referral', {
        filters: { referred: userId }
      });

      if (existingReferral.length > 0) {
        return ctx.badRequest('Vous avez déjà été parrainé');
      }

      // Créer le parrainage
      const referral = await strapi.entityService.create('api::referral.referral', {
        data: {
          referrer: referrerUser.id,
          referred: userId,
          referralCode,
          status: 'completed',
          rewardAmount: 10,
          completedAt: new Date()
        }
      });

      // Mettre à jour les statistiques du parrain
      const currentRewards = referrerUser.referralRewards || 0;
      await strapi.entityService.update('plugin::users-permissions.user', referrerUser.id, {
        data: {
          totalReferrals: (referrerUser.totalReferrals || 0) + 1,
          referralRewards: parseFloat(currentRewards.toString()) + 10
        }
      });

      // Mettre à jour l'utilisateur parrainé
      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: { referredBy: referrerUser.id }
      });

      ctx.send({
        message: 'Parrainage effectué avec succès',
        referral
      });
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  // Récupérer les statistiques de parrainage
  async getReferralStats(ctx) {
    try {
      const userId = ctx.state.user.id;

      const user: any = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
      
      // Récupérer les parrainages effectués
      const referralsMade = await strapi.entityService.findMany('api::referral.referral', {
        filters: { referrer: userId },
        populate: ['referred']
      });

      // Récupérer les parrainages reçus
      const referralsReceived = await strapi.entityService.findMany('api::referral.referral', {
        filters: { referred: userId },
        populate: ['referrer']
      });

      // Récupérer l'utilisateur qui l'a parrainé
      const referredByUser = user.referredBy ? 
        await strapi.entityService.findOne('plugin::users-permissions.user', user.referredBy) : 
        null;

      const stats = {
        referralCode: user.referralCode,
        totalReferrals: user.totalReferrals || 0,
        referralRewards: user.referralRewards || 0,
        referralsMade: referralsMade,
        referralsReceived: referralsReceived,
        referredBy: referredByUser
      };

      ctx.send(stats);
    } catch (error) {
      ctx.throw(500, error);
    }
  },
  async useRewards(ctx) {
    try {
      const { amount } = ctx.request.body;
      const userId = ctx.state.user.id;

      console.log('💰 Backend: Utilisation récompenses - userId:', userId, 'amount:', amount);

      // Vérifier si l'utilisateur existe
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
      if (!user) {
        return ctx.badRequest('Utilisateur introuvable');
      }

      const currentRewards = user.referralRewards || 0;
      console.log('💰 Backend: Récompenses actuelles:', currentRewards);

      // Vérifier que le montant est valide
      if (!amount || amount <= 0) {
        return ctx.badRequest('Montant invalide');
      }

      if (amount > currentRewards) {
        return ctx.badRequest('Montant supérieur aux récompenses disponibles');
      }

      // Déduire le montant des récompenses
      const newRewardBalance = Math.max(0, currentRewards - amount);
      
      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: { 
          referralRewards: newRewardBalance
        }
      });

      console.log('✅ Backend: Récompenses déduites avec succès. Nouveau solde:', newRewardBalance);

      ctx.send({ 
        message: 'Récompenses utilisées avec succès',
        amountUsed: amount,
        remainingRewards: newRewardBalance
      });
    } catch (error) {
      console.error('❌ Backend: Erreur utilisation récompenses:', error);
      ctx.throw(500, 'Erreur lors de l\'utilisation des récompenses');
    }
  },

  generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

}));
