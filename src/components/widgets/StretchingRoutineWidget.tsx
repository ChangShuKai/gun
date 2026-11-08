import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StretchStepConfig } from '../../types';
import { ContextualDoctorTip } from '../ContextualDoctorTip';

const MAX_SAFE_TOTAL_SECONDS = 300; // 5 minutes hard safety cutoff

const STRETCH_STEPS: StretchStepConfig[] = [
  {
    phase: 'FORWARD',
    name: '前向水平微拉伸',
    englishName: 'Forward Gentle Stretch',
    durationSec: 15,
    description: '食指與拇指在冠狀溝後方形成 O 型環，輕柔向前直線牽拉',
    instruction: '保持均勻呼吸，切勿過度用力，舒緩海綿體平滑肌白膜',
    targetAnatomy: '海綿體深層平滑肌 / 白膜中段',
    modelPitch: 0.1,
    modelYaw: 0.0,
    lengthBonus: 0.18,
  },
  {
    phase: 'LEFT',
    name: '左側懸韌帶延展',
    englishName: 'Left Lateral Release',
    durationSec: 15,
    description: '緩慢以 45 度角向左下引導，舒展左側懸韌帶外緣',
    instruction: '感覺恥骨左側微張力即可，避免劇烈扭轉',
    targetAnatomy: '左側陰莖懸韌帶 / 淺筋膜',
    modelPitch: 0.05,
    modelYaw: -0.55,
    lengthBonus: 0.12,
  },
  {
    phase: 'RIGHT',
    name: '右側懸韌帶延展',
    englishName: 'Right Lateral Release',
    durationSec: 15,
    description: '緩慢以 45 度角向右下引導，舒展右側懸韌帶外緣',
    instruction: '對稱平衡舒緩，感受兩側韌帶放鬆彈性',
    targetAnatomy: '右側陰莖懸韌帶 / 淺筋膜',
    modelPitch: 0.05,
    modelYaw: 0.55,
    lengthBonus: 0.12,
  },
  {
    phase: 'UPWARD',
    name: '基底向上提拉',
    englishName: 'Upward Base Stretch',
    durationSec: 10,
    description: '朝下腹部方向輕微上提，維持均勻張力',
    instruction: '舒張深層陰莖懸韌帶與恥骨聯合固定處',
    targetAnatomy: '深層陰莖懸韌帶 / 恥骨聯合纖維束',
    modelPitch: 0.45,
    modelYaw: 0.0,
    lengthBonus: 0.08,
  },
];

