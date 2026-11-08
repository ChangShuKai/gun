import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, Feather } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { LayoutMode, WidgetType, SplitConfig, HabitRecord } from '../types';
import { useApp } from '../context/AppContext';
import { BreathingButton } from '../components/BreathingButton';
import { SplitView } from '../components/SplitView';
import { TimerWidget } from '../components/TimerWidget';
import { LayoutSelectorSheet } from '../components/LayoutSelectorSheet';
import { WidgetPickerSheet } from '../components/WidgetPickerSheet';
import { StealthRecorder, StealthRecorderHandle } from '../components/StealthRecorder';

export const ActionScreen: React.FC = () => {
  const {
    addRecord,
    replicatedConfig,
    clearReplicatedConfig,
    isStealthRecordingActive,
    setIsStealthRecordingActive,
  } = useApp();

  // Session state: 'idle' | 'running'
  const [sessionState, setSessionState] = useState<'idle' | 'running'>('idle');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split_view');

  // Split view configuration
  const [splitConfig, setSplitConfig] = useState<SplitConfig>({
    mode: 'split_view',
    topWidget: 'timer',
    bottomWidget: 'photo',
    topRatio: 0.5,
    topPhotoUri: null,
    bottomPhotoUri: null,
  });

  // Elapsed time tracker
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const sessionStartTimeRef = useRef<number>(0);

  // Sheets state
  const [layoutSelectorVisible, setLayoutSelectorVisible] = useState<boolean>(false);
  const [widgetPickerVisible, setWidgetPickerVisible] = useState<boolean>(false);
  const [targetPane, setTargetPane] = useState<'top' | 'bottom' | null>(null);

  // Summary dialog after finishing
  const [finishedRecord, setFinishedRecord] = useState<HabitRecord | null>(null);

  // Stealth recorder reference
  const recorderRef = useRef<StealthRecorderHandle>(null);

  // Listen for "Apply Layout / 一鍵復刻" from Analytics
  useEffect(() => {
    if (replicatedConfig) {
      const timer = setTimeout(() => {
        setLayoutMode(replicatedConfig.mode);
        setSplitConfig(replicatedConfig);
        clearReplicatedConfig();
        // Show friendly feedback
        Alert.alert('已復刻歷史佈局', '成功載入歷史視窗配置與素材！點擊「開始」即可展開。');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [replicatedConfig, clearReplicatedConfig]);

  // Handle giant start button click
  const handleStartPress = () => {
    setLayoutSelectorVisible(true);
  };

  // User chooses layout mode
  const handleSelectLayout = async (mode: LayoutMode) => {
    setLayoutSelectorVisible(false);
    setLayoutMode(mode);
    setSessionState('running');
    sessionStartTimeRef.current = Date.now();
    setElapsedSeconds(0);

    // If stealth recording is on, start background recording
    if (isStealthRecordingActive && recorderRef.current) {
      try {
        await recorderRef.current.startRecording();
      } catch (err) {
        console.warn('Stealth recorder error:', err);
      }
    }
  };

  // Finish session
  const handleFinishSession = async () => {
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
      notes: '個人放鬆與習慣追蹤',
    };

    await addRecord(newRecord);
    setFinishedRecord(newRecord);
    setSessionState('idle');
  };

  const handleOpenWidgetPicker = (pane: 'top' | 'bottom') => {
    setTargetPane(pane);
    setWidgetPickerVisible(true);
  };

  const handleWidgetSelected = (widget: WidgetType) => {
    if (targetPane === 'top') {
      setSplitConfig((prev) => ({ ...prev, topWidget: widget }));
    } else if (targetPane === 'bottom') {
      setSplitConfig((prev) => ({ ...prev, bottomWidget: widget }));
    }
    setWidgetPickerVisible(false);
  };

  const toggleStealthRecording = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsStealthRecordingActive(!isStealthRecordingActive);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background stealth recording component */}
      <StealthRecorder ref={recorderRef} enabled={isStealthRecordingActive} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.pageTitle}>尻尻體驗</Text>
          <Text style={styles.pageSubtitle}>
            {sessionState === 'running' ? '● 正在記錄中' : '準備就緒・點擊開啟'}
          </Text>
        </View>

        {/* Top Right Controls: Stealth Recording Toggle + Finish Button */}
        <View style={styles.headerRight}>
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
              <Text style={styles.statusPillText}>本地沙盒模式・100% 隱私保護</Text>
            </View>

            <View style={styles.breathingWrapper}>
              <BreathingButton
                onPress={handleStartPress}
                label="開始"
                sublabel="點擊展開佈局"
              />
            </View>

            <View style={styles.quickPresetCard}>
              <Text style={styles.presetTitle}>預設佈局配置</Text>
              <View style={styles.presetBadgesRow}>
                <View style={styles.presetBadge}>
                  <Feather name="columns" size={14} color={THEME.colors.primaryLight} />
                  <Text style={styles.presetBadgeText}>
                    上下分割 ({splitConfig.topWidget} + {splitConfig.bottomWidget})
                  </Text>
                </View>
                {isStealthRecordingActive && (
                  <View style={[styles.presetBadge, styles.stealthBadge]}>
                    <Ionicons name="shield-checkmark" size={14} color={THEME.colors.danger} />
                    <Text style={[styles.presetBadgeText, { color: THEME.colors.danger }]}>
                      背景錄影
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : layoutMode === 'fullscreen_timer' ? (
          /* Fullscreen Timer Mode */
          <View style={styles.fullscreenTimerContainer}>
            <TimerWidget
              isRunning={true}
              onTimerTick={(sec) => setElapsedSeconds(sec)}
            />
          </View>
        ) : (
          /* Split-View Mode with Dynamic Draggable Divider */
          <View style={styles.splitViewContainer}>
            <SplitView
              topWidget={splitConfig.topWidget}
              bottomWidget={splitConfig.bottomWidget}
              topRatio={splitConfig.topRatio}
              onRatioChange={(r) => setSplitConfig((prev) => ({ ...prev, topRatio: r }))}
              onSelectWidgetPress={handleOpenWidgetPicker}
              topPhotoUri={splitConfig.topPhotoUri}
              bottomPhotoUri={splitConfig.bottomPhotoUri}
              onTopPhotoSelected={(uri) =>
                setSplitConfig((prev) => ({ ...prev, topPhotoUri: uri }))
              }
              onBottomPhotoSelected={(uri) =>
                setSplitConfig((prev) => ({ ...prev, bottomPhotoUri: uri }))
              }
              onTimerTick={(sec) => setElapsedSeconds(sec)}
            />
          </View>
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
            <View style={styles.summaryIconCircle}>
              <Ionicons name="sparkles" size={36} color={THEME.colors.primaryLight} />
            </View>

            <Text style={styles.summaryTitle}>太棒了，完成紀錄！</Text>
            <Text style={styles.summarySub}>身心釋放完畢，數據已安全加密寫入沙盒</Text>

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

            {finishedRecord?.videoUri && (
              <View style={styles.videoSavedBadge}>
                <Ionicons name="lock-closed" size={14} color={THEME.colors.success} />
                <Text style={styles.videoSavedText}>
                  機密視訊已隔離存於本地沙盒，可於分析頁以 Face ID 解鎖檢視
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.summaryCloseBtn}
              onPress={() => setFinishedRecord(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.summaryCloseBtnText}>回到主頁</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
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
    padding: 24,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: THEME.colors.surface,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  summaryIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.text,
    marginBottom: 6,
  },
  summarySub: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 14,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  videoSavedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 20,
    width: '100%',
  },
  videoSavedText: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.text,
    lineHeight: 16,
    fontWeight: '500',
  },
  summaryCloseBtn: {
    width: '100%',
    height: 50,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCloseBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
