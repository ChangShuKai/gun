import AsyncStorage from '@react-native-async-storage/async-storage';
import { HabitRecord, AppSettings, DayStats, SplitConfig } from '../types';

const STORAGE_KEYS = {
  RECORDS: '@health_tracker_records_v1',
  SETTINGS: '@health_tracker_settings_v1',
  IS_FIRST_LAUNCH: '@health_tracker_first_launch_v1',
  ACTIVE_SPLIT_CONFIG: '@health_tracker_active_split_config_v1',
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

export const DEFAULT_SPLIT_CONFIG: SplitConfig = {
  mode: 'split_view',
  topWidget: 'timer',
  bottomWidget: 'photo',
  topRatio: 0.5,
  topPhotoUri: null,
  bottomPhotoUri: null,
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
    console.error('[Storage] Failed to set first launch complete:', e);
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

/**
 * Loads all real local habit records.
 * Purges any legacy fake/demo records from storage to ensure 100% data authenticity.
 */
export async function getAllRecords(): Promise<HabitRecord[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.RECORDS);
    if (!json) return [];
    const parsed: HabitRecord[] = JSON.parse(json);

    // Filter out any mock/demo records so only 100% real local records exist
    const realRecords = parsed.filter(
      (r) => r && r.id && !r.id.startsWith('demo_')
    );

    // If legacy mock records were found, write back only real records to clean storage
    if (realRecords.length !== parsed.length) {
      await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(realRecords));
      console.log(`[Storage] Purged ${parsed.length - realRecords.length} legacy demo records.`);
    }

    // Sort descending by timestamp
    return realRecords.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('[Storage] Failed to load records:', error);
    return [];
  }
}

/**
 * Saves a real local record to persistent storage and verifies write integrity.
 */
export async function saveRecord(record: HabitRecord): Promise<void> {
  try {
    const currentRecords = await getAllRecords();
    const updated = [record, ...currentRecords.filter((r) => r.id !== record.id)];
    const payload = JSON.stringify(updated);
    
    // Write to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, payload);

    // Verify write integrity (read-after-write)
    const verification = await AsyncStorage.getItem(STORAGE_KEYS.RECORDS);
    if (!verification) {
      throw new Error('Storage write verification failed: read returned null');
    }
    const verifiedList: HabitRecord[] = JSON.parse(verification);
    const found = verifiedList.some((r) => r.id === record.id);
    if (!found) {
      throw new Error(`Storage write verification failed: record ${record.id} not found in saved list`);
    }

    console.log(`[Storage] Successfully saved and verified record ${record.id} (total: ${verifiedList.length})`);
  } catch (error) {
    console.error('[Storage] Failed to save record:', error);
    throw error;
  }
}

/**
 * Deletes a record by ID from persistent storage and verifies removal.
 */
export async function deleteRecord(recordId: string): Promise<void> {
  try {
    const currentRecords = await getAllRecords();
    const updated = currentRecords.filter((r) => r.id !== recordId);
    await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
    console.log(`[Storage] Record ${recordId} deleted successfully.`);
  } catch (error) {
    console.error('[Storage] Failed to delete record:', error);
    throw error;
  }
}

/**
 * Loads the active workspace split layout and photo configuration.
 */
export async function getActiveSplitConfig(): Promise<SplitConfig> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SPLIT_CONFIG);
    if (!json) return DEFAULT_SPLIT_CONFIG;
    return { ...DEFAULT_SPLIT_CONFIG, ...JSON.parse(json) };
  } catch {
    return DEFAULT_SPLIT_CONFIG;
  }
}

/**
 * Persists the active workspace split layout and photo configuration.
 */
export async function saveActiveSplitConfig(config: SplitConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SPLIT_CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error('[Storage] Failed to save active split config:', error);
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
 * Clears all local records (for testing or user data wipe)
 */
export async function clearAllRecords(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.RECORDS);
    console.log('[Storage] All local records cleared.');
  } catch (error) {
    console.error('[Storage] Failed to clear all records:', error);
  }
}
