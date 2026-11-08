import AsyncStorage from '@react-native-async-storage/async-storage';
import { HabitRecord, AppSettings, DayStats } from '../types';

const STORAGE_KEYS = {
  RECORDS: '@health_tracker_records_v1',
  SETTINGS: '@health_tracker_settings_v1',
  IS_FIRST_LAUNCH: '@health_tracker_first_launch_v1',
  ACTIVE_SPLIT_CONFIG: '@health_tracker_active_split_config',
};

const DEFAULT_SETTINGS: AppSettings = {
  isFirstLaunch: true,
  biometricsEnabled: true,
  stealthRecordingDefault: false,
  blurOnBackground: true,
  requireAuthOnResume: false,
  calculatorCoverEnabled: false,
  masterPin: '1314',
  decoyPin: '9999',
};

export async function getIsFirstLaunch(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.IS_FIRST_LAUNCH);
    if (val === null) return true;
    return JSON.parse(val);
  } catch {
    return true;
  }
}

export async function setFirstLaunchComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.IS_FIRST_LAUNCH, JSON.stringify(false));
  } catch (e) {
    console.error('Failed to set first launch complete:', e);
  }
}

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!json) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getAppSettings();
  const updated = { ...current, ...newSettings };
  await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  return updated;
}

export async function getAllRecords(): Promise<HabitRecord[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.RECORDS);
    if (!json) return [];
    const parsed: HabitRecord[] = JSON.parse(json);
    // Sort descending by timestamp
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to load records:', error);
    return [];
  }
}

export async function saveRecord(record: HabitRecord): Promise<void> {
  try {
    const currentRecords = await getAllRecords();
    const updated = [record, ...currentRecords.filter((r) => r.id !== record.id)];
    await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save record:', error);
    throw error;
  }
}

export async function deleteRecord(recordId: string): Promise<void> {
  try {
    const currentRecords = await getAllRecords();
    const updated = currentRecords.filter((r) => r.id !== recordId);
    await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to delete record:', error);
  }
}

/**
 * Computes calendar statistics aggregated by date (YYYY-MM-DD)
 */
export function aggregateRecordsByDate(records: HabitRecord[]): Record<string, DayStats> {
  const map: Record<string, DayStats> = {};

  records.forEach((record) => {
    const d = record.dateString;
    if (!map[d]) {
      map[d] = {
        date: d,
        count: 0,
        totalDurationSeconds: 0,
        records: [],
      };
    }
    map[d].count += 1;
    map[d].totalDurationSeconds += record.durationSeconds;
    map[d].records.push(record);
  });

  return map;
}

/**
 * Helper to generate demo records for initial testing and heatmap demonstration
 */
export async function seedDemoRecordsIfEmpty(): Promise<void> {
  const existing = await getAllRecords();
  if (existing.length > 0) return;

  const now = new Date();
  const demoRecords: HabitRecord[] = [];

  // Generate some past records over the last 14 days
  const sampleOffsets = [0, 0, 1, 2, 4, 5, 5, 7, 9, 10, 12, 14];
  sampleOffsets.forEach((dayOffset, idx) => {
    const targetDate = new Date(now.getTime() - dayOffset * 86400000);
    const dateStr = targetDate.toISOString().split('T')[0];
    const hours = (14 + (idx % 8)).toString().padStart(2, '0');
    const minutes = (10 + (idx * 7) % 50).toString().padStart(2, '0');
    
    demoRecords.push({
      id: `demo_${Date.now()}_${idx}`,
      timestamp: targetDate.getTime() - idx * 3600000,
      dateString: dateStr,
      timeString: `${hours}:${minutes}`,
      durationSeconds: 420 + (idx * 115) % 900, // 7 to 22 mins
      layoutMode: idx % 2 === 0 ? 'split_view' : 'fullscreen_timer',
      splitConfig: {
        mode: idx % 2 === 0 ? 'split_view' : 'fullscreen_timer',
        topWidget: 'timer',
        bottomWidget: 'photo',
        topRatio: 0.45,
      },
      videoUri: null,
      notes: idx % 3 === 0 ? '身心放鬆，節奏穩定' : undefined,
    });
  });

  await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(demoRecords));
}
