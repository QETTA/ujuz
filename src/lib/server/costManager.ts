/**
 * UJUz - Cost Manager Service
 * Claude API cost tracking + budget management + auto model selection
 * Adapted for Cloudflare Workers: lazy sync instead of setInterval
 */

import { getMongoDb } from './mongodb';
import { U } from './collections';
import type { CostDailyDoc, CostModelUsageDoc } from './dbTypes';
import { logger } from './logger';

// ─── Pricing (USD per 1M tokens) ────────────────────────────

interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

const CLAUDE_PRICING: Record<string, ModelPricing> = {
  'claude-haiku-4-5-20251001': { inputPerMillion: 1.0, outputPerMillion: 5.0 },
  'claude-sonnet-4-5-20250929': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'claude-sonnet-4-20250514': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'claude-opus-4-6': { inputPerMillion: 15.0, outputPerMillion: 75.0 },
};

// ─── Task → Model Mapping ───────────────────────────────────

export type TaskType = 'chat' | 'admission' | 'analysis' | 'summary';

const TASK_MODEL_MAP: Record<TaskType, string> = {
  chat: 'claude-sonnet-4-20250514',
  admission: 'claude-haiku-4-5-20251001',
  analysis: 'claude-sonnet-4-5-20250929',
  summary: 'claude-haiku-4-5-20251001',
};

const FALLBACK_MODEL = 'claude-haiku-4-5-20251001';

// ─── Budget Defaults ────────────────────────────────────────

const DEFAULT_DAILY_BUDGET_USD = 10;
const DEFAULT_MONTHLY_BUDGET_USD = 100;
const BUDGET_WARNING_THRESHOLD = 0.8;

// ─── Types ──────────────────────────────────────────────────

interface DailySummary {
  date: string;
  totalCostUsd: number;
  callCount: number;
  byModel: Record<string, CostModelUsageDoc>;
}

export interface CostSummary {
  daily: {
    spent: number;
    budget: number;
    remaining: number;
    callCount: number;
  };
  monthly: {
    spent: number;
    budget: number;
    remaining: number;
  };
  lastSync: string | null;
}

// ─── CostManager Class ─────────────────────────────────────

class CostManager {
  private dailyBudget: number;
  private monthlyBudget: number;
  private todaySummary: DailySummary;
  private monthlyCost: number = 0;
  private lastSync: Date | null = null;
  private dirty = false;

  constructor(dailyBudget?: number, monthlyBudget?: number) {
    this.dailyBudget = dailyBudget ?? DEFAULT_DAILY_BUDGET_USD;
    this.monthlyBudget = monthlyBudget ?? DEFAULT_MONTHLY_BUDGET_USD;
    this.todaySummary = this.emptyDailySummary();
  }

  private emptyDailySummary(): DailySummary {
    return {
      date: new Date().toISOString().slice(0, 10),
      totalCostUsd: 0,
      callCount: 0,
      byModel: {},
    };
  }

  private currentMonth: string = new Date().toISOString().slice(0, 7);

