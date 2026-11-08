import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
<<<<<<< Updated upstream
import { LayoutMode, WidgetType, SplitConfig, HabitRecord, SnapshotMetadata, QuestRecord, PledgeContract, PledgeResult } from '../types';
=======
import { LayoutMode, WidgetType, HabitRecord } from '../types';
>>>>>>> Stashed changes
import { useApp } from '../context/AppContext';
import { BreathingButton } from '../components/BreathingButton';
import { SplitView } from '../components/SplitView';
import { TimerWidget } from '../components/TimerWidget';
import { LayoutSelectorSheet } from '../components/LayoutSelectorSheet';
import { WidgetPickerSheet } from '../components/WidgetPickerSheet';
import { StealthRecorder, StealthRecorderHandle } from '../components/StealthRecorder';
import { ArousalSlider } from '../components/ArousalSlider';
import { ScenarioQuestModal } from '../components/ScenarioQuestModal';
import { RadarBadge } from '../components/RadarBadge';
import { CompanionToast } from '../components/CompanionToast';
import { DailyCheckInModal } from '../components/DailyCheckInModal';
import { MockStoryComposer } from '../components/MockStoryComposer';
import { MockStoryViewer } from '../components/MockStoryViewer';
import { PledgeBetModal } from '../components/PledgeBetModal';
import { PledgeSettlementModal } from '../components/PledgeSettlementModal';
import { Anatomy3DFittingModal } from '../components/Anatomy3DFittingModal';
import { DanmakuOverlay } from '../components/DanmakuOverlay';
import { PrivateInboxModal } from '../components/PrivateInboxModal';
import { EHSSelectorModal } from '../components/EHSSelectorModal';
import { WishlistModal } from '../components/WishlistModal';
import { MedicalKnowledgeScreen } from './MedicalKnowledgeScreen';
import { QuadPointHandcuffModal } from '../components/QuadPointHandcuffModal';
import { PanelMissionModal } from '../components/PanelMissionModal';
import { SettingsScreen } from './SettingsScreen';
import { girlfriendCompanion } from '../services/girlfriendCompanion';
import { pledgeService } from '../services/pledgeService';
import { panelDramaService } from '../services/panelDramaService';

