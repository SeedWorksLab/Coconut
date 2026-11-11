import type {
  SharedBalance,
  SharedPeriodReportData,
  SharedReportExpense,
  SharedReportMemberInfo,
  SharedSettlement,
  SharedSplitInput,
  SharedSplitMethod,
  SharedSplitRecord,
} from '../models';

export type SharedExpenseValidationError =
  | 'selectMember'
  | 'addMember'
  | 'negativeAmount'
  | 'splitTotal'
  | 'negativePercent'
  | 'percentTotal'
  | 'totalPositive'
  | 'addRestUnavailable'
  | 'descriptionRequired'
  | 'selectPayer'
  | 'unknownMember'
  | 'negativeSplit'
  | 'dateBeforePeriod'
  | 'dateFuture';

export type SplitResolution =
  | { ok: true; splits: SharedSplitRecord[] }
  | { ok: false; error: SharedExpenseValidationError };

export interface BalanceExpense {
  paidByMemberId: number;
  totalAmountCents: number;
  splits: SharedSplitRecord[];
}

export interface ReportExpenseInput extends BalanceExpense {
  description: string;
  date: string;
}

export interface BuildReportInput {
  spaceName: string;
  periodStart: string;
  periodEnd: string;
  closedAt: string;
  memberIds: number[];
  members: SharedReportMemberInfo[];
  expenses: ReportExpenseInput[];
}

const PERCENT_SCALE = 10000;

function allocateByWeights(totalCents: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    return weights.map(() => 0);
  }
  const exact = weights.map((weight) => (totalCents * weight) / totalWeight);
  const amounts = exact.map((value) => Math.floor(value));
  let remainder = totalCents - amounts.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => (b.fraction - a.fraction) || (a.index - b.index));
  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    amounts[order[cursor % order.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }
  return amounts;
}

export function parsePercentToBasisPoints(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  if (Number.isNaN(value) || value < 0) {
    return null;
  }
  return Math.round(value * 100);
}

export function formatBasisPoints(basisPoints: number): string {
  return (basisPoints / 100).toFixed(2);
}

export function resolveEqualSplit(
  totalCents: number,
  memberIds: number[]
): SplitResolution {
  if (memberIds.length === 0) {
    return { ok: false, error: 'selectMember' };
  }
  const amounts = allocateByWeights(totalCents, memberIds.map(() => 1));
  return {
    ok: true,
    splits: memberIds.map((memberId, index) => ({ memberId, amountCents: amounts[index] })),
  };
}

export function resolveExactSplit(
  totalCents: number,
  inputs: SharedSplitInput[]
): SplitResolution {
  if (inputs.length === 0) {
    return { ok: false, error: 'addMember' };
  }
  for (const input of inputs) {
    if ((input.amountCents ?? 0) < 0) {
      return { ok: false, error: 'negativeAmount' };
    }
  }
  const splits = inputs.map((input) => ({
    memberId: input.memberId,
    amountCents: input.amountCents ?? 0,
  }));
  const sum = splits.reduce((acc, split) => acc + split.amountCents, 0);
  if (sum !== totalCents) {
    return { ok: false, error: 'splitTotal' };
  }
  return { ok: true, splits };
}

export function resolvePercentageSplit(
  totalCents: number,
  inputs: SharedSplitInput[]
): SplitResolution {
  if (inputs.length === 0) {
    return { ok: false, error: 'addMember' };
  }
  const weights = inputs.map((input) => input.basisPoints ?? 0);
  if (weights.some((weight) => weight < 0)) {
    return { ok: false, error: 'negativePercent' };
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total !== PERCENT_SCALE) {
    return { ok: false, error: 'percentTotal' };
  }
  const amounts = allocateByWeights(totalCents, weights);
  return {
    ok: true,
    splits: inputs.map((input, index) => ({
      memberId: input.memberId,
      amountCents: amounts[index],
    })),
  };
}

export function resolveSplit(
  method: SharedSplitMethod,
  totalCents: number,
  inputs: SharedSplitInput[]
): SplitResolution {
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    return { ok: false, error: 'totalPositive' };
  }
  if (method === 'equal') {
    const selected = inputs.filter((input) => input.selected !== false);
    return resolveEqualSplit(totalCents, selected.map((input) => input.memberId));
  }
  if (method === 'exact') {
    return resolveExactSplit(totalCents, inputs);
  }
  return resolvePercentageSplit(totalCents, inputs);
}

export type FillRemainingResult =
  | { ok: true; memberId: number; value: number }
  | { ok: false; error: SharedExpenseValidationError };

function remainingSplitTarget(
  method: SharedSplitMethod,
  totalCents: number,
  inputs: SharedSplitInput[]
): { targetMemberId: number; remaining: number } | null {
  if (method === 'equal') {
    return null;
  }
  const field = method === 'exact' ? 'amountCents' : 'basisPoints';
  const totalValue = method === 'exact' ? totalCents : PERCENT_SCALE;
  const active = inputs.filter((input) => input.selected !== false);
  const empty = active.filter((input) => (input[field] ?? 0) === 0);
  if (empty.length !== 1) {
    return null;
  }
  const entered = active.reduce((sum, input) => sum + (input[field] ?? 0), 0);
  const remaining = totalValue - entered;
  if (remaining <= 0) {
    return null;
  }
  return { targetMemberId: empty[empty.length - 1].memberId, remaining };
}

