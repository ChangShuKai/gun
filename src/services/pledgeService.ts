import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PledgeContract,
  PledgeResult,
  PledgeStats,
  SnapshotMetadata,
  PledgeRuleType,
  PenaltyType,
} from '../types';
import { danmakuService } from './danmakuService';

const STORAGE_KEY_PLEDGE_STATS = '@vault_pledge_stats';
const STORAGE_KEY_ACTIVE_CONTRACT = '@vault_active_pledge_contract';

export const DEFAULT_PLEDGE_STATS: PledgeStats = {
  credits: 500, // Initial balance
  streak: 0,
  totalWins: 0,
  totalLosses: 0,
  lockoutUntil: null,
};

export const PRESET_CONTRACTS: {
  id: string;
  title: string;
  ruleType: PledgeRuleType;
  targetMinutes: number;
  targetEdgeCount: number;
  penaltyType: PenaltyType;
  stakeCredits: number;
  desc: string;
}[] = [
  {
    id: 'preset_novice',
    title: '入門自律約定',
    ruleType: 'TARGET_TIME',
    targetMinutes: 15,
    targetEdgeCount: 2,
    penaltyType: 'LOCKOUT_12H',
    stakeCredits: 100,
    desc: '撐滿 15 分鐘並達成 2 次 Edge 急停，違約鎖定 12 小時。',
  },
  {
    id: 'preset_iron',
    title: '鋼鐵海綿體賭局',
    ruleType: 'EDGE_COUNT',
    targetMinutes: 25,
    targetEdgeCount: 4,
    penaltyType: 'LOCKOUT_24H',
    stakeCredits: 300,
    desc: '挑戰 25 分鐘與 4 次深度急停冷靜，違約全面封印 24 小時！',
  },
  {
    id: 'preset_supreme',
    title: '極限控射禁慾契約',
    ruleType: 'NO_RELEASE',
    targetMinutes: 35,
    targetEdgeCount: 6,
    penaltyType: 'PANEL_ROAST',
    stakeCredits: 500,
    desc: '35 分鐘 6 次臨界點控煞，違約強制接受虛擬圍觀團公開毒舌審訊！',
  },
];

class PledgeService {
  private static instance: PledgeService;
  private currentStats: PledgeStats = DEFAULT_PLEDGE_STATS;
  private activeContract: PledgeContract | null = null;
  private isLoaded: boolean = false;

  public static getInstance(): PledgeService {
    if (!PledgeService.instance) {
      PledgeService.instance = new PledgeService();
    }
    return PledgeService.instance;
  }

  public async getStats(): Promise<PledgeStats> {
    if (!this.isLoaded) {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_PLEDGE_STATS);
        if (stored) {
          this.currentStats = { ...DEFAULT_PLEDGE_STATS, ...JSON.parse(stored) };
        }
      } catch {
        // Fallback
      }
      this.isLoaded = true;
    }
    return { ...this.currentStats };
  }

  public async saveStats(stats: PledgeStats): Promise<void> {
    this.currentStats = stats;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PLEDGE_STATS, JSON.stringify(stats));
    } catch {
      // Ignored
    }
  }

  public async getActiveContract(): Promise<PledgeContract | null> {
    if (!this.activeContract) {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_ACTIVE_CONTRACT);
        if (stored) {
          this.activeContract = JSON.parse(stored);
        }
      } catch {
        this.activeContract = null;
      }
    }
    return this.activeContract;
  }

  public async setActiveContract(contract: PledgeContract | null): Promise<void> {
    this.activeContract = contract;
    try {
      if (contract) {
        await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_CONTRACT, JSON.stringify(contract));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY_ACTIVE_CONTRACT);
      }
    } catch {
      // Ignored
    }
  }

  public async isLockedOut(): Promise<{
    isLocked: boolean;
    remainingSeconds: number;
    reason: string;
  }> {
    const stats = await this.getStats();
    if (!stats.lockoutUntil) {
      return { isLocked: false, remainingSeconds: 0, reason: '' };
    }

    const now = Date.now();
    if (stats.lockoutUntil > now) {
      const remainingSeconds = Math.round((stats.lockoutUntil - now) / 1000);
      return {
        isLocked: true,
        remainingSeconds,
        reason: '因違反自律契約賭局，正處於懲罰冷卻鎖定中',
      };
    }

    // Lock expired, clean up
    stats.lockoutUntil = null;
    await this.saveStats(stats);
    return { isLocked: false, remainingSeconds: 0, reason: '' };
  }

  public async emergencyUnlock(): Promise<void> {
    const stats = await this.getStats();
    stats.lockoutUntil = null;
    await this.saveStats(stats);
  }

  /**
   * Settles the currently active pledge upon session termination
   */
  public async settlePledge(
    actualSeconds: number,
    snapshots: SnapshotMetadata[]
  ): Promise<PledgeResult | null> {
    const contract = await this.getActiveContract();
    if (!contract) return null;

    // Calculate actual edge count
    const actualEdgeCount = snapshots.filter(
      (s) => s.stage === 'EDGE_HOLD' || s.currentBPM === 0 || s.arousalLevel >= 8.5
    ).length;

    const targetSeconds = contract.targetMinutes * 60;
    const isDurationMet = actualSeconds >= targetSeconds;
    const isEdgeCountMet = actualEdgeCount >= contract.targetEdgeCount;

    // Win if both target duration and edge count thresholds are reached
    const isWin = isDurationMet && isEdgeCountMet;

    const stats = await this.getStats();
    let earnedCredits = 0;
    let lockoutUntil: number | undefined;

    if (isWin) {
      stats.streak += 1;
      stats.totalWins += 1;
      earnedCredits = Math.round(contract.stakeCredits * 1.5);
      stats.credits += earnedCredits;
      void danmakuService.addTokens(50, '自律契約勝利獎勵');
    } else {
      stats.streak = 0;
      stats.totalLosses += 1;
      earnedCredits = -contract.stakeCredits;
      stats.credits = Math.max(0, stats.credits - contract.stakeCredits);

      // Trigger penalty
      if (contract.penaltyType === 'LOCKOUT_12H') {
        lockoutUntil = Date.now() + 12 * 60 * 60 * 1000;
        stats.lockoutUntil = lockoutUntil;
      } else if (contract.penaltyType === 'LOCKOUT_24H') {
        lockoutUntil = Date.now() + 24 * 60 * 60 * 1000;
        stats.lockoutUntil = lockoutUntil;
      }
    }

    await this.saveStats(stats);
    await this.setActiveContract(null); // Clear active contract

    return {
      contractId: contract.id,
      isWin,
      actualDurationSeconds: actualSeconds,
      actualEdgeCount,
      targetMinutes: contract.targetMinutes,
      targetEdgeCount: contract.targetEdgeCount,
      earnedCredits,
      streak: stats.streak,
      penaltyActivated: !isWin,
      lockoutUntil,
      timestamp: Date.now(),
    };
  }
}

export const pledgeService = PledgeService.getInstance();
