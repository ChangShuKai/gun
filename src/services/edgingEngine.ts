import * as Haptics from 'expo-haptics';

export type PacingStage = 'IDLE' | 'SLOW_GRIND' | 'SPEED_UP' | 'SPRINT' | 'EDGE_HOLD' | 'RECOVERY';

export interface StageConfig {
  bpm: number;
  baseDurationSeconds: number;
  label: string;
  themeColor: string;
}

export interface EdgingSessionSummary {
  totalDurationSeconds: number;
  edgeCounts: number;
  maxBPM: number;
  lastBPM: number;
  reachedArousalPeak: number;
  interceptCount: number;
  timestamp: number;
}

export interface EdgingState {
  stage: PacingStage;
  currentBPM: number;
  targetBPM: number;
  arousalLevel: number; // 1.0 - 10.0
  cycleCount: number; // Completed cycles
  stageElapsedSeconds: number;
  stageTotalSeconds: number;
  edgeHoldRemainingSeconds: number;
  isIntercepted: boolean;
  isDangerZone: boolean;
}

export const STAGE_CONFIGS: Record<PacingStage, StageConfig> = {
  IDLE: { bpm: 0, baseDurationSeconds: 0, label: '準備就緒', themeColor: '#64748B' },
  SLOW_GRIND: { bpm: 60, baseDurationSeconds: 45, label: '慢磨暖身', themeColor: '#3B82F6' },
  SPEED_UP: { bpm: 100, baseDurationSeconds: 35, label: '階梯提速', themeColor: '#8B5CF6' },
  SPRINT: { bpm: 130, baseDurationSeconds: 30, label: '極限衝刺', themeColor: '#EC4899' },
  EDGE_HOLD: { bpm: 0, baseDurationSeconds: 25, label: '急停冰凍', themeColor: '#EF4444' },
  RECOVERY: { bpm: 40, baseDurationSeconds: 20, label: '平穩恢復', themeColor: '#10B981' },
};

export class EdgingEngine {
  private state: EdgingState = {
    stage: 'IDLE',
    currentBPM: 0,
    targetBPM: 0,
    arousalLevel: 1.0,
    cycleCount: 0,
    stageElapsedSeconds: 0,
    stageTotalSeconds: 0,
    edgeHoldRemainingSeconds: 0,
    isIntercepted: false,
    isDangerZone: false,
  };

  private listeners: ((state: EdgingState) => void)[] = [];
  private interceptCount: number = 0;
  private historicalFailureTimes: number[] = []; // In seconds

  constructor(historicalTimes: number[] = []) {
    this.historicalFailureTimes = historicalTimes;
  }