  private ensureToday(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.todaySummary.date !== today) {
      // Reset monthly cost on month boundary
      const newMonth = today.slice(0, 7);
      if (newMonth !== this.currentMonth) {
        this.monthlyCost = 0;
        this.currentMonth = newMonth;
      }
      this.todaySummary = this.emptyDailySummary();
    }
  }

  selectModelWithBudget(taskType: TaskType): string {
    this.ensureToday();

    const dailyUsage = this.todaySummary.totalCostUsd / this.dailyBudget;
    const monthlyUsage = this.monthlyCost / this.monthlyBudget;

    if (dailyUsage >= BUDGET_WARNING_THRESHOLD || monthlyUsage >= BUDGET_WARNING_THRESHOLD) {
      return FALLBACK_MODEL;
    }

    return TASK_MODEL_MAP[taskType] ?? FALLBACK_MODEL;
  }

  recordUsage(params: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    taskType: TaskType;
  }): number {
    this.ensureToday();

    if (params.inputTokens < 0 || params.outputTokens < 0) {
      return 0;
    }

    const pricing = CLAUDE_PRICING[params.model];
    if (!pricing) {
      logger.warn('Unknown model for cost tracking, defaulting to Sonnet pricing', { model: params.model });
    }
    const p = pricing ?? CLAUDE_PRICING['claude-sonnet-4-20250514'];
    const costUsd =
      (params.inputTokens / 1_000_000) * p.inputPerMillion +
      (params.outputTokens / 1_000_000) * p.outputPerMillion;

    this.todaySummary.totalCostUsd += costUsd;
    this.todaySummary.callCount += 1;

    if (!this.todaySummary.byModel[params.model]) {
      this.todaySummary.byModel[params.model] = { calls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 };
    }
    const modelSummary = this.todaySummary.byModel[params.model];
    modelSummary.calls += 1;
    modelSummary.costUsd += costUsd;
    modelSummary.inputTokens += params.inputTokens;
    modelSummary.outputTokens += params.outputTokens;

    this.monthlyCost += costUsd;
    this.dirty = true;

    return costUsd;
  }

  getSummary(): CostSummary {
    this.ensureToday();

    return {
      daily: {
        spent: Number(this.todaySummary.totalCostUsd.toFixed(4)),
        budget: this.dailyBudget,
        remaining: Number(Math.max(0, this.dailyBudget - this.todaySummary.totalCostUsd).toFixed(4)),
        callCount: this.todaySummary.callCount,
      },
      monthly: {
        spent: Number(this.monthlyCost.toFixed(4)),
        budget: this.monthlyBudget,
        remaining: Number(Math.max(0, this.monthlyBudget - this.monthlyCost).toFixed(4)),
      },
      lastSync: this.lastSync?.toISOString() ?? null,
    };
  }

  async loadFromDb(): Promise<void> {
    try {
      const db = getMongoDb();
      if (!db) return;

      const today = new Date().toISOString().slice(0, 10);
      const monthStart = today.slice(0, 7);
      const costCollection = db.collection<CostDailyDoc>(U.COST_TRACKING);

      const todayDoc = await costCollection.findOne({ date: today });
      if (todayDoc) {
        this.todaySummary = {
          date: todayDoc.date,
          totalCostUsd: todayDoc.totalCostUsd ?? 0,
          callCount: todayDoc.callCount ?? 0,
          byModel: todayDoc.byModel ?? {},
        };
      }

      const monthlyDocs = await costCollection
        .find(
          { date: { $regex: `^${monthStart}` } },
          { projection: { _id: 0, date: 1, totalCostUsd: 1 } },
        )
        .toArray();
      this.currentMonth = monthStart;

      this.monthlyCost = monthlyDocs.reduce((sum, doc) => sum + (doc.totalCostUsd ?? 0), 0);
      this.lastSync = new Date();
    } catch {
      // DB load failure is non-fatal
    }
  }

  /** Lazy sync — called after each API request instead of setInterval */
  async syncToDb(): Promise<void> {
    if (!this.dirty) return;

    try {
      const db = getMongoDb();
      if (!db) return;

      this.ensureToday();

      await db.collection<CostDailyDoc>(U.COST_TRACKING).updateOne(
        { date: this.todaySummary.date },
        {
          $set: {
            totalCostUsd: this.todaySummary.totalCostUsd,
            callCount: this.todaySummary.callCount,
            byModel: this.todaySummary.byModel,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            date: this.todaySummary.date,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );

      this.dirty = false;
      this.lastSync = new Date();
    } catch {
      // Sync failure is non-fatal
    }
  }

  setBudgets(daily?: number, monthly?: number): void {
    if (daily != null) this.dailyBudget = daily;
    if (monthly != null) this.monthlyBudget = monthly;
  }
}

// ─── Singleton ──────────────────────────────────────────────

let _instance: CostManager | null = null;
let _loadPromise: Promise<void> | null = null;

export function getCostManager(dailyBudget?: number, monthlyBudget?: number): CostManager {
  if (!_instance) {
    _instance = new CostManager(dailyBudget, monthlyBudget);
    // Lazy load from DB on first instantiation (non-blocking, non-fatal)
    _loadPromise = _instance.loadFromDb().catch(() => {});
  } else if (dailyBudget != null || monthlyBudget != null) {
    _instance.setBudgets(dailyBudget, monthlyBudget);
  }
  return _instance;
}

/** Ensure cost data is loaded before budget-critical operations */
export async function ensureCostLoaded(): Promise<void> {
  if (_loadPromise) await _loadPromise;
}
