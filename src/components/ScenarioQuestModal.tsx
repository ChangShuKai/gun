import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import {
  TimeMode,
  EnvironmentSafety,
  QuestDefinition,
  QuestRecord,
} from '../types';
import { ScenarioQuestEngine } from '../services/scenarioQuest';

interface ScenarioQuestModalProps {
  visible: boolean;
  onClose: () => void;
  onPanicAbort: () => void;
  onCompleteQuest: (record: QuestRecord) => void;
}

type QuestStep = 'PRE_CHECK' | 'BRIEFING' | 'ACTIVE';

export const ScenarioQuestModal: React.FC<ScenarioQuestModalProps> = ({
  visible,
  onClose,
  onPanicAbort,
  onCompleteQuest,
}) => {
  const [step, setStep] = useState<QuestStep>('PRE_CHECK');
  const [selectedQuest, setSelectedQuest] = useState<QuestDefinition | null>(null);

  // Active Timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(180);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Current Time Mode derived directly
  const timeMode: TimeMode = ScenarioQuestEngine.getCurrentTimeMode();

  const handleCloseModal = () => {
    setStep('PRE_CHECK');
    setIsTimerRunning(false);
    setElapsedSeconds(0);
    onClose();
  };

  // Countdown timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, remainingSeconds]);

  const questionData = ScenarioQuestEngine.getPreQuestQuestion(timeMode);

  const handleSelectEnv = (safety: EnvironmentSafety) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const matched = ScenarioQuestEngine.matchQuest(timeMode, safety);
    setSelectedQuest(matched);
    setRemainingSeconds(matched.durationSeconds);
    setStep('BRIEFING');
  };

  const handleStartQuest = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setStep('ACTIVE');
    setIsTimerRunning(true);
  };

  const handlePanicAbortPress = () => {
    // 0ms Halt and panic jump
    setIsTimerRunning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    onPanicAbort();
  };

  const handleClaimSuccess = () => {
    if (!selectedQuest) return;
    setIsTimerRunning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const record: QuestRecord = {
      id: `quest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      questId: selectedQuest.id,
      questTitle: selectedQuest.title,
      badgeName: selectedQuest.badgeName,
      badgeIcon: selectedQuest.badgeIcon,
      timestamp: Date.now(),
      durationSeconds: elapsedSeconds,
      completed: true,
      notes: `在 ${selectedQuest.timeMode === 'DAY' ? '日間' : '夜間'} 順利達成 ${selectedQuest.title}`,
    };

    onCompleteQuest(record);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCloseModal}>
      <SafeAreaView style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.timeTag}>
              <MaterialCommunityIcons
                name={timeMode === 'DAY' ? 'white-balance-sunny' : 'moon-waning-crescent'}
                size={16}
                color={timeMode === 'DAY' ? '#F59E0B' : '#8B5CF6'}
              />
              <Text style={styles.timeTagText}>
                {timeMode === 'DAY' ? '日間情境 (06:00-22:00)' : '夜間情境 (22:00-06:00)'}
              </Text>
            </View>

            {step !== 'ACTIVE' && (
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleCloseModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* STEP 1: Pre-Quest Environmental Check */}
          {step === 'PRE_CHECK' && (
            <View style={styles.stepContent}>
              <View style={styles.badgePulseIcon}>
                <MaterialCommunityIcons name="compass-outline" size={38} color={THEME.colors.primary} />
              </View>

              <Text style={styles.questTitle}>{questionData.title}</Text>
              <Text style={styles.questSub}>{questionData.subtitle}</Text>

              <View style={styles.optionsList}>
                <TouchableOpacity
                  style={[styles.optionCard, styles.optionCardDanger]}
                  onPress={() => handleSelectEnv('SOMEONE_AROUND')}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionIconBox}>
                    <Ionicons name="people" size={22} color="#EF4444" />
                  </View>
                  <View style={styles.optionTextBox}>
                    <Text style={styles.optionTitle}>{questionData.optionSomeone}</Text>
                    <Text style={styles.optionDesc}>
                      {timeMode === 'DAY' ? '觸發高分貝警戒「無聲潛伏挑戰」' : '觸發陰影探查「極限死角挑戰」'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionCard, styles.optionCardSafe]}
                  onPress={() => handleSelectEnv('SOLO')}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionIconBox}>
                    <Ionicons name="person" size={22} color="#10B981" />
                  </View>
                  <View style={styles.optionTextBox}>
                    <Text style={styles.optionTitle}>{questionData.optionSolo}</Text>
                    <Text style={styles.optionDesc}>
                      {timeMode === 'DAY' ? '觸發極限刺激「禁忌巡航挑戰」' : '觸發微光張力「窗簾暗光挑戰」'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 2: Quest Briefing */}
          {step === 'BRIEFING' && selectedQuest && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.briefingContent}>
              <View style={styles.dangerLevelRow}>
                <View style={[styles.dangerBadge, selectedQuest.dangerLevel === 'EXTREME' && styles.dangerExtreme]}>
                  <Text style={styles.dangerBadgeText}>危險評級：{selectedQuest.dangerLevel}</Text>
                </View>
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={13} color={THEME.colors.primaryLight} />
                  <Text style={styles.durationBadgeText}>{Math.floor(selectedQuest.durationSeconds / 60)} 分鐘限時</Text>
                </View>
              </View>

              <Text style={styles.briefingTitle}>{selectedQuest.title}</Text>
              <Text style={styles.briefingSubtitle}>{selectedQuest.subtitle}</Text>

              {/* Reward Badge Preview */}
              <View style={styles.rewardCard}>
                <View style={styles.rewardIconCircle}>
                  <MaterialCommunityIcons name={selectedQuest.badgeIcon as any} size={28} color="#F59E0B" />
                </View>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardLabel}>挑戰解鎖榮譽徽章</Text>
                  <Text style={styles.rewardBadgeName}>{selectedQuest.badgeName} 🏅</Text>
                </View>
              </View>

              <Text style={styles.rulesHeader}>挑戰規則與禁忌限制：</Text>
              <View style={styles.rulesContainer}>
                {selectedQuest.rules.map((rule, idx) => (
                  <View key={idx} style={styles.ruleItem}>
                    <Text style={styles.ruleNum}>{idx + 1}.</Text>
                    <Text style={styles.ruleText}>{rule}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.startQuestBtn} onPress={handleStartQuest} activeOpacity={0.8}>
                <MaterialCommunityIcons name="fire" size={20} color="#FFFFFF" />
                <Text style={styles.startQuestBtnText}>接受挑戰・立即展開</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* STEP 3: Active Quest Execution */}
          {step === 'ACTIVE' && selectedQuest && (
            <View style={styles.activeContainer}>
              <View style={styles.activeHeader}>
                <Text style={styles.activeQuestTitle}>{selectedQuest.title}</Text>
                <Text style={styles.activeQuestSub}>{selectedQuest.badgeName} 試煉進行中</Text>
              </View>

              {/* Giant Countdown Clock */}
              <View style={styles.clockCircle}>
                <Text style={styles.clockTimeText}>{formatTimer(remainingSeconds)}</Text>
                <Text style={styles.clockSubText}>
                  {remainingSeconds > 0 ? '挑戰剩餘時間' : '限時結束'}
                </Text>
              </View>

              {/* Ambient Decibel Meter Simulator */}
              <View style={styles.soundMeterBar}>
                <Ionicons name="mic-outline" size={16} color={THEME.colors.success} />
                <Text style={styles.soundMeterText}>環境音量：32 dB (無聲潛伏安全)</Text>
              </View>

              {/* Actions: Panic Abort vs Claim Success */}
              <View style={styles.activeActions}>
                <TouchableOpacity
                  style={styles.claimSuccessBtn}
                  onPress={handleClaimSuccess}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.claimSuccessBtnText}>挑戰成功・記錄並領取徽章</Text>
                </TouchableOpacity>

                {/* Permanent 0ms Panic Abort Button */}
                <TouchableOpacity
                  style={styles.panicAbortBtn}
                  onPress={handlePanicAbortPress}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="alert-octagon" size={20} color="#FFFFFF" />
                  <Text style={styles.panicAbortBtnText}>⚠️ 緊急放棄 (Panic Abort)</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.95)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    padding: 20,
    maxHeight: '92%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  badgePulseIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  questTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  questSub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  optionsList: {
    width: '100%',
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  optionCardDanger: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  optionCardSafe: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextBox: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  briefingContent: {
    paddingVertical: 10,
  },
  dangerLevelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  dangerExtreme: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: THEME.colors.danger,
  },
  dangerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
  },
  briefingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  briefingSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginBottom: 16,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: 16,
    gap: 12,
  },
  rewardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardLabel: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  rewardBadgeName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  rulesHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 8,
  },
  rulesContainer: {
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  ruleItem: {
    flexDirection: 'row',
    gap: 8,
  },
  ruleNum: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primaryLight,
  },
  ruleText: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.text,
    lineHeight: 18,
  },
  startQuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  startQuestBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activeContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  activeQuestTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.text,
  },
  activeQuestSub: {
    fontSize: 12,
    color: THEME.colors.primaryLight,
    marginTop: 4,
  },
  clockCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 4,
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  clockTimeText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  clockSubText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  soundMeterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 24,
  },
  soundMeterText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.success,
  },
  activeActions: {
    width: '100%',
    gap: 12,
  },
  claimSuccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.success,
    paddingVertical: 14,
    borderRadius: 14,
  },
  claimSuccessBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  panicAbortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.danger,
    paddingVertical: 14,
    borderRadius: 14,
  },
  panicAbortBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
