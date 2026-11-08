import AsyncStorage from '@react-native-async-storage/async-storage';
import { HandcuffTouchPoint, HandcuffActivePoints } from '../types';
import { danmakuService } from './danmakuService';

const STORAGE_KEY_HANDCUFF_STATS = '@vault_handcuff_stats_v1';

export interface HandcuffStats {
  totalCompletedSessions: number;
  totalViolations: number;
  lastSessionTimestamp: number;
}

const DEFAULT_STATS: HandcuffStats = {
  totalCompletedSessions: 0,
  totalViolations: 0,
  lastSessionTimestamp: 0,
};

class HandcuffService {
  private static instance: HandcuffService;

  public static getInstance(): HandcuffService {
    if (!HandcuffService.instance) {
      HandcuffService.instance = new HandcuffService();
    }
    return HandcuffService.instance;
  }

  /**
   * Quad-Quadrant Validation Algorithm
   * Verifies that touches.length === 4 and exactly 1 touch exists in each of the 4 quadrants.
   */
  public evaluateTouchDistribution(
    touches: HandcuffTouchPoint[],
    screenWidth: number,
    screenHeight: number
  ): {
    activePoints: HandcuffActivePoints;
    isFullyLocked: boolean;
    touchCount: number;
  } {
    const midX = screenWidth / 2;
    const midY = screenHeight / 2;

    let tlCount = 0;
    let blCount = 0;
    let trCount = 0;
    let brCount = 0;

    for (const pt of touches) {
      const isLeft = pt.x < midX;
      const isTop = pt.y < midY;

      if (isLeft && isTop) tlCount++;
      else if (isLeft && !isTop) blCount++;
      else if (!isLeft && isTop) trCount++;
      else brCount++;
    }

    const activePoints: HandcuffActivePoints = {
      topLeft: tlCount === 1,
      bottomLeft: blCount === 1,
      topRight: trCount === 1,
      bottomRight: brCount === 1,
    };

    const isFullyLocked =
      touches.length === 4 &&
      activePoints.topLeft &&
      activePoints.bottomLeft &&
      activePoints.topRight &&
      activePoints.bottomRight;

    return {
      activePoints,
      isFullyLocked,
      touchCount: touches.length,
    };
  }

  public async getStats(): Promise<HandcuffStats> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY_HANDCUFF_STATS);
      if (!json) return DEFAULT_STATS;
      return { ...DEFAULT_STATS, ...JSON.parse(json) };
    } catch {
      return DEFAULT_STATS;
    }
  }

  public async recordCompletion(sessionDurationSec: number, violations: number): Promise<void> {
    try {
      const stats = await this.getStats();
      const updated: HandcuffStats = {
        totalCompletedSessions: stats.totalCompletedSessions + 1,
        totalViolations: stats.totalViolations + violations,
        lastSessionTimestamp: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEY_HANDCUFF_STATS, JSON.stringify(updated));

      // Grant discipline intimacy tokens reward
      void danmakuService.addTokens(10, '四點物理拘束冷卻成功');
    } catch (e) {
      console.warn('Failed to record handcuff completion:', e);
    }
  }
}

export const handcuffService = HandcuffService.getInstance();
