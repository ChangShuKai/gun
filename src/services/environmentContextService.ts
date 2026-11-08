import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EnvironmentTag,
  EnvironmentTagMetadata,
  PhysiologicalBiasResult,
  EnvironmentalContextLog,
} from '../types';

const STORAGE_KEY_ENV_LOGS = '@vault_env_logs_v1';

export const ENVIRONMENT_TAG_METADATA: Record<EnvironmentTag, EnvironmentTagMetadata> = {
  COLD_WATER: {
    tag: 'COLD_WATER',
    label: '低溫環境 (<20°C / 冷水)',
    category: 'TEMP_SHOWER',
    icon: '❄️',
    biasPercentage: -12,
    isBaselineMaxCandidate: false,
    description: '受冷水或低溫刺激，提睪肌與海綿體平滑肌收縮防禦',
    clinicalNote: '低溫刺激交感神經引起血管平滑肌收縮，屬於人體保溫防禦機制，非器質性回縮。',
  },
  HOT_SHOWER: {
    tag: 'HOT_SHOWER',
    label: '剛洗完熱水澡 / 溫泉放鬆',
    category: 'TEMP_SHOWER',
    icon: '♨️',
    biasPercentage: 5,
    isBaselineMaxCandidate: true,
    description: '副交感神經主導，周邊微血管舒張，白膜延展性極佳',
    clinicalNote: '溫熱環境促進骨盆周邊血管舒張，有利於評估放鬆狀態的理想充血基準。',
  },
  ROOM_TEMP: {
    tag: 'ROOM_TEMP',
    label: '正常舒適室溫 (22~26°C)',
    category: 'TEMP_SHOWER',
    icon: '🛋️',
    biasPercentage: 0,
    isBaselineMaxCandidate: false,
    description: '標準中性舒適環境，無顯著溫度應激偏差',
    clinicalNote: '標準生理環境基準，適合作為常規追蹤點。',
  },
  POST_WORKOUT: {
    tag: 'POST_WORKOUT',
    label: '深蹲 / 重訓大重量後',
    category: 'PHYSICAL_FATIGUE',
    icon: '🏋️',
    biasPercentage: -5,
    isBaselineMaxCandidate: false,
    description: '大肌群充血分流與神經中樞短暫疲憊',
    clinicalNote: '骨骼肌大量搶奪血液灌流，且重訓後短暫交感神經亢奮，短時間內充血容積可能略偏緊。',
  },
  POST_CYCLING: {
    tag: 'POST_CYCLING',
    label: '長途單車 / 騎乘後',
    category: 'PHYSICAL_FATIGUE',
    icon: '🚴',
    biasPercentage: -15,
    isBaselineMaxCandidate: false,
    description: '坐墊壓迫會陰部血管與陰部神經 (Pudendal Nerve)',
    clinicalNote: '會陰部受壓迫暫時性減少微循環，預期防禦收縮偏差約 -10%~-15%，充分休整半小時後即可復原。',
  },
  SLEEP_DEPRIVED: {
    tag: 'SLEEP_DEPRIVED',
    label: '熬夜 / 睡眠不足 (<6h)',
    category: 'PHYSICAL_FATIGUE',
    icon: '😴',
    biasPercentage: -8,
    isBaselineMaxCandidate: false,
    description: '皮質醇偏高，自主神經系統調節遲鈍',
    clinicalNote: '睡眠不足顯著抑制夜間自發勃起 (NPT) 及睪固酮晨峰分泌，宜放寬心態優先休整。',
  },
  MORNING_GLORY: {
    tag: 'MORNING_GLORY',
    label: '晨間自然充血 (Morning Glory)',
    category: 'PHYSICAL_FATIGUE',
    icon: '🌅',
    biasPercentage: 15,
    isBaselineMaxCandidate: true,
    description: '深睡 REM 期副交感充血峰值，海綿體內壓飽和',
    clinicalNote: '晨間勃起反映最純粹之血管內皮健康與平滑肌放鬆度，自動建立為充血上限基準值 (Baseline Max)。',
  },
};

class EnvironmentContextService {
  private static instance: EnvironmentContextService;

  public static getInstance(): EnvironmentContextService {
    if (!EnvironmentContextService.instance) {
      EnvironmentContextService.instance = new EnvironmentContextService();
    }
    return EnvironmentContextService.instance;
  }

