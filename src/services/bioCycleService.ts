import { HabitRecord, BioForecast, StaminaStatus } from '../types';

export class BioCycleService {
  private static instance: BioCycleService;

  public static getInstance(): BioCycleService {
    if (!BioCycleService.instance) {
      BioCycleService.instance = new BioCycleService();
    }
    return BioCycleService.instance;
  }

  /**
   * Computes 14-day bio-rhythm and stamina forecast from habit records
   */
  public calculateForecast(records: HabitRecord[]): BioForecast {
    const now = Date.now();
    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    // Filter to last 14 days
    const recentRecords = records.filter(
      (r) => now - (r.timestamp || 0) <= FOURTEEN_DAYS_MS
    );

    // Sort descending by timestamp
    const sorted = [...recentRecords].sort((a, b) => b.timestamp - a.timestamp);

    let hoursSinceLast = 48; // default to 48 hours if no record
    let lastDurationMins = 15;
    let lastEdgeCount = 2;

    if (sorted.length > 0) {
      const last = sorted[0];
      hoursSinceLast = Math.max(0.1, (now - last.timestamp) / (1000 * 60 * 60));
      lastDurationMins = Math.round((last.durationSeconds || 0) / 60);

      if (last.snapshots && last.snapshots.length > 0) {
        lastEdgeCount = last.snapshots.filter(
          (s) => s.stage === 'EDGE_HOLD' || s.currentBPM === 0 || s.arousalLevel >= 8.5
        ).length;
      }
    }

    // Count in last 24h
    const sessionsLast24h = sorted.filter(
      (r) => now - r.timestamp <= TWENTY_FOUR_HOURS_MS
    ).length;

    // Bedtime sessions (21:00 to 04:00)
    const bedtimeCount = sorted.filter((r) => {
      const h = parseInt(r.timeString.split(':')[0], 10);
      return h >= 21 || h < 4;
    }).length;

    // Total edge counts across 14 days
    let totalEdges = 0;
    sorted.forEach((r) => {
      if (r.snapshots) {
        totalEdges += r.snapshots.filter(
          (s) => s.stage === 'EDGE_HOLD' || s.currentBPM === 0 || s.arousalLevel >= 8.5
        ).length;
      }
    });
    const avgEdgeCount = sorted.length > 0 ? Number((totalEdges / sorted.length).toFixed(1)) : 1.5;

    // Energy level calculation based on logarithmic recovery curve
    let rawEnergy = 50;
    if (hoursSinceLast < 4) {
      rawEnergy = 15 + (hoursSinceLast / 4) * 12; // 15% ~ 27%
    } else if (hoursSinceLast < 12) {
      rawEnergy = 27 + ((hoursSinceLast - 4) / 8) * 23; // 27% ~ 50%
    } else if (hoursSinceLast < 24) {
      rawEnergy = 50 + ((hoursSinceLast - 12) / 12) * 20; // 50% ~ 70%
    } else if (hoursSinceLast < 48) {
      rawEnergy = 70 + ((hoursSinceLast - 24) / 24) * 18; // 70% ~ 88%
    } else if (hoursSinceLast < 96) {
      rawEnergy = 88 + ((hoursSinceLast - 48) / 48) * 9; // 88% ~ 97%
    } else {
      rawEnergy = 98; // Peak accumulation
    }

    // Intensity penalty
    if (sessionsLast24h >= 3) {
      rawEnergy -= 32;
    } else if (sessionsLast24h === 2) {
      rawEnergy -= 16;
    }

    if (lastDurationMins >= 30 && lastEdgeCount >= 5) {
      rawEnergy -= 10;
    }

    const energyPercentage = Math.max(12, Math.min(100, Math.round(rawEnergy)));

    // Determine Stamina Status
    let staminaStatus: StaminaStatus;
    if (sessionsLast24h >= 3 || energyPercentage < 28) {
      staminaStatus = 'OVERHEATED';
    } else if (energyPercentage < 50) {
      staminaStatus = 'FATIGUED';
    } else if (energyPercentage < 80) {
      staminaStatus = 'BALANCED';
    } else {
      staminaStatus = 'PEAK';
    }

    // Recommended Duration (Min)
    let recommendedDurationMin = 20;
    switch (staminaStatus) {
      case 'OVERHEATED':
        recommendedDurationMin = 8;
        break;
      case 'FATIGUED':
        recommendedDurationMin = 12;
        break;
      case 'BALANCED':
        recommendedDurationMin = 25;
        break;
      case 'PEAK':
        recommendedDurationMin = 18;
        break;
    }

    // Weather-style Forecast Text
    let forecastText = '';
    let nextIdealWindowText = '隨時可依身心調整';

    switch (staminaStatus) {
      case 'PEAK':
        forecastText =
          `⚡ 蓄能波峰警報 (${energyPercentage}%)：海綿體充血壓力接近極限，微神經處於高度超敏狀態！今日建議『低速慢磨』，避免前 5 分鐘高頻過載破防。`;
        nextIdealWindowText = '適合今日 21:30 ~ 23:00 長效慢磨';
        break;
      case 'BALANCED':
        forecastText =
          `🌤️ 黃金耐力窗口 (${energyPercentage}%)：蓄能與神經耐受度達到完美黃金比例！海綿體修復充沛，非常適合展開 25 分鐘以上的長階梯耐力挑戰。`;
        nextIdealWindowText = '最佳狀態窗口：隨時可展開長跑訓練';
        break;
      case 'FATIGUED':
        forecastText =
          `🌧️ 神經微疲勞期 (${energyPercentage}%)：近期訓練使蓄能適度下降，海綿體與骨盆底正在自我微調。建議控制在 12 分鐘內，多搭配會陰揉壓。`;
        nextIdealWindowText = '建議休息至明日晨間或進行舒緩放鬆';
        break;
      case 'OVERHEATED':
        forecastText =
          `🔥 系統過熱警示 (${energyPercentage}%)：24 小時內高頻消耗，蓄能降至警戒線，敏感度呈現代償性遲鈍。今日強烈建議全面休整，給予神經 24 小時冷卻重啟！`;
        nextIdealWindowText = '強制冷卻休整：建議 24 小時後再開練';
        break;
    }

    return {
      energyPercentage,
      staminaStatus,
      recommendedDurationMin,
      forecastText,
      hoursSinceLastSession: Number(hoursSinceLast.toFixed(1)),
      fourteenDayTotalSessions: recentRecords.length,
      avgEdgeCount,
      bedtimeSessionsCount: bedtimeCount,
      nextIdealWindowText,
    };
  }
}

export const bioCycleService = BioCycleService.getInstance();
