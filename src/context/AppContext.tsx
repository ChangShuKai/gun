import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { HabitRecord, SplitConfig, AppSettings } from '../types';
import {
  getAllRecords,
  saveRecord as saveRecordToStorage,
  deleteRecord as deleteRecordFromStorage,
  getIsFirstLaunch,
  setFirstLaunchComplete,
  getAppSettings,
  saveAppSettings,
  getActiveSplitConfig,
  saveActiveSplitConfig,
  DEFAULT_SPLIT_CONFIG,
} from '../services/storage';
import {
  initMediaSandbox,
  deleteSandboxMedia,
  getSandboxStats,
  SandboxStats,
} from '../services/mediaStorage';

type AppScreen = 'gate' | 'onboarding' | 'main' | 'calculator';
type MainTab = 'action' | 'analytics';

interface AppContextType {
  currentScreen: AppScreen;
  setCurrentScreen: (screen: AppScreen) => void;
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  records: HabitRecord[];
  isLoading: boolean;
  refreshRecords: () => Promise<void>;
  addRecord: (record: HabitRecord) => Promise<void>;
  updateRecord: (record: HabitRecord) => Promise<void>;
  removeRecord: (recordId: string) => Promise<void>;

  // Active Split Layout Persistence
  activeSplitConfig: SplitConfig;
  updateActiveSplitConfig: (config: Partial<SplitConfig>) => Promise<void>;

  // Apply Layout / 一鍵復刻
  replicatedConfig: SplitConfig | null;
  applyLayoutToWorkspace: (config: SplitConfig) => void;
  clearReplicatedConfig: () => void;

  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  completeOnboarding: () => Promise<void>;

  // Stealth recording state
  isStealthRecordingActive: boolean;
  setIsStealthRecordingActive: (active: boolean) => void;

<<<<<<< Updated upstream
  // Decoy & Cover Mode
  isDecoyMode: boolean;
  setIsDecoyMode: (active: boolean) => void;
=======
  // Sandbox Storage Stats (for real storage transparency)
  sandboxStats: SandboxStats;
  refreshSandboxStats: () => Promise<void>;
>>>>>>> Stashed changes
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('gate');
  const [activeTab, setActiveTab] = useState<MainTab>('action');
  const [records, setRecords] = useState<HabitRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<AppSettings>({
    isFirstLaunch: true,
    biometricsEnabled: true,
    stealthRecordingDefault: false,
    blurOnBackground: true,
    requireAuthOnResume: false,
  });
  const [activeSplitConfig, setActiveSplitConfig] = useState<SplitConfig>(DEFAULT_SPLIT_CONFIG);
  const [replicatedConfig, setReplicatedConfig] = useState<SplitConfig | null>(null);
  const [isStealthRecordingActive, setIsStealthRecordingActive] = useState<boolean>(false);
<<<<<<< Updated upstream
  const [isDecoyMode, setIsDecoyMode] = useState<boolean>(false);
=======
  const [sandboxStats, setSandboxStats] = useState<SandboxStats>({
    imageCount: 0,
    videoCount: 0,
    totalSizeBytes: 0,
    formattedSize: '0 KB',
  });
>>>>>>> Stashed changes

  // Initialize storage & sandbox with 100% real local data
  useEffect(() => {
    async function init() {
      try {
        await initMediaSandbox();
        const firstLaunch = await getIsFirstLaunch();
        const loadedSettings = await getAppSettings();
        const loadedRecords = await getAllRecords();
        const savedConfig = await getActiveSplitConfig();
        const stats = await getSandboxStats();

        setSettings({ ...loadedSettings, isFirstLaunch: firstLaunch });
        setRecords(loadedRecords);
<<<<<<< Updated upstream

        if (!firstLaunch && loadedSettings.calculatorCoverEnabled) {
          setCurrentScreen('calculator');
        }
=======
        setActiveSplitConfig(savedConfig);
        setSandboxStats(stats);
>>>>>>> Stashed changes
      } catch (e) {
        console.error('[AppContext] Initialization error:', e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const refreshSandboxStats = useCallback(async () => {
    const stats = await getSandboxStats();
    setSandboxStats(stats);
  }, []);

  const refreshRecords = useCallback(async () => {
    const list = await getAllRecords();
    setRecords(list);
    await refreshSandboxStats();
  }, [refreshSandboxStats]);

  const addRecord = useCallback(async (record: HabitRecord) => {
    await saveRecordToStorage(record);
    const updated = await getAllRecords();
    setRecords(updated);
    await refreshSandboxStats();
  }, [refreshSandboxStats]);

  const updateRecord = useCallback(async (record: HabitRecord) => {
    await saveRecordToStorage(record);
    const updated = await getAllRecords();
    setRecords(updated);
  }, []);

  const removeRecord = useCallback(async (recordId: string) => {
    // Check if the record has an associated video in sandbox
    const target = records.find((r) => r.id === recordId);
    if (target && target.videoUri) {
      await deleteSandboxMedia(target.videoUri);
    }
    await deleteRecordFromStorage(recordId);
    const updated = await getAllRecords();
    setRecords(updated);
    await refreshSandboxStats();
  }, [records, refreshSandboxStats]);

  const updateActiveSplitConfig = useCallback(async (newConfig: Partial<SplitConfig>) => {
    setActiveSplitConfig((prev) => {
      const merged = { ...prev, ...newConfig };
      saveActiveSplitConfig(merged).catch((err) =>
        console.error('[AppContext] Error saving split config:', err)
      );
      return merged;
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    await setFirstLaunchComplete();
    setSettings((prev) => ({ ...prev, isFirstLaunch: false }));
    setCurrentScreen('main');
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const updated = await saveAppSettings(newSettings);
    setSettings(updated);
  }, []);

  const applyLayoutToWorkspace = useCallback((config: SplitConfig) => {
    setReplicatedConfig(config);
    setActiveSplitConfig(config);
    saveActiveSplitConfig(config).catch(() => {});
    setActiveTab('action');
  }, []);

  const clearReplicatedConfig = useCallback(() => {
    setReplicatedConfig(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        activeTab,
        setActiveTab,
        records,
        isLoading,
        refreshRecords,
        addRecord,
        updateRecord,
        removeRecord,
        activeSplitConfig,
        updateActiveSplitConfig,
        replicatedConfig,
        applyLayoutToWorkspace,
        clearReplicatedConfig,
        settings,
        updateSettings,
        completeOnboarding,
        isStealthRecordingActive,
        setIsStealthRecordingActive,
<<<<<<< Updated upstream
        isDecoyMode,
        setIsDecoyMode,
=======
        sandboxStats,
        refreshSandboxStats,
>>>>>>> Stashed changes
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