  /**
   * Calculates objective physiological bias based on selected context tags.
   */
  public calculatePhysiologicalBias(tags: EnvironmentTag[]): PhysiologicalBiasResult {
    if (!tags || tags.length === 0) {
      return {
        totalBiasPercentage: 0,
        isBaselineMax: false,
        alertTitle: '標準基準狀態',
        alertNote: '未偵測到特殊環境或生理應激因子，視為中性生理基準。',
        clinicalExplanation: '當前處於一般狀態，數據具有高再現性。',
        suggestedAction: '正常記錄即可。',
      };
    }

    let totalBias = 0;
    let isBaselineMax = false;
    const explanations: string[] = [];

    for (const tag of tags) {
      const meta = ENVIRONMENT_TAG_METADATA[tag];
      if (meta) {
        totalBias += meta.biasPercentage;
        if (meta.isBaselineMaxCandidate) {
          isBaselineMax = true;
        }
        explanations.push(`${meta.icon} ${meta.label}: ${meta.clinicalNote}`);
      }
    }

    let alertTitle = '生理狀態偏差校正';
    let alertNote = '';
    let suggestedAction = '';

    if (tags.includes('COLD_WATER') || tags.includes('POST_CYCLING')) {
      alertTitle = '⚠️ 環境防禦性收縮偏差 (-10% ~ -15%)';
      alertNote = '偵測到低溫或長途騎乘環境！交感神經刺激引發平滑肌與提睪肌自我保護收縮，尺寸偏小純屬客觀反射，非器質性回縮，切勿焦慮。';
      suggestedAction = '建議以溫水浸潤或放鬆 15~20 分鐘後再次評估。';
    } else if (isBaselineMax) {
      alertTitle = '🌅 充血上限基準值 (Baseline Max)';
      alertNote = '偵測到晨間自發充血或熱水浴後深層放鬆，骨盆腔微循環暢通，海綿體達到最大擴張係數。';
      suggestedAction = '此數值已被自動標記為個人潛力上限基準點。';
    } else if (tags.includes('SLEEP_DEPRIVED') || tags.includes('POST_WORKOUT')) {
      alertTitle = '💤 生理疲憊與血液分流偏差 (-5% ~ -8%)';
      alertNote = '偵測到睡眠不足或重訓消耗，大肌群搶奪血液灌流且神經疲憊，充血速度可能暫時放緩。';
      suggestedAction = '建議補充足量水分與優質睡眠，待體能充能後再做進階測試。';
    } else {
      alertTitle = '常規舒適生理環境';
      alertNote = '環境與體能狀態良好，數值穩定。';
      suggestedAction = '持續維持良好自律節奏。';
    }

    return {
      totalBiasPercentage: totalBias,
      isBaselineMax,
      alertTitle,
      alertNote,
      clinicalExplanation: explanations.join('\n'),
      suggestedAction,
    };
  }

  public async getLogs(): Promise<EnvironmentalContextLog[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY_ENV_LOGS);
      if (!json) return [];
      const parsed = JSON.parse(json) as EnvironmentalContextLog[];
      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.warn('Failed to get env logs:', e);
      return [];
    }
  }

  public async saveLog(
    tags: EnvironmentTag[],
    notes?: string,
    associatedCheckInId?: string
  ): Promise<EnvironmentalContextLog> {
    const biasResult = this.calculatePhysiologicalBias(tags);
    const todayStr = new Date().toISOString().split('T')[0];

    const newLog: EnvironmentalContextLog = {
      id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: todayStr,
      timestamp: Date.now(),
      tags,
      biasResult,
      notes,
      associatedCheckInId,
    };

    const existing = await this.getLogs();
    const updated = [newLog, ...existing.slice(0, 49)]; // keep 50 logs max
    await AsyncStorage.setItem(STORAGE_KEY_ENV_LOGS, JSON.stringify(updated));
    return newLog;
  }

  public async getLatestLog(): Promise<EnvironmentalContextLog | null> {
    const logs = await this.getLogs();
    return logs.length > 0 ? logs[0] : null;
  }
}

export const environmentContextService = EnvironmentContextService.getInstance();