  public subscribe(listener: (state: EdgingState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getState(): EdgingState {
    return { ...this.state };
  }

  private notify() {
    const current = this.getState();
    for (const listener of this.listeners) {
      listener(current);
    }
  }

  /**
   * 啟動控射訓練階段機
   */
  public startSession() {
    this.state.cycleCount = 0;
    this.interceptCount = 0;
    this.transitionToStage('SLOW_GRIND');
  }

  /**
   * 停止 / 重置
   */
  public stopSession() {
    this.state.stage = 'IDLE';
    this.state.currentBPM = 0;
    this.state.targetBPM = 0;
    this.state.arousalLevel = 1.0;
    this.state.isIntercepted = false;
    this.state.isDangerZone = false;
    this.notify();
  }

  /**
   * 每秒滴答更新 (或由外部計時器觸發)
   */
  public tick(totalSessionElapsedSeconds: number) {
    if (this.state.stage === 'IDLE') return;

    this.state.stageElapsedSeconds += 1;

    // 1. 檢測歷史耐受度危險區間
    this.checkHistoricalDangerZone(totalSessionElapsedSeconds);

    // 2. 急停冰凍倒數
    if (this.state.stage === 'EDGE_HOLD') {
      if (this.state.edgeHoldRemainingSeconds > 0) {
        this.state.edgeHoldRemainingSeconds -= 1;
      }
      if (this.state.edgeHoldRemainingSeconds <= 0) {
        // 冰凍完成，進入恢復期
        this.transitionToStage('RECOVERY');
      }
      this.notify();
      return;
    }

    // 3. 一般階段時間自然前進
    if (this.state.stageElapsedSeconds >= this.state.stageTotalSeconds) {
      this.advanceNextStage();
    } else {
      this.notify();
    }
  }

  /**
   * 盲操興奮度滑桿更新 (Level 1.0 ~ 10.0)
   */
  public setArousalLevel(level: number) {
    const clamped = Math.min(10, Math.max(1, Math.round(level * 10) / 10));
    this.state.arousalLevel = clamped;

    // 主動攔截機制：到達 7.5 ~ 8.0 立即煞車介入
    if (clamped >= 7.5 && this.state.stage !== 'EDGE_HOLD' && !this.state.isIntercepted) {
      this.triggerEmergencyIntercept('興奮度觸頂預警 (Level ' + clamped + ')');
      return;
    }

    this.notify();
  }

  /**
   * 主動緊急煞車攔截
   */
  public triggerEmergencyIntercept(reason: string) {
    this.state.isIntercepted = true;
    this.interceptCount += 1;

    // 劇烈急停脈衝震動
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

    // 強制進入急停冰凍 (EDGE_HOLD)，預設冷卻 30 秒
    this.transitionToStage('EDGE_HOLD', 30);
  }

  /**
   * 手動或外部觸發急停
   */
  public manualEdgeHold(durationSeconds: number = 25) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    this.transitionToStage('EDGE_HOLD', durationSeconds);
  }

  /**
   * 階梯式自動轉換
   */
  private advanceNextStage() {
    switch (this.state.stage) {
      case 'SLOW_GRIND':
        this.transitionToStage('SPEED_UP');
        break;
      case 'SPEED_UP':
        this.transitionToStage('SPRINT');
        break;
      case 'SPRINT':
        // 衝刺結束，自動急停冷靜
        this.transitionToStage('EDGE_HOLD');
        break;
      case 'RECOVERY':
        // 完成一整輪週期，衝刺時間自適應遞減
        this.state.cycleCount += 1;
        this.state.isIntercepted = false;
        this.transitionToStage('SLOW_GRIND');
        break;
      default:
        break;
    }
  }

  /**
   * 切換階段並計算動態秒數
   */
  private transitionToStage(nextStage: PacingStage, overrideDuration?: number) {
    this.state.stage = nextStage;
    this.state.stageElapsedSeconds = 0;

    const baseConfig = STAGE_CONFIGS[nextStage];
    this.state.targetBPM = baseConfig.bpm;
    this.state.currentBPM = baseConfig.bpm;

    // 動態週期秒數計算 (階梯衰減演算法)
    if (overrideDuration) {
      this.state.stageTotalSeconds = overrideDuration;
    } else if (nextStage === 'SPRINT') {
      // 每一週期衝刺秒數遞減 5 秒，最低保底 15 秒，避免神經疲乏失控
      const decayedSprint = Math.max(15, baseConfig.baseDurationSeconds - this.state.cycleCount * 5);
      this.state.stageTotalSeconds = decayedSprint;
    } else {
      this.state.stageTotalSeconds = baseConfig.baseDurationSeconds;
    }

    if (nextStage === 'EDGE_HOLD') {
      this.state.edgeHoldRemainingSeconds = this.state.stageTotalSeconds;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } else if (nextStage === 'SPEED_UP' || nextStage === 'SPRINT') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    this.notify();
  }

  /**
   * 本地歷史耐受度模型檢測
   * 若歷史常在第 5 分鐘 (300s) 失控，則在 210s ~ 240s 主動標記高危區間並強制冷卻
   */
  private checkHistoricalDangerZone(elapsedSeconds: number) {
    if (this.historicalFailureTimes.length === 0) return;

    // 計算平均失控時間點
    const avgFailTime =
      this.historicalFailureTimes.reduce((acc, val) => acc + val, 0) /
      this.historicalFailureTimes.length;

    // 危險期設定在失控前 60 ~ 90 秒
    const dangerStart = Math.max(30, avgFailTime - 90);
    const dangerEnd = avgFailTime - 30;

    const inDanger = elapsedSeconds >= dangerStart && elapsedSeconds <= dangerEnd;
    if (inDanger && !this.state.isDangerZone) {
      this.state.isDangerZone = true;
      // 首次進入危險區間，若處於高速階段則主動降速或插播急停
      if (this.state.stage === 'SPRINT') {
        this.triggerEmergencyIntercept('預測性危險期強制煞車 (耐受度自適應)');
      }
    } else if (!inDanger && this.state.isDangerZone) {
      this.state.isDangerZone = false;
    }
  }

  /**
   * 計算建議生理冷卻時間 (秒)
   */
  public static calculateCooldownSeconds(durationSeconds: number, edgeCounts: number): number {
    // 基礎冷卻時間 8 小時 (28800s)
    // 每多一次急停 +30 分鐘，歷時每超過 10 分鐘 +1 小時
    const baseSeconds = 8 * 3600;
    const edgeBonus = edgeCounts * 1800;
    const durationBonus = Math.floor(durationSeconds / 600) * 3600;
    return Math.min(24 * 3600, baseSeconds + edgeBonus + durationBonus);
  }
}
