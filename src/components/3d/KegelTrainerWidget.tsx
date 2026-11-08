import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { KegelMode, KegelPhase } from '../../types';
import { kegelService } from '../../services/kegelService';
import { wishlistService } from '../../services/wishlistService';
import { ContextualDoctorTip } from '../ContextualDoctorTip';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface KegelTrainerWidgetProps {
  onSessionComplete?: () => void;
}

export const KegelTrainerWidget: React.FC<KegelTrainerWidgetProps> = ({
  onSessionComplete,
}) => {
  const [mode, setMode] = useState<KegelMode>('SPEED_FLICKS');
  const [phase, setPhase] = useState<KegelPhase>('IDLE');
  const [currentRep, setCurrentRep] = useState<number>(0);
  const [phaseCountdown, setPhaseCountdown] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Animation values for anatomical contraction
  const [contractionAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));

  const modeConfig = kegelService.getModeConfig(mode);
  const isRunning = phase === 'CONTRACT' || phase === 'RELAX';

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef({
    phase,
    mode,
    currentRep,
    phaseCountdown,
    totalSeconds,
  });

  useEffect(() => {
    stateRef.current = {
      phase,
      mode,
      currentRep,
      phaseCountdown,
      totalSeconds,
    };
  }, [phase, mode, currentRep, phaseCountdown, totalSeconds]);

  // Handle phase-based haptics & animation
  const triggerPhaseFeedback = useCallback((targetPhase: KegelPhase, targetMode: KegelMode) => {
    if (targetPhase === 'CONTRACT') {
      Animated.timing(contractionAnim, {
        toValue: 1,
        duration: targetMode === 'SPEED_FLICKS' ? 300 : 700,
        useNativeDriver: false,
      }).start();

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (targetMode === 'ENDURANCE_HOLDS') {
          // Mid-hold sustaining pulse
          setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }, 2500);
          setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }, 4500);
        }
      } catch {}
    } else if (targetPhase === 'RELAX') {
      Animated.timing(contractionAnim, {
        toValue: 0,
        duration: targetMode === 'SPEED_FLICKS' ? 300 : 600,
        useNativeDriver: false,
      }).start();

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 180);
      } catch {}
    } else {
      Animated.timing(contractionAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }
  }, [contractionAnim]);

  // Master Clock Loop
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const cur = stateRef.current;
      const curConfig = kegelService.getModeConfig(cur.mode);

      setTotalSeconds((prev) => prev + 1);

      if (cur.phaseCountdown > 1) {
        setPhaseCountdown((prev) => prev - 1);
      } else {
        // Transition between CONTRACT and RELAX
        if (cur.phase === 'CONTRACT') {
          // Switch to RELAX
          setPhase('RELAX');
          setPhaseCountdown(curConfig.relaxDurationSec);
          triggerPhaseFeedback('RELAX', cur.mode);
        } else if (cur.phase === 'RELAX') {
          // Finished one rep
          const nextRep = cur.currentRep + 1;
          setCurrentRep(nextRep);

          if (nextRep >= curConfig.targetReps) {
            // Completed all reps!
            setPhase('COMPLETE');
            setIsFinished(true);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}

            // Save record to storage
            const todayStr = new Date().toISOString().split('T')[0];
            void kegelService.saveRecord({
              mode: cur.mode,
              completedReps: nextRep,
              targetReps: curConfig.targetReps,
              durationSeconds: cur.totalSeconds + 1,
              avgHoldSeconds: curConfig.contractDurationSec,
              date: todayStr,
            }).then(() => {
              void wishlistService.syncProgress();
            });

            if (onSessionComplete) onSessionComplete();
          } else {
            // Next rep contract
            setPhase('CONTRACT');
            setPhaseCountdown(curConfig.contractDurationSec);
            triggerPhaseFeedback('CONTRACT', cur.mode);
          }
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, triggerPhaseFeedback, onSessionComplete]);

  // Breathing pulse animation for relaxed state
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1800,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1800,
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleStartWorkout = () => {
    setIsFinished(false);
    setCurrentRep(0);
    setTotalSeconds(0);
    setPhase('CONTRACT');
    setPhaseCountdown(modeConfig.contractDurationSec);
    triggerPhaseFeedback('CONTRACT', mode);
  };

  const handlePauseWorkout = () => {
    setPhase('IDLE');
    triggerPhaseFeedback('IDLE', mode);
  };

  const handleResetWorkout = () => {
    setPhase('IDLE');
    setCurrentRep(0);
    setPhaseCountdown(0);
    setTotalSeconds(0);
    setIsFinished(false);
    triggerPhaseFeedback('IDLE', mode);
  };

  const toggleMode = (newMode: KegelMode) => {
    if (isRunning) return;
    setMode(newMode);
    setCurrentRep(0);
    setPhase('IDLE');
    setIsFinished(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.titleCol}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: `${modeConfig.accentColor}25` }]}>
              <Text style={[styles.badgeText, { color: modeConfig.accentColor }]}>
                {modeConfig.tag}
              </Text>
            </View>
            <Text style={styles.headerTitle}>骨盆底肌 3D 阻抗訓練</Text>
          </View>
          <Text style={styles.headerSub}>恥骨尾骨肌 (PC) 矢狀剖面與觸覺脈衝引導</Text>
        </View>

        {/* Mode switcher pills */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[
              styles.modeTab,
              mode === 'SPEED_FLICKS' && styles.modeTabActive,
            ]}
            onPress={() => toggleMode('SPEED_FLICKS')}
            disabled={isRunning}
          >
            <Text
              style={[
                styles.modeTabText,
                mode === 'SPEED_FLICKS' && styles.modeTabTextActive,
              ]}
            >
              爆發快縮
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeTab,
              mode === 'ENDURANCE_HOLDS' && styles.modeTabActive,
            ]}
            onPress={() => toggleMode('ENDURANCE_HOLDS')}
            disabled={isRunning}
          >
            <Text
              style={[
                styles.modeTabText,
                mode === 'ENDURANCE_HOLDS' && styles.modeTabTextActive,
              ]}
            >
              耐力深鎖
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Sagittal Cross-Section Anatomical Visualizer */}
      <View style={styles.viewportCard}>
        <Animated.View style={styles.svgWrapper}>
          <Svg width={SCREEN_WIDTH - 64} height={190} viewBox="0 0 320 190">
            <Defs>
              <LinearGradient id="pcMuscleGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor={phase === 'CONTRACT' ? '#F43F5E' : '#38BDF8'} stopOpacity="0.95" />
                <Stop offset="100%" stopColor={phase === 'CONTRACT' ? '#E11D48' : '#1E40AF'} stopOpacity="0.85" />
              </LinearGradient>
              <LinearGradient id="boneGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#94A3B8" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#475569" stopOpacity="0.9" />
              </LinearGradient>
              <LinearGradient id="organGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#FB7185" stopOpacity="0.25" />
                <Stop offset="100%" stopColor="#818CF8" stopOpacity="0.15" />
              </LinearGradient>
            </Defs>

            {/* Grid coordinate subtle background */}
            <Path
              d="M 20 40 L 300 40 M 20 95 L 300 95 M 20 150 L 300 150"
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="4,4"
              strokeWidth="1"
            />

            {/* 1. Pubic Bone (恥骨 - 前側骨骼樞紐) */}
            <Path
              d="M 55 58 C 65 52 75 62 70 78 C 66 88 50 92 46 80 C 43 70 48 60 55 58 Z"
              fill="url(#boneGrad)"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            <SvgText x="58" y="73" fill="#E2E8F0" fontSize="9" fontWeight="700" textAnchor="middle">
              恥骨
            </SvgText>

            {/* 2. Sacrum & Coccyx (薦骨/尾骨 - 後側骨骼錨點) */}
            <Path
              d="M 250 48 C 265 50 270 75 264 96 C 260 108 248 116 244 110 C 240 102 245 80 248 60 Z"
              fill="url(#boneGrad)"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            <SvgText x="256" y="85" fill="#E2E8F0" fontSize="9" fontWeight="700" textAnchor="middle">
              薦尾骨
            </SvgText>

            {/* 3. Bladder (膀胱腔體) */}
            <Path
              d="M 90 55 C 115 40 160 42 175 62 C 185 78 170 100 145 104 C 115 106 85 92 90 55 Z"
              fill="url(#organGrad)"
              stroke="rgba(251,113,133,0.4)"
              strokeWidth="1.2"
            />
            <SvgText x="135" y="78" fill="#FDA4AF" fontSize="9" textAnchor="middle">
              膀胱
            </SvgText>

            {/* 4. Prostate & Urethral Sphincter (前列腺與括約肌閥門) */}
            <Circle cx="120" cy="112" r="14" fill="#6366F1" fillOpacity="0.45" stroke="#818CF8" strokeWidth="1.5" />
            <SvgText x="120" y="115" fill="#FFFFFF" fontSize="8" fontWeight="600" textAnchor="middle">
              括約閥門
            </SvgText>

            {/* 5. Bulbar & Cavernous Base (海綿體根部) */}
            <G>
              <Path
                d="M 68 85 C 80 82 105 108 100 128 C 96 142 70 135 65 118 Z"
                fill="#3B82F6"
                fillOpacity="0.5"
                stroke="#60A5FA"
                strokeWidth="1.2"
              />
              <SvgText x="82" y="125" fill="#93C5FD" fontSize="8" textAnchor="middle">
                海綿體根部
              </SvgText>
            </G>

            {/* 6. Dynamic Scrotum / Testicular Sac (陰囊微升降) */}
            <Circle
              cx="58"
              cy={138}
              r="12"
              fill="rgba(147, 197, 253, 0.25)"
              stroke="#60A5FA"
              strokeWidth="1"
            />
            <SvgText x="58" y="141" fill="#93C5FD" fontSize="7" textAnchor="middle">
              陰囊
            </SvgText>

            {/* 7. THE PC MUSCLE & LEVATOR ANI (恥骨尾骨肌 / 提肛肌動態吊床) */}
            {/* When contracting: muscle arches UPWARD from y=135 towards y=116 */}
            <Path
              d={
                phase === 'CONTRACT'
                  ? 'M 68 85 Q 140 108 244 110 Q 150 126 68 90 Z'
                  : 'M 68 85 Q 145 138 244 110 Q 150 148 68 90 Z'
              }
              fill="url(#pcMuscleGrad)"
              stroke={phase === 'CONTRACT' ? '#F43F5E' : '#38BDF8'}
              strokeWidth="2.5"
            />

            {/* Contracting Vector Arrows (向上提拉向量動態) */}
            {phase === 'CONTRACT' && (
              <G>
                <Path
                  d="M 145 142 L 145 118 M 140 124 L 145 118 L 150 124"
                  stroke="#F43F5E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M 175 138 L 175 120 M 171 125 L 175 120 L 179 125"
                  stroke="#FB7185"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </G>
            )}

            {/* Label for PC Muscle */}
            <SvgText
              x="160"
              y={phase === 'CONTRACT' ? 102 : 158}
              fill={phase === 'CONTRACT' ? '#FFE4E6' : '#BAE6FD'}
              fontSize="10"
              fontWeight="800"
              textAnchor="middle"
            >
              {phase === 'CONTRACT' ? '▲ PC 肌緊縮上提 ▲' : 'PC 肌 (恥骨尾骨肌吊床)'}
            </SvgText>
          </Svg>
        </Animated.View>

        {/* Dynamic status pill */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.phaseBadge,
              phase === 'CONTRACT' && styles.phaseBadgeContract,
              phase === 'RELAX' && styles.phaseBadgeRelax,
            ]}
          >
            <MaterialCommunityIcons
              name={
                phase === 'CONTRACT'
                  ? 'arrow-collapse-up'
                  : phase === 'RELAX'
                  ? 'arrow-expand-down'
                  : 'timer-sand'
              }
              size={14}
              color={
                phase === 'CONTRACT'
                  ? '#FDA4AF'
                  : phase === 'RELAX'
                  ? '#93C5FD'
                  : '#CBD5E1'
              }
            />
            <Text
              style={[
                styles.phaseBadgeText,
                phase === 'CONTRACT' && { color: '#FDA4AF' },
                phase === 'RELAX' && { color: '#93C5FD' },
              ]}
            >
              {phase === 'CONTRACT'
                ? '提肛收緊 (HOLD)'
                : phase === 'RELAX'
                ? '深層放鬆 (BREATHE)'
                : isFinished
                ? '訓練完成！'
                : '準備就緒'}
            </Text>
          </View>

          {/* Reps Counter */}
          <Text style={styles.repText}>
            組數：
            <Text style={{ color: modeConfig.accentColor, fontWeight: '800' }}>
              {currentRep}
            </Text>{' '}
            / {modeConfig.targetReps}
          </Text>
        </View>
      </View>

      {/* Main Countdown & Instruction Section */}
      <View style={styles.instructionCard}>
        <View style={styles.countdownRow}>
          <View style={styles.countdownCircle}>
            <Text style={[styles.countdownNumber, { color: modeConfig.accentColor }]}>
              {phaseCountdown > 0 ? phaseCountdown : '—'}
            </Text>
            <Text style={styles.countdownSecLabel}>秒</Text>
          </View>
          <View style={styles.instructionContent}>
            <Text style={styles.instructionMain}>
              {phase === 'CONTRACT'
                ? mode === 'SPEED_FLICKS'
                  ? '極速收緊！感受閥門瞬間閉合'
                  : '深層提肛緊握！持續鎖定海綿體靜脈'
                : phase === 'RELAX'
                ? '腹式吸氣放鬆，完全鬆開骨盆底'
                : isFinished
                ? '太棒了！骨盆底神經控制力顯著提升'
                : '點擊開始，跟隨震動節奏訓練'}
            </Text>
            <Text style={styles.instructionSub}>
              {phase === 'CONTRACT'
                ? '💡 重點：如同急停小便時的向上抽拉感，腹部勿過度用力'
                : phase === 'RELAX'
                ? '💡 重點：完全放鬆肛門與尿道括約肌，深長呼吸注入氧氣'
                : '閉上雙眼盲練：長震收縮、雙短震放鬆，純靠觸覺指引'}
            </Text>
          </View>
        </View>

        {/* Contextual Doctor Tip */}
        <ContextualDoctorTip context="kegel" />

        {/* Action Button Row */}
        <View style={styles.actionRow}>
          {!isRunning ? (
            <TouchableOpacity
              style={[styles.mainBtn, { backgroundColor: modeConfig.accentColor }]}
              onPress={handleStartWorkout}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={18} color="#0F172A" />
              <Text style={styles.mainBtnText}>
                {isFinished ? '再次挑戰' : '開始阻抗訓練'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.mainBtn, styles.pauseBtn]}
              onPress={handlePauseWorkout}
              activeOpacity={0.8}
            >
              <Ionicons name="pause" size={18} color="#FFFFFF" />
              <Text style={[styles.mainBtnText, { color: '#FFFFFF' }]}>暫停休整</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleResetWorkout}
            activeOpacity={0.7}
          >
            <Ionicons name="reload" size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleCol: {
    flex: 1,
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 2,
  },
  modeTab: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: '#334155',
  },
  modeTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#38BDF8',
  },
  viewportCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 6,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  phaseBadgeContract: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  phaseBadgeRelax: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  phaseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  repText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  instructionCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 10,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  countdownCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#374151',
  },
  countdownNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  countdownSecLabel: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: -2,
  },
  instructionContent: {
    flex: 1,
  },
  instructionMain: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  instructionSub: {
    fontSize: 10,
    color: '#9CA3AF',
    lineHeight: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  pauseBtn: {
    backgroundColor: '#475569',
  },
  mainBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  resetBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