export const ActionScreen: React.FC = () => {
  const {
    addRecord,
    activeSplitConfig,
    updateActiveSplitConfig,
    replicatedConfig,
    clearReplicatedConfig,
    isStealthRecordingActive,
    setIsStealthRecordingActive,
    setCurrentScreen,
  } = useApp();

  // Session state: 'idle' | 'running'
  const [sessionState, setSessionState] = useState<'idle' | 'running'>('idle');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(activeSplitConfig.mode || 'split_view');

  // Split view configuration directly uses persistent context state
  const splitConfig = activeSplitConfig;

  // Elapsed time tracker
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const sessionStartTimeRef = useRef<number>(0);

  // Sheets state
  const [layoutSelectorVisible, setLayoutSelectorVisible] = useState<boolean>(false);
  const [widgetPickerVisible, setWidgetPickerVisible] = useState<boolean>(false);
  const [targetPane, setTargetPane] = useState<'top' | 'bottom' | null>(null);

  // Summary dialog after finishing
  const [finishedRecord, setFinishedRecord] = useState<HabitRecord | null>(null);
  const [userRating, setUserRating] = useState<number>(5);
  const [userNote, setUserNote] = useState<string>('身心放鬆，節奏健康');

  // In-Recording Snapshot and Pacing State
  const [sessionSnapshots, setSessionSnapshots] = useState<SnapshotMetadata[]>([]);
  const [currentArousal, setCurrentArousal] = useState<number>(1.0);

  // Time-gated Scenario Quest Modal state
  const [questModalVisible, setQuestModalVisible] = useState<boolean>(false);

  // Daily Check-In Modal state
  const [dailyCheckInVisible, setDailyCheckInVisible] = useState<boolean>(false);

  // Settings Modal state
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);

  // 3D Parametric Anatomy Fitting state
  const [anatomyFittingVisible, setAnatomyFittingVisible] = useState<boolean>(false);

  // Mock Story Leaker state
  const [storyComposerVisible, setStoryComposerVisible] = useState<boolean>(false);
  const [storyViewerVisible, setStoryViewerVisible] = useState<boolean>(false);
  const [publishedStoryUri, setPublishedStoryUri] = useState<string | null>(null);

  const handleStoryPublished = (uri: string) => {
    setStoryComposerVisible(false);
    setPublishedStoryUri(uri);
    setStoryViewerVisible(true);
  };

  // Pledge Bet & Lockout states
  const [pledgeModalVisible, setPledgeModalVisible] = useState<boolean>(false);
  const [activePledgeContract, setActivePledgeContract] = useState<PledgeContract | null>(null);
  const [lockoutStatus, setLockoutStatus] = useState<{
    isLocked: boolean;
    remainingSeconds: number;
    reason: string;
  }>({
    isLocked: false,
    remainingSeconds: 0,
    reason: '',
  });
  const [pledgeSettlementVisible, setPledgeSettlementVisible] = useState<boolean>(false);
  const [pledgeSettlementResult, setPledgeSettlementResult] = useState<PledgeResult | null>(null);

  // Secret Notes & EHS Modal states
  const [privateInboxVisible, setPrivateInboxVisible] = useState<boolean>(false);
  const [unreadNotesCount, setUnreadNotesCount] = useState<number>(0);
  const [ehsModalVisible, setEhsModalVisible] = useState<boolean>(false);

  // Wishlist & Medical Knowledge Screen states
  const [wishlistVisible, setWishlistVisible] = useState<boolean>(false);
  const [medicalScreenVisible, setMedicalScreenVisible] = useState<boolean>(false);
  const [handcuffModalVisible, setHandcuffModalVisible] = useState<boolean>(false);
  const [panelMissionVisible, setPanelMissionVisible] = useState<boolean>(false);

  const refreshSecretNotes = useCallback(async () => {
    try {
      const count = await panelDramaService.getUnreadCount();
      setUnreadNotesCount(count);
    } catch {}
  }, []);

  const refreshPledgeStatus = async () => {
    const locked = await pledgeService.isLockedOut();
    setLockoutStatus(locked);
    const contract = await pledgeService.getActiveContract();
    setActivePledgeContract(contract);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshPledgeStatus();
      void refreshSecretNotes();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshSecretNotes]);

  const handleEmergencyUnlock = async () => {
    Alert.alert(
      '🚨 緊急認錯解除鎖定',
      '請鄭重誓言下次將絕對自律，不再輕率違約！確認解除懲罰鎖定嗎？',
      [
        { text: '繼續反省', style: 'cancel' },
        {
          text: '鄭重誓言並解除',
          style: 'destructive',
          onPress: async () => {
            await pledgeService.emergencyUnlock();
            await refreshPledgeStatus();
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
          },
        },
      ]
    );
  };

  // Stealth recorder reference
  const recorderRef = useRef<StealthRecorderHandle>(null);

  // Listen for "Apply Layout / 一鍵復刻" from Analytics
  useEffect(() => {
    if (replicatedConfig) {
      const timer = setTimeout(() => {
        setLayoutMode(replicatedConfig.mode);
        updateActiveSplitConfig(replicatedConfig);
        clearReplicatedConfig();
        Alert.alert('已復刻歷史佈局', '成功載入歷史視窗配置與素材！點擊「開始」即可展開。');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [replicatedConfig, clearReplicatedConfig, updateActiveSplitConfig]);

  // Handle giant start button click
  const handleStartPress = () => {
    if (lockoutStatus.isLocked) {
      const hours = Math.floor(lockoutStatus.remainingSeconds / 3600);
      const mins = Math.floor((lockoutStatus.remainingSeconds % 3600) / 60);
      Alert.alert(
        '🚫 處於懲罰冷卻鎖定中',
        `因違背自律契約賭局，系統正處於神經冷卻期！\n剩餘時間：${hours} 小時 ${mins} 分鐘。\n請冷靜休整，重塑神經閾值。`,
        [
          { text: '冷靜反省', style: 'cancel' },
          {
            text: '🚨 緊急認錯解除',
            style: 'destructive',
            onPress: handleEmergencyUnlock,
          },
        ]
      );
      return;
    }
    setLayoutSelectorVisible(true);
  };

  // User chooses layout mode
  const handleSelectLayout = async (mode: LayoutMode) => {
    setLayoutSelectorVisible(false);
    setLayoutMode(mode);
    setSessionState('running');
    sessionStartTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setSessionSnapshots([]);
    setCurrentArousal(1.0);

    // Save mode preference
    updateActiveSplitConfig({ mode });

    // If stealth recording is on, start background recording
    if (isStealthRecordingActive && recorderRef.current) {
      try {
        await recorderRef.current.startRecording();
      } catch (err) {
        console.warn('Stealth recorder error:', err);
      }
    }

    // Start girlfriend companion encouragement
    girlfriendCompanion.startRandomCompanion(32);
    setTimeout(() => {
      girlfriendCompanion.triggerEvent('praise');
    }, 1200);
  };

  // Finish session
  const handleFinishSession = async () => {
    girlfriendCompanion.stopRandomCompanion();
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const now = new Date();
    const duration = Math.max(1, elapsedSeconds);

    let recordedVideoUri: string | null = null;
    if (isStealthRecordingActive && recorderRef.current) {
      try {
        recordedVideoUri = await recorderRef.current.stopRecording();
      } catch (e) {
        console.warn('Error stopping stealth recorder:', e);
      }
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeString = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const newRecord: HabitRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      dateString,
      timeString,
      durationSeconds: duration,
      layoutMode,
      splitConfig: { ...splitConfig, mode: layoutMode },
      videoUri: recordedVideoUri,
<<<<<<< Updated upstream
      snapshots: sessionSnapshots,
      notes: '個人放鬆與習慣追蹤',
    };

    // Settle active pledge contract if present
    const pledgeRes = await pledgeService.settlePledge(duration, sessionSnapshots);
    if (pledgeRes) {
      newRecord.hasPledgeWin = pledgeRes.isWin;
      newRecord.pledgeResult = pledgeRes;
      setPledgeSettlementResult(pledgeRes);
      setPledgeSettlementVisible(true);
      await refreshPledgeStatus();
    }

=======
      notes: userNote,
      rating: userRating,
    };

    // Save with verified write
>>>>>>> Stashed changes
    await addRecord(newRecord);
    setFinishedRecord(newRecord);
    setSessionState('idle');

    // 30% chance of secret post-session note
    void panelDramaService.triggerPostSessionNote().then((note) => {
      if (note) {
        void refreshSecretNotes();
      }
    });
  };

  // Scenario Quest Completion
  const handleCompleteQuest = async (questRecord: QuestRecord) => {
    setQuestModalVisible(false);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeString = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const newRecord: HabitRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      dateString,
      timeString,
      durationSeconds: Math.max(1, questRecord.durationSeconds),
      layoutMode: 'split_view',
      splitConfig,
      quest: questRecord,
      notes: `完成冒險挑戰：${questRecord.questTitle}`,
    };

    await addRecord(newRecord);
    setFinishedRecord(newRecord);
  };

  // 0ms Panic Abort from Quest
  const handleQuestPanicAbort = () => {
    setQuestModalVisible(false);
    setSessionState('idle');
    // Immediate emergency retreat to Gate screen
    setCurrentScreen('gate');
  };

  const handleSaveSummary = async () => {
    if (finishedRecord) {
      const updated: HabitRecord = {
        ...finishedRecord,
        notes: userNote.trim() || '個人放鬆與習慣追蹤',
        rating: userRating,
      };
      await addRecord(updated);
    }
    setFinishedRecord(null);
  };

  const handleOpenWidgetPicker = (pane: 'top' | 'bottom') => {
    setTargetPane(pane);
    setWidgetPickerVisible(true);
  };

  const handleWidgetSelected = (widget: WidgetType) => {
    if (targetPane === 'top') {
      updateActiveSplitConfig({ topWidget: widget });
    } else if (targetPane === 'bottom') {
      updateActiveSplitConfig({ bottomWidget: widget });
    }
    if (widget === 'camera') {
      girlfriendCompanion.triggerEvent('guidance');
    }
    setWidgetPickerVisible(false);
  };

  const handleRatioChange = (r: number) => {
    updateActiveSplitConfig({ topRatio: r });
  };

  const handleTopPhotoSelected = (uri: string) => {
    updateActiveSplitConfig({ topPhotoUri: uri });
  };

  const handleBottomPhotoSelected = (uri: string) => {
    updateActiveSplitConfig({ bottomPhotoUri: uri });
  };

  const handleTimerTick = useCallback((sec: number) => {
    setElapsedSeconds(sec);
  }, []);

  const toggleStealthRecording = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsStealthRecordingActive(!isStealthRecordingActive);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating Girlfriend Companion Toast */}
      <CompanionToast topOffset={50} />

      {/* Background stealth recording component */}
      <StealthRecorder ref={recorderRef} enabled={isStealthRecordingActive} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.pageTitle}>尻尻體驗</Text>
          <View style={styles.radarHeaderWrapper}>
            <RadarBadge inline />
          </View>
        </View>

        {/* Top Right Controls: Settings + Stealth Recording Toggle + Finish Button */}
        <View style={styles.headerRight}>
          {/* Wishlist Button */}
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setWishlistVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trophy-outline" size={17} color="#F59E0B" />
          </TouchableOpacity>

          {/* Medical Almanac Button */}
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setMedicalScreenVisible(true);
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={17} color="#38BDF8" />
          </TouchableOpacity>

          {/* Quad-Point Handcuff Protocol Button */}
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              setHandcuffModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="snowflake-alert" size={17} color="#38BDF8" />
          </TouchableOpacity>

          {/* Panel Daily Mission Button */}
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setPanelMissionVisible(true);
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="gavel" size={17} color="#A855F7" />
          </TouchableOpacity>

          {/* Secret Notes Private Inbox Button */}
          <TouchableOpacity
            style={styles.inboxBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setPrivateInboxVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-outline" size={18} color="#EC4899" />
            {unreadNotesCount > 0 && (
              <View style={styles.inboxRedDot}>
                <Text style={styles.inboxRedDotText}>{unreadNotesCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Settings Button */}
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setSettingsVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={17} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          {/* Stealth Recording Toggle */}
          <TouchableOpacity
            style={[
              styles.stealthToggle,
              isStealthRecordingActive && styles.stealthToggleActive,
            ]}
            onPress={toggleStealthRecording}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isStealthRecordingActive ? 'videocam' : 'videocam-off-outline'}
              size={18}
              color={isStealthRecordingActive ? THEME.colors.danger : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.stealthToggleText,
                isStealthRecordingActive && styles.stealthToggleTextActive,
              ]}
            >
              {isStealthRecordingActive ? '隱私錄影開啟' : '隱私錄影'}
            </Text>
          </TouchableOpacity>

          {/* Finish Button when running */}
          {sessionState === 'running' && (
            <TouchableOpacity
              style={styles.finishBtn}
              onPress={handleFinishSession}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.finishBtnText}>完成</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Workspace Body */}
      <View style={styles.body}>
        {sessionState === 'idle' ? (
          /* Idle View: Giant Pulsing Breathing Button */
          <View style={styles.idleContainer}>
            <View style={styles.statusPill}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.statusPillText}>本地沙盒模式・100% 真實數據</Text>
            </View>

            {/* Lockout Warning Banner */}
            {lockoutStatus.isLocked && (
              <View style={styles.lockoutBanner}>
                <View style={styles.lockoutHeader}>
                  <Ionicons name="lock-closed" size={16} color="#EF4444" />
                  <Text style={styles.lockoutTitle}>
                    🚫 違約懲罰冷卻中 (剩餘 {Math.floor(lockoutStatus.remainingSeconds / 3600)}時{' '}
                    {Math.floor((lockoutStatus.remainingSeconds % 3600) / 60)}分)
                  </Text>
                </View>
                <Text style={styles.lockoutDesc}>
                  因違反自律契約賭局，正處於神經閾值重塑冷卻期。請靜心休整！
                </Text>
                <TouchableOpacity
                  style={styles.emergencyUnlockLink}
                  onPress={handleEmergencyUnlock}
                >
                  <Text style={styles.emergencyUnlockLinkText}>誓言認錯並緊急解除鎖定</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.breathingWrapper}>
              <BreathingButton
                onPress={handleStartPress}
                label={lockoutStatus.isLocked ? '冷卻中' : '開始'}
                sublabel={lockoutStatus.isLocked ? '懲罰鎖定中' : '點擊展開佈局'}
              />
            </View>

            <View style={styles.quickPresetCard}>
              <Text style={styles.presetTitle}>目前本地工作區配置</Text>
              <View style={styles.presetBadgesRow}>
                <View style={styles.presetBadge}>
                  <Feather name="columns" size={14} color={THEME.colors.primaryLight} />
                  <Text style={styles.presetBadgeText}>
                    上下分割 ({splitConfig.topWidget} + {splitConfig.bottomWidget})
                  </Text>
                </View>
                {splitConfig.topPhotoUri && (
                  <View style={styles.presetBadge}>
                    <Ionicons name="image" size={14} color={THEME.colors.primaryLight} />
                    <Text style={styles.presetBadgeText}>頂部素材已綁定</Text>
                  </View>
                )}
                {isStealthRecordingActive && (
                  <View style={[styles.presetBadge, styles.stealthBadge]}>
                    <Ionicons name="shield-checkmark" size={14} color={THEME.colors.danger} />
                    <Text style={[styles.presetBadgeText, { color: THEME.colors.danger }]}>
                      背景錄影已啟用
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Pledge Bet Contract Banner */}
            <TouchableOpacity
              style={[
                styles.pledgeContractCard,
                activePledgeContract && styles.pledgeContractCardActive,
              ]}
              onPress={() => setPledgeModalVisible(true)}
              activeOpacity={0.85}
            >
              <View style={styles.pledgeIconBox}>
                <MaterialCommunityIcons
                  name="sword-cross"
                  size={22}
                  color={activePledgeContract ? '#F59E0B' : '#60A5FA'}
                />
              </View>
              <View style={styles.questEntryTextBox}>
                <View style={styles.questEntryHeaderRow}>
                  <Text style={styles.pledgeCardTitle}>
                    {activePledgeContract
                      ? activePledgeContract.title
                      : '自律契約賭局 (Pledge Bet)'}
                  </Text>
                  <View
                    style={[
                      styles.pledgeStatusBadge,
                      activePledgeContract ? styles.pledgeActiveBadge : styles.pledgeIdleBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pledgeStatusText,
                        activePledgeContract ? { color: '#0F172A' } : { color: '#60A5FA' },
                      ]}
                    >
                      {activePledgeContract ? '已鎖定挑戰' : '未簽署'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.questEntryDesc}>
                  {activePledgeContract
                    ? `押注 ${activePledgeContract.stakeCredits} 點 · 違約懲罰生效中 · 點擊檢視`
                    : '設定時長與 Edge 急停契約 · 履約贏取 1.5 倍榮譽點數 · 違約觸發冷卻懲罰'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>

            {/* Time-gated Scenario Quest Trigger Banner */}
            <TouchableOpacity
              style={styles.questEntryCard}
              onPress={() => setQuestModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.questEntryIconBox}>
                <Ionicons name="compass" size={24} color="#F59E0B" />
              </View>
              <View style={styles.questEntryTextBox}>
                <View style={styles.questEntryHeaderRow}>
                  <Text style={styles.questEntryTitle}>時段情境冒險挑戰</Text>
                  <View style={styles.questTimeModeBadge}>
                    <Text style={styles.questTimeModeText}>
                      {new Date().getHours() >= 6 && new Date().getHours() < 22 ? '☀️ 日間' : '🌙 夜間'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.questEntryDesc}>
                  動態環境前置確認・解鎖極限指令與榮譽徽章
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>

            {/* Daily Physiological Check-In Banner */}
            <TouchableOpacity
              style={styles.dailyCheckInEntryCard}
              onPress={() => setDailyCheckInVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dailyCheckInIconBox}>
                <Ionicons name="camera" size={22} color="#EC4899" />
              </View>
              <View style={styles.questEntryTextBox}>
                <View style={styles.questEntryHeaderRow}>
                  <Text style={styles.dailyCheckInTitle}>每日生理打卡與今日最色</Text>
                  <View style={styles.dailyCheckInBadge}>
                    <Text style={styles.dailyCheckInBadgeText}>私密存檔</Text>
                  </View>
                </View>
                <Text style={styles.questEntryDesc}>
                  尺寸紀錄・睪丸狀態・今日最色精選・領取女友高反差讚嘆
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>

            {/* Mock Story Leaker Adventure Banner */}
            <TouchableOpacity
              style={styles.storyLeakerEntryCard}
              onPress={() => setStoryComposerVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.storyLeakerIconBox}>
                <Ionicons name="paper-plane" size={22} color="#8B5CF6" />
              </View>
              <View style={styles.questEntryTextBox}>
                <View style={styles.questEntryHeaderRow}>
                  <Text style={styles.storyLeakerTitle}>「限動發布與外流」冒險模擬</Text>
                  <View style={styles.storyLeakerBadge}>
                    <Text style={styles.storyLeakerBadgeText}>純本地模擬</Text>
                  </View>
                </View>
                <Text style={styles.questEntryDesc}>
                  零外網安全沙盒・擬真上傳・假留言與伴侶驚恐私訊抽屜
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>

            {/* 3D Parametric Anatomy Fitting Entry Card */}
            <TouchableOpacity
              style={styles.anatomy3DEntryCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setAnatomyFittingVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.anatomy3DIconBox}>
                <MaterialCommunityIcons name="cube-scan" size={22} color="#38BDF8" />
              </View>
              <View style={styles.questEntryTextBox}>
                <View style={styles.questEntryHeaderRow}>
                  <Text style={styles.anatomy3DTitle}>真理解剖 3D 擬合實驗室</Text>
                  <View style={styles.anatomy3DBadge}>
                    <Text style={styles.anatomy3DBadgeText}>3D 模型</Text>
                  </View>
                </View>
                <Text style={styles.questEntryDesc}>
                  海綿體三維建模・多角度拍照擬合・40 BPM 骨骼動畫即時預覽
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : layoutMode === 'fullscreen_timer' ? (
          /* Fullscreen Timer Mode */
          <View style={styles.fullscreenTimerContainer}>
            <TimerWidget
              isRunning={true}
              onTimerTick={handleTimerTick}
            />
          </View>
        ) : (
          /* Split-View Mode with Dynamic Draggable Divider */
          <View style={styles.splitViewContainer}>
            <SplitView
              topWidget={splitConfig.topWidget}
              bottomWidget={splitConfig.bottomWidget}
              topRatio={splitConfig.topRatio}
              onRatioChange={handleRatioChange}
              onSelectWidgetPress={handleOpenWidgetPicker}
              topPhotoUri={splitConfig.topPhotoUri}
              bottomPhotoUri={splitConfig.bottomPhotoUri}
<<<<<<< Updated upstream
              onTopPhotoSelected={(uri) =>
                setSplitConfig((prev) => ({ ...prev, topPhotoUri: uri }))
              }
              onBottomPhotoSelected={(uri) =>
                setSplitConfig((prev) => ({ ...prev, bottomPhotoUri: uri }))
              }
              onTimerTick={(sec) => setElapsedSeconds(sec)}
              elapsedSeconds={elapsedSeconds}
              currentBPM={0}
              stage="WARM_UP"
              arousalLevel={currentArousal}
              onSnapshotCaptured={(snap) => setSessionSnapshots((prev) => [...prev, snap])}
              recentSnapshots={sessionSnapshots}
              onOpenCheckIn={() => setDailyCheckInVisible(true)}
=======
              onTopPhotoSelected={handleTopPhotoSelected}
              onBottomPhotoSelected={handleBottomPhotoSelected}
              onTimerTick={handleTimerTick}
>>>>>>> Stashed changes
            />
          </View>
        )}

        {/* Blind Arousal Slider (Active during running session) */}
        {sessionState === 'running' && (
          <ArousalSlider
            level={currentArousal}
            onLevelChange={(lvl) => {
              setCurrentArousal(lvl);
              if (lvl >= 7.5 && currentArousal < 7.5) {
                girlfriendCompanion.triggerEvent('discipline');
              }
            }}
            side="right"
          />
        )}

        {/* Live Danmaku Overlay in Running Session */}
        {sessionState === 'running' && (
          <DanmakuOverlay
            isActive={true}
            densityMultiplier={currentArousal >= 7.0 ? 2.2 : 1.0}
          />
        )}
      </View>

      {/* Layout Selection Sheet */}
      <LayoutSelectorSheet
        visible={layoutSelectorVisible}
        onClose={() => setLayoutSelectorVisible(false)}
        onSelectLayout={handleSelectLayout}
      />

      {/* Widget Picker Sheet */}
      <WidgetPickerSheet
        visible={widgetPickerVisible}
        targetPane={targetPane}
        onClose={() => setWidgetPickerVisible(false)}
        onSelectWidget={handleWidgetSelected}
      />

      {/* Session Summary Modal */}
      <Modal
        visible={!!finishedRecord}
        transparent
        animationType="fade"
        onRequestClose={() => setFinishedRecord(null)}
      >
        <View style={styles.summaryBackdrop}>
          <View style={styles.summaryCard}>
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center' }}>
              <View style={styles.summaryIconCircle}>
                <Ionicons name="sparkles" size={36} color={THEME.colors.primaryLight} />
              </View>

              <Text style={styles.summaryTitle}>太棒了，完成紀錄！</Text>
              <Text style={styles.summarySub}>身心釋放完畢，真實數據已持久化寫入本地沙盒</Text>

              {/* Verified Write Badge */}
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-done-circle" size={15} color={THEME.colors.success} />
                <Text style={styles.verifiedText}>
                  本地寫入校驗通過：{finishedRecord?.id}
                </Text>
              </View>

              <View style={styles.summaryStatsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>持續時間</Text>
                  <Text style={styles.statValue}>
                    {Math.floor((finishedRecord?.durationSeconds || 0) / 60)}分{' '}
                    {(finishedRecord?.durationSeconds || 0) % 60}秒
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>佈局模式</Text>
                  <Text style={styles.statValue}>
                    {finishedRecord?.layoutMode === 'split_view' ? '雙視窗分割' : '全螢幕計時'}
                  </Text>
                </View>
              </View>

<<<<<<< Updated upstream
            {finishedRecord?.snapshots && finishedRecord.snapshots.length > 0 && (
              <View style={styles.snapshotSavedBadge}>
                <Ionicons name="camera" size={14} color={THEME.colors.primaryLight} />
                <Text style={styles.snapshotSavedText}>
                  已安全擷取 {finishedRecord.snapshots.length} 張時序快照，可在分析頁開啟狀態對比檢視
                </Text>
              </View>
            )}

            {/* EHS Hardness Score Evaluation */}
            <TouchableOpacity
              style={styles.summaryEhsBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setEhsModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={16} color="#EF4444" />
              <Text style={styles.summaryEhsBtnText}>評估本次 EHS 硬度 (豆腐 ~ 橡木)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.summaryCloseBtn}
              onPress={() => setFinishedRecord(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.summaryCloseBtnText}>回到主頁</Text>
            </TouchableOpacity>
=======
              {finishedRecord?.videoUri && (
                <View style={styles.videoSavedBadge}>
                  <Ionicons name="lock-closed" size={14} color={THEME.colors.success} />
                  <Text style={styles.videoSavedText}>
                    機密視訊已隔離存於本地沙盒，可於分析頁以 Face ID 解鎖檢視
                  </Text>
                </View>
              )}

              {/* Rating Section */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>體驗評分</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setUserRating(star)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={star <= userRating ? 'star' : 'star-outline'}
                        size={28}
                        color={star <= userRating ? '#F59E0B' : THEME.colors.textMuted}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Note Section */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>備註心得</Text>
                <TextInput
                  style={styles.textInput}
                  value={userNote}
                  onChangeText={setUserNote}
                  placeholder="輸入備註或感受..."
                  placeholderTextColor={THEME.colors.textMuted}
                  maxLength={60}
                />
              </View>

              <TouchableOpacity
                style={styles.summaryCloseBtn}
                onPress={handleSaveSummary}
                activeOpacity={0.8}
              >
                <Text style={styles.summaryCloseBtnText}>確認保存並回到主頁</Text>
              </TouchableOpacity>
            </ScrollView>
>>>>>>> Stashed changes
          </View>
        </View>
      </Modal>

      {/* Time-gated Scenario Quest Modal */}
      <ScenarioQuestModal
        visible={questModalVisible}
        onClose={() => setQuestModalVisible(false)}
        onPanicAbort={handleQuestPanicAbort}
        onCompleteQuest={handleCompleteQuest}
      />

      {/* Daily Check-In Modal */}
      <DailyCheckInModal
        visible={dailyCheckInVisible}
        onClose={() => setDailyCheckInVisible(false)}
      />

      {/* Global User Profile & Settings Screen */}
      <SettingsScreen
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      {/* Mock Story Composer Modal */}
      <MockStoryComposer
        visible={storyComposerVisible}
        onClose={() => setStoryComposerVisible(false)}
        onStoryPublished={handleStoryPublished}
      />

      {/* Mock Story Viewer Modal */}
      <MockStoryViewer
        visible={storyViewerVisible}
        onClose={() => setStoryViewerVisible(false)}
        photoUri={publishedStoryUri}
      />

      {/* Pledge Bet Modal */}
      <PledgeBetModal
        visible={pledgeModalVisible}
        onClose={() => {
          setPledgeModalVisible(false);
          void refreshPledgeStatus();
        }}
        onContractCommitted={() => {
          void refreshPledgeStatus();
        }}
      />

      {/* Pledge Settlement Result Modal */}
      <PledgeSettlementModal
        visible={pledgeSettlementVisible}
        result={pledgeSettlementResult}
        onClose={() => setPledgeSettlementVisible(false)}
        onEmergencyUnlock={handleEmergencyUnlock}
      />

      {/* 3D Parametric Anatomy Fitting Studio Modal */}
      <Anatomy3DFittingModal
        visible={anatomyFittingVisible}
        onClose={() => setAnatomyFittingVisible(false)}
      />

      {/* Secret Notes Private Inbox Modal */}
      <PrivateInboxModal
        visible={privateInboxVisible}
        onClose={() => {
          setPrivateInboxVisible(false);
          void refreshSecretNotes();
        }}
        onRewardClaimed={() => {
          void refreshSecretNotes();
        }}
      />

      {/* EHS Selector Modal */}
      <EHSSelectorModal
        visible={ehsModalVisible}
        onClose={() => setEhsModalVisible(false)}
      />

      {/* Virtual Review Panel Wishlist Modal */}
      <WishlistModal
        visible={wishlistVisible}
        onClose={() => setWishlistVisible(false)}
        onOpenUnderwearStudio={() => setAnatomyFittingVisible(true)}
      />

      {/* Urology Medical Knowledge Screen */}
      <MedicalKnowledgeScreen
        visible={medicalScreenVisible}
        onClose={() => setMedicalScreenVisible(false)}
      />

      {/* Quad-Point Handcuff Protocol Modal */}
      <QuadPointHandcuffModal
        visible={handcuffModalVisible}
        targetSeconds={30}
        onClose={() => setHandcuffModalVisible(false)}
      />

      {/* Panel Daily Mission Modal */}
      <PanelMissionModal
        visible={panelMissionVisible}
        onClose={() => setPanelMissionVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inboxBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
    position: 'relative',
  },
  inboxRedDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0B0F19',
  },
  inboxRedDotText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryEhsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  summaryEhsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F87171',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  titleGroup: {
    gap: 2,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  radarHeaderWrapper: {
    marginTop: 4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stealthToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  stealthToggleActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  stealthToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  stealthToggleTextActive: {
    color: THEME.colors.danger,
    fontWeight: '700',
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
  },
  finishBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
  },
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 20,
    paddingBottom: 90, // Leave room for bottom dock
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.success,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.success,
  },
  breathingWrapper: {
    marginVertical: 20,
  },
  quickPresetCard: {
    width: '100%',
    backgroundColor: THEME.colors.surface,
    padding: 16,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  presetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 8,
  },
  lockoutBanner: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: THEME.radius.lg,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    marginBottom: 14,
  },
  lockoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  lockoutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  lockoutDesc: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 15,
  },
  emergencyUnlockLink: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  emergencyUnlockLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F87171',
    textDecorationLine: 'underline',
  },
  pledgeContractCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    padding: 14,
    borderRadius: THEME.radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    gap: 12,
  },
  pledgeContractCardActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#F59E0B',
  },
  pledgeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pledgeCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  pledgeStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pledgeActiveBadge: {
    backgroundColor: '#F59E0B',
  },
  pledgeIdleBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  pledgeStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  presetBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.md,
  },
  stealthBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  presetBadgeText: {
    fontSize: 12,
    color: THEME.colors.text,
    fontWeight: '600',
  },
  questEntryCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    padding: 14,
    borderRadius: THEME.radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    gap: 12,
  },
  questEntryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questEntryTextBox: {
    flex: 1,
  },
  questEntryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  questEntryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  questTimeModeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  questTimeModeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  questEntryDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 15,
  },
  dailyCheckInEntryCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    padding: 14,
    borderRadius: THEME.radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(236, 72, 153, 0.35)',
    gap: 12,
  },
  dailyCheckInIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyCheckInTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  dailyCheckInBadge: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dailyCheckInBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EC4899',
  },
  storyLeakerEntryCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    padding: 14,
    borderRadius: THEME.radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    gap: 12,
  },
  storyLeakerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyLeakerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  storyLeakerBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  storyLeakerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A78BFA',
  },
  anatomy3DEntryCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    padding: 14,
    borderRadius: THEME.radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    gap: 12,
  },
  anatomy3DIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  anatomy3DTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  anatomy3DBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  anatomy3DBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
  },
  fullscreenTimerContainer: {
    flex: 1,
    paddingBottom: 90,
  },
  splitViewContainer: {
    flex: 1,
    paddingBottom: 90,
  },
  summaryBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  summaryCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: THEME.colors.surface,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  summaryIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  summarySub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
    marginBottom: 14,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.success,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 12,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  videoSavedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 10,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 12,
    width: '100%',
  },
  videoSavedText: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.text,
    lineHeight: 16,
    fontWeight: '500',
  },
<<<<<<< Updated upstream
  snapshotSavedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    padding: 12,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginBottom: 20,
    width: '100%',
  },
  snapshotSavedText: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.text,
    lineHeight: 16,
    fontWeight: '500',
=======
  inputSection: {
    width: '100%',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  textInput: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: THEME.colors.text,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
>>>>>>> Stashed changes
  },
  summaryCloseBtn: {
    width: '100%',
    height: 48,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  summaryCloseBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
