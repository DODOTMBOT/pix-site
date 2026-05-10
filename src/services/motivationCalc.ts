import type { MotivationPlan, MotivationResult, MotivationMetric } from '../types';

export function calcMotivation(plan: MotivationPlan, metrics: MotivationMetric[]): MotivationResult {
  const isReset = plan.resetConditions.some(r => r.triggered);

  if (isReset) {
    return { planId: plan.id, bonusAmount: 0, wowAmount: 0, totalAmount: 0, isReset: true, breakdown: [] };
  }

  const metricMap = new Map(metrics.map(m => [m.id, m]));

  const ratingsTargets = plan.targets.filter(t => metricMap.get(t.metricId)?.block === 'ratings');
  const profitTargets  = plan.targets.filter(t => metricMap.get(t.metricId)?.block === 'profit');

  const ratingsBonusFund = plan.bonusFund * plan.ratingsWeight / 100;
  const profitBonusFund  = plan.bonusFund * plan.profitWeight  / 100;
  const ratingsWowFund   = plan.wowFund   * plan.ratingsWeight / 100;
  const profitWowFund    = plan.wowFund   * plan.profitWeight  / 100;

  function calcBlock(
    targets: MotivationPlan['targets'],
    bonusFund: number,
    wowFund: number,
  ) {
    const totalW = targets.reduce((s, t) => s + t.weight, 0) || 1;
    return targets.map(t => {
      const metric    = metricMap.get(t.metricId);
      const share     = t.weight / totalW;
      const earned    = t.fulfilled    ? bonusFund * share : 0;
      const wowEarned = t.wowFulfilled ? wowFund   * share : 0;
      return {
        metricId:    t.metricId,
        metricName:  metric?.name ?? t.metricId,
        block:       metric?.block ?? 'ratings',
        weight:      t.weight,
        blockWeight: share,
        earned,
        wowEarned,
      };
    });
  }

  const breakdown = [
    ...calcBlock(ratingsTargets, ratingsBonusFund, ratingsWowFund),
    ...calcBlock(profitTargets,  profitBonusFund,  profitWowFund),
  ];

  const bonusAmount = breakdown.reduce((s, b) => s + b.earned, 0);
  const wowAmount   = breakdown.reduce((s, b) => s + b.wowEarned, 0);

  return { planId: plan.id, bonusAmount, wowAmount, totalAmount: bonusAmount + wowAmount, isReset: false, breakdown };
}
