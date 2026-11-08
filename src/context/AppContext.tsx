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
  seedDemoRecordsIfEmpty,
} from '../services/storage';
import { initMediaSandbox } from '../services/mediaStorage';

type AppScreen = 'gate' | 'onboarding' | 'main';
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
  removeRecord: (recordId: string) => Promise<void>;
  
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
  const [replicatedConfig, setReplicatedConfig] = useState<SplitConfig | null>(null);
  const [isStealthRecordingActive, setIsStealthRecordingActive] = useState<boolean>(false);

  // Initialize storage & sandbox
  useEffect(() => {
    async function init() {
      try {
        await initMediaSandbox();
        await seedDemoRecordsIfEmpty();
        const firstLaunch = await getIsFirstLaunch();
        const loadedSettings = await getAppSettings();
        const loadedRecords = await getAllRecords();

        setSettings({ ...loadedSettings, isFirstLaunch: firstLaunch });
        setRecords(loadedRecords);
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const refreshRecords = useCallback(async () => {
    const list = await getAllRecords();
    setRecords(list);
  }, []);

  const addRecord = useCallback(async (record: HabitRecord) => {
    await saveRecordToStorage(record);
    const updated = await getAllRecords();
    setRecords(updated);
  }, []);

  const removeRecord = useCallback(async (recordId: string) => {
    await deleteRecordFromStorage(recordId);
    const updated = await getAllRecords();
    setRecords(updated);
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
        removeRecord,
        replicatedConfig,
        applyLayoutToWorkspace,
        clearReplicatedConfig,
        settings,
        updateSettings,
        completeOnboarding,
        isStealthRecordingActive,
        setIsStealthRecordingActive,
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