export function canFillRemaining(
  method: SharedSplitMethod,
  totalCents: number,
  inputs: SharedSplitInput[]
): boolean {
  return remainingSplitTarget(method, totalCents, inputs) !== null;
}

export function fillRemainingSplit(
  method: SharedSplitMethod,
  totalCents: number,
  inputs: SharedSplitInput[]
): FillRemainingResult {
  const target = remainingSplitTarget(method, totalCents, inputs);
  if (target === null) {
    return {
      ok: false,
      error: 'addRestUnavailable',
    };
  }
  return { ok: true, memberId: target.targetMemberId, value: target.remaining };
}

export function validateExpense(params: {
  totalCents: number;
  description: string;
  paidByMemberId: number | null;
  memberIds: number[];
  splits: SharedSplitRecord[];
  date: string;
  periodStart: string;
  today: string;
}): { ok: true } | { ok: false; error: SharedExpenseValidationError } {
  if (!params.description.trim()) {
    return { ok: false, error: 'descriptionRequired' };
  }
  if (!Number.isInteger(params.totalCents) || params.totalCents <= 0) {
    return { ok: false, error: 'totalPositive' };
  }
  if (params.paidByMemberId === null || !params.memberIds.includes(params.paidByMemberId)) {
    return { ok: false, error: 'selectPayer' };
  }
  if (params.splits.length === 0) {
    return { ok: false, error: 'addMember' };
  }
  for (const split of params.splits) {
    if (!params.memberIds.includes(split.memberId)) {
      return { ok: false, error: 'unknownMember' };
    }
    if (!Number.isInteger(split.amountCents) || split.amountCents < 0) {
      return { ok: false, error: 'negativeSplit' };
    }
  }
  const sum = params.splits.reduce((acc, split) => acc + split.amountCents, 0);
  if (sum !== params.totalCents) {
    return { ok: false, error: 'splitTotal' };
  }
  if (params.date < params.periodStart) {
    return { ok: false, error: 'dateBeforePeriod' };
  }
  if (params.date > params.today) {
    return { ok: false, error: 'dateFuture' };
  }
  return { ok: true };
}

export function computeBalances(
  memberIds: number[],
  expenses: BalanceExpense[]
): SharedBalance[] {
  const paid = new Map<number, number>();
  const owed = new Map<number, number>();
  for (const memberId of memberIds) {
    paid.set(memberId, 0);
    owed.set(memberId, 0);
  }
  for (const expense of expenses) {
    paid.set(expense.paidByMemberId, (paid.get(expense.paidByMemberId) ?? 0) + expense.totalAmountCents);
    for (const split of expense.splits) {
      owed.set(split.memberId, (owed.get(split.memberId) ?? 0) + split.amountCents);
    }
  }
  return memberIds.map((memberId) => {
    const paidCents = paid.get(memberId) ?? 0;
    const owedCents = owed.get(memberId) ?? 0;
    return { memberId, paidCents, owedCents, netCents: paidCents - owedCents };
  });
}

export function settleBalances(balances: SharedBalance[]): SharedSettlement[] {
  const creditors = balances
    .filter((balance) => balance.netCents > 0)
    .map((balance) => ({ memberId: balance.memberId, remaining: balance.netCents }))
    .sort((a, b) => (b.remaining - a.remaining) || (a.memberId - b.memberId));
  const debtors = balances
    .filter((balance) => balance.netCents < 0)
    .map((balance) => ({ memberId: balance.memberId, remaining: -balance.netCents }))
    .sort((a, b) => (b.remaining - a.remaining) || (a.memberId - b.memberId));

  const settlements: SharedSettlement[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(debtor.remaining, creditor.remaining);
    if (amountCents > 0) {
      settlements.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amountCents,
      });
    }
    debtor.remaining -= amountCents;
    creditor.remaining -= amountCents;
    if (debtor.remaining === 0) {
      debtorIndex += 1;
    }
    if (creditor.remaining === 0) {
      creditorIndex += 1;
    }
  }
  return settlements;
}

export function buildPeriodReport(input: BuildReportInput): SharedPeriodReportData {
  const expenses: SharedReportExpense[] = input.expenses.map((expense) => ({
    description: expense.description,
    date: expense.date,
    totalAmountCents: expense.totalAmountCents,
    paidByMemberId: expense.paidByMemberId,
    splits: expense.splits.map((split) => ({
      memberId: split.memberId,
      amountCents: split.amountCents,
    })),
  }));
  const balances = computeBalances(input.memberIds, input.expenses);
  return {
    spaceName: input.spaceName,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    closedAt: input.closedAt,
    members: input.members,
    expenses,
    memberTotals: balances.map((balance) => ({
      memberId: balance.memberId,
      paidCents: balance.paidCents,
    })),
    balances,
    settlements: settleBalances(balances),
  };
}

export function deriveLinkedTransaction(
  expense: { date: string; description: string; uuid: string | null },
  split: SharedSplitRecord
): { date: string; amountCents: number; merchant: string; note: string; originType: string; originId: string | null } {
  return {
    date: expense.date,
    amountCents: split.amountCents,
    merchant: expense.description,
    note: 'Shared expense',
    originType: 'shared',
    originId: expense.uuid,
  };
}