export const StretchingRoutineWidget: React.FC = () => {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isResting, setIsResting] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [stepSecondsLeft, setStepSecondsLeft] = useState<number>(15);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [isSafetyCutoff, setIsSafetyCutoff] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStep = STRETCH_STEPS[currentStepIdx] || STRETCH_STEPS[0];

  const triggerStretchHaptic = () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  const triggerRestHaptic = () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 150);
    } catch {}
  };

  const triggerCutoffHaptic = () => {
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
  };

  // Switch to rest phase
  const proceedToRest = useCallback(() => {
    setIsResting(true);
    setStepSecondsLeft(5); // 5 seconds buffer rest
    triggerRestHaptic();
  }, []);

  // Advance to next stretching movement
  const proceedToNextStep = useCallback(() => {
    setIsResting(false);
    setCurrentStepIdx((prev) => {
      const next = (prev + 1) % STRETCH_STEPS.length;
      setStepSecondsLeft(STRETCH_STEPS[next].durationSec);
      return next;
    });
    triggerStretchHaptic();
  }, []);

  // Timer Tick
  useEffect(() => {
    if (!isRunning || isSafetyCutoff) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      // 1. Check Hard 5-Minute Safety Cutoff
      setTotalSeconds((prevTotal) => {
        const nextTotal = prevTotal + 1;
        if (nextTotal >= MAX_SAFE_TOTAL_SECONDS) {
          setIsSafetyCutoff(true);
          setIsRunning(false);
          triggerCutoffHaptic();
          return MAX_SAFE_TOTAL_SECONDS;
        }
        return nextTotal;
      });

      // 2. Step / Rest countdown
      setStepSecondsLeft((prev) => {
        if (prev <= 1) {
          if (isResting) {
            proceedToNextStep();
          } else {
            proceedToRest();
          }
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isSafetyCutoff, isResting, proceedToNextStep, proceedToRest]);

  const handleTogglePlay = () => {
    if (isSafetyCutoff) return;

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsRunning(false);
    setIsSafetyCutoff(false);
    setTotalSeconds(0);
    setCurrentStepIdx(0);
    setIsResting(false);
    setStepSecondsLeft(STRETCH_STEPS[0].durationSec);
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Render 3D Directional Vector Diagram
  const renderVectorDiagram = () => {
    const cx = 80;
    const cy = 80;
    let targetX = cx;
    let targetY = cy - 40;

    if (currentStep.phase === 'LEFT') {
      targetX = cx - 35;
      targetY = cy - 25;
    } else if (currentStep.phase === 'RIGHT') {
      targetX = cx + 35;
      targetY = cy - 25;
    } else if (currentStep.phase === 'UPWARD') {
      targetX = cx;
      targetY = cy - 50;
    }

    const strokeColor = isResting ? '#10B981' : '#3B82F6';

    return (
      <Svg width={160} height={130} style={styles.svgDiagram}>
        {/* Base Anatomical Anchor */}
        <Circle cx={cx} cy={cy + 15} r={18} fill="#1E293B" stroke="#475569" strokeWidth={1.5} />
        <Circle cx={cx} cy={cy + 15} r={5} fill="#64748B" />

        {/* Dynamic Trajectory Vector */}
        <Line
          x1={cx}
          y1={cy + 15}
          x2={targetX}
          y2={targetY}
          stroke={strokeColor}
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* O-Ring Gripping Indicator Ring */}
        <Circle
          cx={targetX}
          cy={targetY}
          r={12}
          fill="none"
          stroke={isResting ? '#34D399' : '#60A5FA'}
          strokeWidth={2.5}
          strokeDasharray="4,2"
        />

        {/* Direction Arrow Head */}
        <Path
          d={`M ${targetX - 5} ${targetY + 8} L ${targetX} ${targetY - 2} L ${targetX + 5} ${targetY + 8}`}
          stroke={strokeColor}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    );
  };

  return (
    <View style={styles.container}>
      {/* Safety Cutoff Alert Banner */}
      {isSafetyCutoff && (
        <View style={styles.safetyCutoffBanner}>
          <MaterialCommunityIcons name="shield-alert" size={24} color="#EF4444" />
          <View style={styles.safetyCutoffContent}>
            <Text style={styles.safetyCutoffTitle}>5 分鐘組織保護防線已啟動</Text>
            <Text style={styles.safetyCutoffDesc}>
              白膜與微血管已達放鬆上限，過度牽引無益組織健康。請休止並進行舒緩放鬆。
            </Text>
          </View>
          <TouchableOpacity style={styles.cutoffResetBtn} onPress={handleReset}>
            <Text style={styles.cutoffResetText}>重置課表</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.phaseIcon, isResting ? styles.phaseIconRest : styles.phaseIconStretch]}>
            <MaterialCommunityIcons
              name={isResting ? 'leaf' : 'arrow-expand-all'}
              size={18}
              color={isResting ? '#10B981' : '#3B82F6'}
            />
          </View>
          <View>
            <Text style={styles.stepTitle}>
              {isResting ? '緩解放鬆階段' : currentStep.name}
            </Text>
            <Text style={styles.stepSubtitle}>
              {isResting ? '放鬆微血管・均勻深呼吸' : currentStep.englishName}
            </Text>
          </View>
        </View>

        {/* Total Session Safe Timer */}
        <View style={styles.totalTimerBadge}>
          <Ionicons name="timer-outline" size={14} color="#94A3B8" />
          <Text style={styles.totalTimerText}>
            課表進度 {formatTime(totalSeconds)} / 05:00
          </Text>
        </View>
      </View>

      {/* Main Routine Stage */}
      <View style={styles.stageBody}>
        {/* Left: Vector Diagram */}
        <View style={styles.diagramWrapper}>{renderVectorDiagram()}</View>

        {/* Right: Real-time Step Timer & Rhythm */}
        <View style={styles.timerWrapper}>
          <View
            style={[
              styles.countdownCircle,
              isResting ? styles.countdownCircleRest : styles.countdownCircleStretch,
            ]}
          >
            <Text
              style={[
                styles.countdownNumber,
                isResting ? styles.countdownNumberRest : styles.countdownNumberStretch,
              ]}
            >
              {stepSecondsLeft}
            </Text>
            <Text style={styles.countdownUnit}>秒</Text>
          </View>
          <Text style={[styles.rhythmStatus, isResting && { color: '#10B981' }]}>
            {isResting ? '🌿 舒展緩解 5 秒' : '⚡ 輕柔微拉 15 秒'}
          </Text>
        </View>
      </View>

      {/* Target Anatomy & Instructions */}
      <View style={styles.instructionCard}>
        <View style={styles.instructionRow}>
          <Text style={styles.instructionLabel}>針對組織：</Text>
          <Text style={styles.instructionValue}>{currentStep.targetAnatomy}</Text>
        </View>
        <Text style={styles.instructionText}>{currentStep.description}</Text>
        <Text style={styles.instructionTip}>💡 {currentStep.instruction}</Text>
      </View>

      {/* Contextual Doctor Tip */}
      <ContextualDoctorTip context="stretching" />

      {/* Controls Bar */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[
            styles.playBtn,
            isRunning ? styles.playBtnActive : styles.playBtnInactive,
            isSafetyCutoff && styles.btnDisabled,
          ]}
          activeOpacity={0.8}
          onPress={handleTogglePlay}
          disabled={isSafetyCutoff}
        >
          <Ionicons
            name={isRunning ? 'pause' : 'play'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.playBtnText}>{isRunning ? '暫停課表' : '啟動安全牽引'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBtn} activeOpacity={0.7} onPress={handleReset}>
          <Ionicons name="refresh" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 14,
    justifyContent: 'space-between',
  },
  safetyCutoffBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  safetyCutoffContent: {
    flex: 1,
  },
  safetyCutoffTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F87171',
    marginBottom: 2,
  },
  safetyCutoffDesc: {
    fontSize: 11,
    color: '#FECACA',
    lineHeight: 15,
  },
  cutoffResetBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cutoffResetText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  phaseIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseIconStretch: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  phaseIconRest: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  totalTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  totalTimerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  stageBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  diagramWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgDiagram: {
    marginVertical: -6,
  },
  timerWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  countdownCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  countdownCircleStretch: {
    borderColor: '#3B82F6',
  },
  countdownCircleRest: {
    borderColor: '#10B981',
  },
  countdownNumber: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  countdownNumberStretch: {
    color: '#60A5FA',
  },
  countdownNumberRest: {
    color: '#34D399',
  },
  countdownUnit: {
    fontSize: 10,
    color: '#64748B',
  },
  rhythmStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
  },
  instructionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  instructionLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  instructionValue: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '700',
  },
  instructionText: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 16,
  },
  instructionTip: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  playBtnActive: {
    backgroundColor: '#EF4444',
  },
  playBtnInactive: {
    backgroundColor: '#3B82F6',
  },
  playBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resetBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
