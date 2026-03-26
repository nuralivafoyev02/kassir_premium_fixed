(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KassaSubscription = factory();
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  var PLAN_CODES = Object.freeze({
    FREE: 'free',
    PREMIUM_MONTHLY: 'premium_monthly',
  });

  var SUBSCRIPTION_STATUSES = Object.freeze({
    FREE: 'free',
    TRIAL: 'trial',
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELED: 'canceled',
    GRACE: 'grace',
  });

  var PRICING_PLAN_MAP = Object.freeze({
    free: Object.freeze({
      code: PLAN_CODES.FREE,
      title: 'Bepul',
      price_label: '0 so\'m',
      billing_period: 'free',
      monthly_price_uzs: 0,
      highlight: false,
    }),
    premium_monthly: Object.freeze({
      code: PLAN_CODES.PREMIUM_MONTHLY,
      title: 'Premium',
      price_label: '21 999 so\'m / oy',
      billing_period: 'monthly',
      monthly_price_uzs: 21999,
      highlight: true,
    }),
  });

  var FREE_FEATURES = Object.freeze([
    'Oddiy kirim qo\'shish',
    'Oddiy chiqim qo\'shish',
    'Tarixni ko\'rish',
    'Basic dashboard',
    'Basic kategoriya ishlatish',
    'Bot va mini app asosiy sinxron ishlashi',
    '1 ta faol reja',
    '1 ta faol qarz',
    '1 ta faol limit',
    'Basic reminder',
  ]);

  var PREMIUM_FEATURES = Object.freeze([
    'Cheksiz reja yaratish',
    'Cheksiz qarz yaratish',
    'Cheksiz limit yaratish',
    'Ertalabgi va kechki eslatmalar',
    'Custom reminder vaqtlarini sozlash',
    'PDF va kengaytirilgan hisobotlar',
    'Chuqur statistika va kengaytirilgan analiz',
    'Kelajakdagi premium-only AI qulayliklar',
  ]);

  var FEATURE_GATES = Object.freeze({
    plan_create: Object.freeze({
      key: 'plan_create',
      kind: 'count_limit',
      freeLimit: 1,
      usageKeys: ['activePlansCount', 'activeLimitsCount'],
      premiumBenefitKeys: ['unlimited_plans', 'unlimited_limits', 'advanced_reports'],
    }),
    limit_create: Object.freeze({
      key: 'limit_create',
      kind: 'count_limit',
      freeLimit: 1,
      usageKeys: ['activeLimitsCount', 'activePlansCount'],
      premiumBenefitKeys: ['unlimited_limits', 'unlimited_plans', 'advanced_reports'],
    }),
    debt_create: Object.freeze({
      key: 'debt_create',
      kind: 'count_limit',
      freeLimit: 1,
      usageKeys: ['activeDebtsCount'],
      premiumBenefitKeys: ['unlimited_debts', 'daily_reminders', 'custom_reminder_time'],
    }),
    custom_reminder_time: Object.freeze({
      key: 'custom_reminder_time',
      kind: 'premium_only',
      premiumBenefitKeys: ['custom_reminder_time', 'daily_reminders'],
    }),
    daily_morning_reminder: Object.freeze({
      key: 'daily_morning_reminder',
      kind: 'premium_only',
      premiumBenefitKeys: ['daily_reminders'],
    }),
    daily_evening_reminder: Object.freeze({
      key: 'daily_evening_reminder',
      kind: 'premium_only',
      premiumBenefitKeys: ['daily_reminders', 'advanced_reports'],
    }),
    advanced_reports: Object.freeze({
      key: 'advanced_reports',
      kind: 'premium_only',
      premiumBenefitKeys: ['advanced_reports', 'deep_analytics'],
    }),
    deep_analytics: Object.freeze({
      key: 'deep_analytics',
      kind: 'premium_only',
      premiumBenefitKeys: ['deep_analytics', 'advanced_reports', 'ai_insights'],
    }),
    ai_insights: Object.freeze({
      key: 'ai_insights',
      kind: 'premium_only',
      premiumBenefitKeys: ['ai_insights', 'deep_analytics'],
    }),
  });

  var SUBSCRIPTION_FIELDS = Object.freeze([
    'plan_code',
    'subscription_status',
    'subscription_start_at',
    'subscription_end_at',
    'trial_end_at',
    'canceled_at',
    'grace_until',
    'created_at',
    'updated_at',
  ]);

  function normalizePlanCode(value) {
    return String(value || '').trim() === PLAN_CODES.PREMIUM_MONTHLY
      ? PLAN_CODES.PREMIUM_MONTHLY
      : PLAN_CODES.FREE;
  }

  function normalizeSubscriptionStatus(value) {
    var raw = String(value || '').trim();
    return Object.prototype.hasOwnProperty.call(SUBSCRIPTION_STATUSES, raw.toUpperCase())
      ? SUBSCRIPTION_STATUSES[raw.toUpperCase()]
      : (
        raw === SUBSCRIPTION_STATUSES.TRIAL ||
        raw === SUBSCRIPTION_STATUSES.ACTIVE ||
        raw === SUBSCRIPTION_STATUSES.EXPIRED ||
        raw === SUBSCRIPTION_STATUSES.CANCELED ||
        raw === SUBSCRIPTION_STATUSES.GRACE ||
        raw === SUBSCRIPTION_STATUSES.FREE
          ? raw
          : SUBSCRIPTION_STATUSES.FREE
      );
  }

  function parseDate(value) {
    if (!value) return null;
    var date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function resolveNow(input) {
    return parseDate(input) || new Date();
  }

  function hasSubscriptionSchema(record) {
    if (!record || typeof record !== 'object') return false;
    return SUBSCRIPTION_FIELDS.some(function (field) {
      return Object.prototype.hasOwnProperty.call(record, field);
    });
  }

  function pickEffectiveStatus(record, now) {
    var planCode = normalizePlanCode(record && (record.plan_code || record.planCode));
    var rawStatus = normalizeSubscriptionStatus(record && (record.subscription_status || record.subscriptionStatus || (planCode === PLAN_CODES.FREE ? SUBSCRIPTION_STATUSES.FREE : SUBSCRIPTION_STATUSES.ACTIVE)));
    var subscriptionEndAt = parseDate(record && (record.subscription_end_at || record.subscriptionEndAt));
    var trialEndAt = parseDate(record && (record.trial_end_at || record.trialEndAt));
    var graceUntil = parseDate(record && (record.grace_until || record.graceUntil));
    var nowMs = resolveNow(now).getTime();

    if (planCode === PLAN_CODES.FREE) return SUBSCRIPTION_STATUSES.FREE;

    if (rawStatus === SUBSCRIPTION_STATUSES.TRIAL) {
      if (trialEndAt && trialEndAt.getTime() < nowMs) return SUBSCRIPTION_STATUSES.EXPIRED;
      return SUBSCRIPTION_STATUSES.TRIAL;
    }

    if (rawStatus === SUBSCRIPTION_STATUSES.GRACE) {
      if (graceUntil && graceUntil.getTime() < nowMs) return SUBSCRIPTION_STATUSES.EXPIRED;
      return SUBSCRIPTION_STATUSES.GRACE;
    }

    if (rawStatus === SUBSCRIPTION_STATUSES.CANCELED) {
      if (graceUntil && graceUntil.getTime() >= nowMs) return SUBSCRIPTION_STATUSES.GRACE;
      if (subscriptionEndAt && subscriptionEndAt.getTime() >= nowMs) return SUBSCRIPTION_STATUSES.CANCELED;
      return SUBSCRIPTION_STATUSES.EXPIRED;
    }

    if (rawStatus === SUBSCRIPTION_STATUSES.ACTIVE) {
      if (subscriptionEndAt && subscriptionEndAt.getTime() < nowMs) return SUBSCRIPTION_STATUSES.EXPIRED;
      return SUBSCRIPTION_STATUSES.ACTIVE;
    }

    return rawStatus === SUBSCRIPTION_STATUSES.EXPIRED
      ? SUBSCRIPTION_STATUSES.EXPIRED
      : SUBSCRIPTION_STATUSES.FREE;
  }

  function resolveAccessUntil(record, effectiveStatus) {
    if (effectiveStatus === SUBSCRIPTION_STATUSES.TRIAL) {
      return parseDate(record && (record.trial_end_at || record.trialEndAt));
    }
    if (effectiveStatus === SUBSCRIPTION_STATUSES.GRACE) {
      return parseDate(record && (record.grace_until || record.graceUntil))
        || parseDate(record && (record.subscription_end_at || record.subscriptionEndAt));
    }
    if (effectiveStatus === SUBSCRIPTION_STATUSES.ACTIVE || effectiveStatus === SUBSCRIPTION_STATUSES.CANCELED) {
      return parseDate(record && (record.subscription_end_at || record.subscriptionEndAt));
    }
    return null;
  }

  function hasPremiumAccessFromStatus(planCode, effectiveStatus) {
    if (planCode !== PLAN_CODES.PREMIUM_MONTHLY) return false;
    return (
      effectiveStatus === SUBSCRIPTION_STATUSES.TRIAL ||
      effectiveStatus === SUBSCRIPTION_STATUSES.ACTIVE ||
      effectiveStatus === SUBSCRIPTION_STATUSES.GRACE ||
      effectiveStatus === SUBSCRIPTION_STATUSES.CANCELED
    );
  }

  function getUiStatusLabel(status) {
    if (status === SUBSCRIPTION_STATUSES.TRIAL) return 'Sinov muddati';
    if (
      status === SUBSCRIPTION_STATUSES.ACTIVE ||
      status === SUBSCRIPTION_STATUSES.GRACE ||
      status === SUBSCRIPTION_STATUSES.CANCELED
    ) {
      return 'Obuna bo\'lgan';
    }
    if (status === SUBSCRIPTION_STATUSES.EXPIRED) return 'Obuna muddati tugagan';
    return 'Obuna bo\'lmagan';
  }

  function getBadgeTone(snapshot) {
    if (snapshot.isPremium && snapshot.effectiveStatus === SUBSCRIPTION_STATUSES.TRIAL) return 'trial';
    if (snapshot.isPremium) return 'premium';
    if (snapshot.effectiveStatus === SUBSCRIPTION_STATUSES.EXPIRED) return 'expired';
    return 'free';
  }

  function getSubscriptionBadge(snapshotOrRecord, options) {
    var snapshot = snapshotOrRecord && snapshotOrRecord.planCode
      ? snapshotOrRecord
      : getSubscriptionSnapshot(snapshotOrRecord, options);

    return {
      label: getUiStatusLabel(snapshot.effectiveStatus),
      tone: getBadgeTone(snapshot),
      plan_title: snapshot.planTitle,
    };
  }

  function getSubscriptionSnapshot(record, options) {
    var schemaReady = options && Object.prototype.hasOwnProperty.call(options, 'schemaReady')
      ? options.schemaReady !== false
      : hasSubscriptionSchema(record);
    var now = resolveNow(options && options.now);
    var planCode = normalizePlanCode(record && (record.plan_code || record.planCode));
    var rawStatus = normalizeSubscriptionStatus(record && (record.subscription_status || record.subscriptionStatus || (planCode === PLAN_CODES.FREE ? SUBSCRIPTION_STATUSES.FREE : SUBSCRIPTION_STATUSES.ACTIVE)));
    var effectiveStatus = pickEffectiveStatus(record || {}, now);
    var plan = PRICING_PLAN_MAP[planCode] || PRICING_PLAN_MAP[PLAN_CODES.FREE];
    var accessUntil = resolveAccessUntil(record || {}, effectiveStatus);
    var isPremium = hasPremiumAccessFromStatus(planCode, effectiveStatus);

    return {
      schemaReady: schemaReady,
      now: now.toISOString(),
      planCode: plan.code,
      rawStatus: rawStatus,
      effectiveStatus: effectiveStatus,
      planTitle: plan.title,
      priceLabel: plan.price_label,
      monthlyPriceUzs: plan.monthly_price_uzs,
      billingPeriod: plan.billing_period,
      subscriptionStartAt: parseDate(record && (record.subscription_start_at || record.subscriptionStartAt)),
      subscriptionEndAt: parseDate(record && (record.subscription_end_at || record.subscriptionEndAt)),
      trialEndAt: parseDate(record && (record.trial_end_at || record.trialEndAt)),
      canceledAt: parseDate(record && (record.canceled_at || record.canceledAt)),
      graceUntil: parseDate(record && (record.grace_until || record.graceUntil)),
      accessUntil: accessUntil,
      isPremium: isPremium,
      uiStatusLabel: getUiStatusLabel(effectiveStatus),
      limits: {
        activePlans: isPremium ? null : 1,
        activeDebts: isPremium ? null : 1,
        activeLimits: isPremium ? null : 1,
      },
      features: {
        basicTransactions: true,
        basicHistory: true,
        basicDashboard: true,
        basicCategories: true,
        basicSync: true,
        unlimitedPlans: isPremium,
        unlimitedDebts: isPremium,
        unlimitedLimits: isPremium,
        dailyMorningReminder: isPremium,
        dailyEveningReminder: isPremium,
        customReminderTime: isPremium,
        advancedReports: isPremium,
        deepAnalytics: isPremium,
        aiInsights: isPremium,
      },
      badge: null,
    };
  }

  function finalizeSnapshot(snapshot) {
    if (!snapshot) return snapshot;
    snapshot.badge = getSubscriptionBadge(snapshot, {});
    return snapshot;
  }

  function getPricingPlans() {
    return [
      {
        code: PLAN_CODES.FREE,
        title: PRICING_PLAN_MAP.free.title,
        price_label: PRICING_PLAN_MAP.free.price_label,
        monthly_price_uzs: PRICING_PLAN_MAP.free.monthly_price_uzs,
        features: FREE_FEATURES.slice(),
      },
      {
        code: PLAN_CODES.PREMIUM_MONTHLY,
        title: PRICING_PLAN_MAP.premium_monthly.title,
        price_label: PRICING_PLAN_MAP.premium_monthly.price_label,
        monthly_price_uzs: PRICING_PLAN_MAP.premium_monthly.monthly_price_uzs,
        features: PREMIUM_FEATURES.slice(),
      },
    ];
  }

  function resolveUsage(context, keys) {
    var list = Array.isArray(keys) ? keys : [keys];
    for (var i = 0; i < list.length; i += 1) {
      var key = list[i];
      var value = Number(context && context[key]);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return 0;
  }

  function buildGateResult(snapshot, gate, allowed, extras) {
    return {
      allowed: allowed,
      featureKey: gate.key,
      gateKind: gate.kind,
      snapshot: snapshot,
      requiredPlanCode: PLAN_CODES.PREMIUM_MONTHLY,
      requiredPlanTitle: PRICING_PLAN_MAP.premium_monthly.title,
      premiumBenefitKeys: (gate.premiumBenefitKeys || []).slice(),
      freeLimit: extras && Object.prototype.hasOwnProperty.call(extras, 'freeLimit') ? extras.freeLimit : null,
      usage: extras && Object.prototype.hasOwnProperty.call(extras, 'usage') ? extras.usage : null,
      remaining: extras && Object.prototype.hasOwnProperty.call(extras, 'remaining') ? extras.remaining : null,
      reason: extras && extras.reason ? extras.reason : null,
      degraded: extras && extras.degraded === true,
    };
  }

  function evaluateFeatureGate(featureKey, record, context) {
    var gate = FEATURE_GATES[featureKey];
    if (!gate) {
      throw new Error('Unknown feature gate: ' + featureKey);
    }

    var snapshot = finalizeSnapshot((context && context.snapshot) || getSubscriptionSnapshot(record || {}, context || {}));
    var relaxedWhenSchemaMissing = !context || context.relaxedWhenSchemaMissing !== false;

    if (!snapshot.schemaReady && relaxedWhenSchemaMissing) {
      return buildGateResult(snapshot, gate, true, { degraded: true, reason: 'schema_missing' });
    }

    if (gate.kind === 'premium_only') {
      return buildGateResult(
        snapshot,
        gate,
        snapshot.isPremium,
        { reason: snapshot.isPremium ? null : 'premium_required' }
      );
    }

    var usage = resolveUsage(context || {}, gate.usageKeys);
    var freeLimit = gate.freeLimit;
    var remaining = snapshot.isPremium ? null : Math.max(0, freeLimit - usage);
    var allowed = snapshot.isPremium || usage < freeLimit;

    return buildGateResult(
      snapshot,
      gate,
      allowed,
      {
        freeLimit: snapshot.isPremium ? null : freeLimit,
        usage: usage,
        remaining: remaining,
        reason: allowed ? null : 'limit_reached',
      }
    );
  }

  function canCreatePlan(record, context) {
    return evaluateFeatureGate('plan_create', record, context);
  }

  function canCreateLimit(record, context) {
    return evaluateFeatureGate('limit_create', record, context);
  }

  function canCreateDebt(record, context) {
    return evaluateFeatureGate('debt_create', record, context);
  }

  function canUseAdvancedReminders(record, context) {
    return evaluateFeatureGate('custom_reminder_time', record, context);
  }

  function canUseAdvancedReports(record, context) {
    return evaluateFeatureGate('advanced_reports', record, context);
  }

  function canUseDeepAnalytics(record, context) {
    return evaluateFeatureGate('deep_analytics', record, context);
  }

  function canUseAiInsights(record, context) {
    return evaluateFeatureGate('ai_insights', record, context);
  }

  function canUseNotificationFeature(record, notificationKey, context) {
    if (notificationKey === 'daily_reminder') {
      return evaluateFeatureGate('daily_morning_reminder', record, context);
    }
    if (notificationKey === 'daily_report') {
      return evaluateFeatureGate('daily_evening_reminder', record, context);
    }
    return buildGateResult(
      finalizeSnapshot((context && context.snapshot) || getSubscriptionSnapshot(record || {}, context || {})),
      { key: notificationKey, kind: 'basic', premiumBenefitKeys: [] },
      true,
      {}
    );
  }

  return {
    PLAN_CODES: PLAN_CODES,
    SUBSCRIPTION_STATUSES: SUBSCRIPTION_STATUSES,
    SUBSCRIPTION_FIELDS: SUBSCRIPTION_FIELDS,
    FEATURE_GATES: FEATURE_GATES,
    FREE_FEATURES: FREE_FEATURES,
    PREMIUM_FEATURES: PREMIUM_FEATURES,
    PRICING_PLAN_MAP: PRICING_PLAN_MAP,
    normalizePlanCode: normalizePlanCode,
    normalizeSubscriptionStatus: normalizeSubscriptionStatus,
    hasSubscriptionSchema: hasSubscriptionSchema,
    getPricingPlans: getPricingPlans,
    getSubscriptionSnapshot: function (record, options) {
      return finalizeSnapshot(getSubscriptionSnapshot(record || {}, options || {}));
    },
    getSubscriptionBadge: getSubscriptionBadge,
    evaluateFeatureGate: evaluateFeatureGate,
    canCreatePlan: canCreatePlan,
    canCreateLimit: canCreateLimit,
    canCreateDebt: canCreateDebt,
    canUseAdvancedReminders: canUseAdvancedReminders,
    canUseAdvancedReports: canUseAdvancedReports,
    canUseDeepAnalytics: canUseDeepAnalytics,
    canUseAiInsights: canUseAiInsights,
    canUseNotificationFeature: canUseNotificationFeature,
  };
});
