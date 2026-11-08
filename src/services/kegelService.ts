import AsyncStorage from '@react-native-async-storage/async-storage';
import { KegelSessionRecord, KegelStats, KegelMode } from '../types';

const STORAGE_KEY_KEGEL = '@vault_kegel_records_v1';

const INITIAL_RECORDS: KegelSessionRecord[] = [
  {
    id: 'kegel_demo_01',
    mode: 'SPEED_FLICKS',
    completedReps: 15,
    targetReps: 15,
    durationSeconds: 30,
    avgHoldSeconds: 1.0,
    timestamp: Date.now() - 86400000 * 2,
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
  },
  {
    id: 'kegel_demo_02',
    mode: 'ENDURANCE_HOLDS',
    completedReps: 8,
    targetReps: 8,
    durationSeconds: 88,
    avgHoldSeconds: 6.0,
    timestamp: Date.now() - 86400000,
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
  },
];

class KegelService {
  private static instance: KegelService;

  public static getInstance(): KegelService {
    if (!KegelService.instance) {
      KegelService.instance = new KegelService();
    }
    return KegelService.instance;
  }

  public async getRecords(): Promise<KegelSessionRecord[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY_KEGEL);
      if (!json) {
        await AsyncStorage.setItem(STORAGE_KEY_KEGEL, JSON.stringify(INITIAL_RECORDS));
        return INITIAL_RECORDS;
      }
      const parsed = JSON.parse(json) as KegelSessionRecord[];
      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.warn('Failed to get Kegel records:', e);
      return INITIAL_RECORDS;
    }
  }

  public async saveRecord(
    params: Omit<KegelSessionRecord, 'id' | 'timestamp'>
  ): Promise<KegelSessionRecord> {
    const records = await this.getRecords();
    const newRecord: KegelSessionRecord = {
      ...params,
      id: `kegel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };

    const updated = [newRecord, ...records];
    await AsyncStorage.setItem(STORAGE_KEY_KEGEL, JSON.stringify(updated));
    return newRecord;
  }

  public async getStats(): Promise<KegelStats> {
    const records = await this.getRecords();
    let totalReps = 0;
    let speedReps = 0;
    let enduranceReps = 0;

    for (const r of records) {
      totalReps += r.completedReps;
      if (r.mode === 'SPEED_FLICKS') {
        speedReps += r.completedReps;
      } else {
        enduranceReps += r.completedReps;
      }
    }

    return {
      totalSessions: records.length,
      totalReps,
      speedReps,
      enduranceReps,
      lastSessionDate: records.length > 0 ? records[0].date : undefined,
    };
  }

  public getModeConfig(mode: KegelMode) {
    if (mode === 'SPEED_FLICKS') {
      return {
        title: '爆發快縮模式 (Speed Flicks)',
        subtitle: '1s 極速收緊 ➔ 1s 完全放鬆',
        targetReps: 15,
        contractDurationSec: 1,
        relaxDurationSec: 1,
        description: '訓練射精閥門神經敏捷度與微反射急停控制力',
        tag: '敏捷閥門',
        accentColor: '#38BDF8',
      };
    }
    return {
      title: '耐力深層鎖定模式 (Endurance Holds)',
      subtitle: '6s 深層緊縮維持 ➔ 5s 充分腹式放鬆',
      targetReps: 8,
      contractDurationSec: 6,
      relaxDurationSec: 5,
      description: '強化骨盆底靜脈血流封閉力，大幅提升硬度穩定性',
      tag: '血流封閉',
      accentColor: '#818CF8',
    };
  }
}

export const kegelService = KegelService.getInstance();
