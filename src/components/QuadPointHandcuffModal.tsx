import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HandcuffActivePoints } from '../types';
import { handcuffService } from '../services/handcuffService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QuadPointHandcuffModalProps {
  visible: boolean;
  targetSeconds?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuadPointHandcuffModal: React.FC<QuadPointHandcuffModalProps> = ({
  visible,
  targetSeconds = 30,
  onClose,
  onSuccess,
}) => {
  const [remainingSec, setRemainingSec] = useState<number>(targetSeconds);
  const [activePoints, setActivePoints] = useState<HandcuffActivePoints>({
    topLeft: false,
    bottomLeft: false,
    topRight: false,
    bottomRight: false,
  });
  const [isFullyLocked, setIsFullyLocked] = useState<boolean>(false);
  const [isViolated, setIsViolated] = useState<boolean>(false);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Animations
  const [freezePulseAnim] = useState(() => new Animated.Value(1));
  const [warningFlashAnim] = useState(() => new Animated.Value(0));

  const stateRef = useRef({
    isFullyLocked,
    remainingSec,
    isCompleted,
    violationCount,
  });

  useEffect(() => {
    stateRef.current = {
      isFullyLocked,
      remainingSec,
      isCompleted,
      violationCount,
    };
  }, [isFullyLocked, remainingSec, isCompleted, violationCount]);

  // Handle touches from responder
  const handleTouchUpdate = useCallback((event: GestureResponderEvent) => {
    if (stateRef.current.isCompleted) return;

    const rawTouches = event.nativeEvent.touches || [];
    const touchPoints = rawTouches.map((t) => ({ x: t.pageX, y: t.pageY }));

    const evalResult = handcuffService.evaluateTouchDistribution(
      touchPoints,
      SCREEN_WIDTH,
      SCREEN_HEIGHT
    );

    setActivePoints(evalResult.activePoints);

    const prevLocked = stateRef.current.isFullyLocked;
    const nowLocked = evalResult.isFullyLocked;

    if (nowLocked && !prevLocked) {
      // Just locked all 4 points!
      setIsFullyLocked(true);
      setIsViolated(false);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    } else if (!nowLocked && prevLocked && !stateRef.current.isCompleted) {
      // Premature release! Violation penalty!
      setIsFullyLocked(false);
      setIsViolated(true);
      setViolationCount((prev) => prev + 1);
      // Penalize +5 seconds
      setRemainingSec((prev) => Math.min(targetSeconds + 15, prev + 5));

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}

      // Flash red alert
      Animated.sequence([
        Animated.timing(warningFlashAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(warningFlashAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [targetSeconds, warningFlashAnim]);

  // Master Countdown Timer
  useEffect(() => {
    if (!visible || isCompleted) return;

    const interval = setInterval(() => {
      const cur = stateRef.current;
      if (cur.isFullyLocked && cur.remainingSec > 0) {
        setRemainingSec((prev) => {
          if (prev <= 1) {
            // Completed!
            setIsCompleted(true);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}

            void handcuffService.recordCompletion(targetSeconds, cur.violationCount);
            if (onSuccess) onSuccess();
            return 0;
          }

          // Gentle cooling pulse each second
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}

          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, isCompleted, targetSeconds, onSuccess]);

  // Core pulsing ice crystal animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(freezePulseAnim, {
          toValue: 1.06,
          duration: 1600,
          useNativeDriver: false,
        }),
        Animated.timing(freezePulseAnim, {
          toValue: 1.0,
          duration: 1600,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [freezePulseAnim]);

  if (!visible) return null;

  const warningBgColor = warningFlashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', 'rgba(239, 68, 68, 0.45)'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={styles.fullscreenContainer}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouchUpdate}
        onResponderMove={handleTouchUpdate}
        onResponderRelease={handleTouchUpdate}
      >
        {/* Warning Flash Overlay */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: warningBgColor }]}
          pointerEvents="none"
        />

        {/* Ambient Ice Glow Grid Background */}
        <View style={styles.ambientGrid} pointerEvents="none" />

        {/* TOP-LEFT TOUCH PAD */}
        <View
          style={[
            styles.touchPad,
            styles.padTopLeft,
            activePoints.topLeft && styles.padActive,
          ]}
          pointerEvents="none"
        >
          <MaterialCommunityIcons
            name={activePoints.topLeft ? 'fingerprint' : 'hand-front-left-outline'}
            size={36}
            color={activePoints.topLeft ? '#38BDF8' : '#64748B'}
          />
          <Text
            style={[
              styles.padLabel,
              activePoints.topLeft && styles.padLabelActive,
            ]}
          >
            左手小指 / 拇指
          </Text>
          <Text style={styles.padStateText}>
            {activePoints.topLeft ? '✓ 鎖定中' : '按住左上'}
          </Text>
        </View>

        {/* TOP-RIGHT TOUCH PAD */}
        <View
          style={[
            styles.touchPad,
            styles.padTopRight,
            activePoints.topRight && styles.padActive,
          ]}
          pointerEvents="none"
        >
          <MaterialCommunityIcons
            name={activePoints.topRight ? 'fingerprint' : 'hand-front-right-outline'}
            size={36}
            color={activePoints.topRight ? '#38BDF8' : '#64748B'}
          />
          <Text
            style={[
              styles.padLabel,
              activePoints.topRight && styles.padLabelActive,
            ]}
          >
            右手拇指 / 小指
          </Text>
          <Text style={styles.padStateText}>
            {activePoints.topRight ? '✓ 鎖定中' : '按住右上'}
          </Text>
        </View>

        {/* CENTER CRYOGENIC CORE */}
        <View style={styles.centerCoreWrapper} pointerEvents="none">
          <Animated.View
            style={[
              styles.frostCircle,
              isFullyLocked && styles.frostCircleActive,
              isViolated && styles.frostCircleViolated,
              { transform: [{ scale: freezePulseAnim }] },
            ]}
          >
            <MaterialCommunityIcons
              name={
                isCompleted
                  ? 'shield-check'
                  : isViolated
                  ? 'alert-octagon'
                  : isFullyLocked
                  ? 'snowflake-alert'
                  : 'hand-back-left-off'
              }
              size={36}
              color={
                isCompleted
                  ? '#10B981'
                  : isViolated
                  ? '#EF4444'
                  : isFullyLocked
                  ? '#38BDF8'
                  : '#64748B'
              }
            />

            <Text
              style={[
                styles.countdownNumber,
                isCompleted && { color: '#10B981' },
                isViolated && { color: '#EF4444' },
                isFullyLocked && { color: '#38BDF8' },
              ]}
            >
              {remainingSec}
            </Text>
            <Text style={styles.countdownUnit}>秒 物理拘束</Text>
          </Animated.View>

          {/* Status Instructions */}
          <View style={styles.statusBox}>
            <Text style={styles.statusTitle}>
              {isCompleted
                ? '🎉 冰凍拘束解除！急停成功'
                : isViolated
                ? '⚠️ 違規放手！倒數凍結 懲罰 +5 秒'
                : isFullyLocked
                ? '🧊 雙手拘束鎖定中・閉眼降溫'
                : '強制雙手就位 · 四角長按'}
            </Text>
            <Text style={styles.statusSub}>
              {isCompleted
                ? '神經興奮閥門已平穩冷卻，獲得 +10 自律代幣'
                : isFullyLocked
                ? '雙手拇指與小指持續按住四角，嚴禁偷放手'
                : 'iPhone 多點觸控校驗：雙手完全佔滿螢幕，杜絕任何偷碰'}
            </Text>

            {violationCount > 0 && !isCompleted && (
              <View style={styles.violationTag}>
                <Text style={styles.violationTagText}>
                  累計違規偷放：{violationCount} 次
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* BOTTOM-LEFT TOUCH PAD */}
        <View
          style={[
            styles.touchPad,
            styles.padBottomLeft,
            activePoints.bottomLeft && styles.padActive,
          ]}
          pointerEvents="none"
        >
          <MaterialCommunityIcons
            name={activePoints.bottomLeft ? 'fingerprint' : 'hand-back-left-outline'}
            size={36}
            color={activePoints.bottomLeft ? '#38BDF8' : '#64748B'}
          />
          <Text
            style={[
              styles.padLabel,
              activePoints.bottomLeft && styles.padLabelActive,
            ]}
          >
            左手拇指 / 掌緣
          </Text>
          <Text style={styles.padStateText}>
            {activePoints.bottomLeft ? '✓ 鎖定中' : '按住左下'}
          </Text>
        </View>

        {/* BOTTOM-RIGHT TOUCH PAD */}
        <View
          style={[
            styles.touchPad,
            styles.padBottomRight,
            activePoints.bottomRight && styles.padActive,
          ]}
          pointerEvents="none"
        >
          <MaterialCommunityIcons
            name={activePoints.bottomRight ? 'fingerprint' : 'hand-back-right-outline'}
            size={36}
            color={activePoints.bottomRight ? '#38BDF8' : '#64748B'}
          />
          <Text
            style={[
              styles.padLabel,
              activePoints.bottomRight && styles.padLabelActive,
            ]}
          >
            右手小指 / 掌緣
          </Text>
          <Text style={styles.padStateText}>
            {activePoints.bottomRight ? '✓ 鎖定中' : '按住右下'}
          </Text>
        </View>

        {/* Exit / Dismiss Button when Completed or Emergency Quit */}
        <View style={styles.bottomBar}>
          {isCompleted ? (
            <TouchableOpacity
              style={styles.finishBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.finishBtnText}>完成並安全退回</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.cancelLink}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelLinkText}>放棄急停 (退出拘束)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#030712',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.15)',
  },
  touchPad: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 10,
  },
  padActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderColor: '#38BDF8',
    borderStyle: 'solid',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  padTopLeft: {
    top: 50,
    left: 20,
  },
  padTopRight: {
    top: 50,
    right: 20,
  },
  padBottomLeft: {
    bottom: 90,
    left: 20,
  },
  padBottomRight: {
    bottom: 90,
    right: 20,
  },
  padLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  padLabelActive: {
    color: '#38BDF8',
  },
  padStateText: {
    fontSize: 9,
    color: '#64748B',
  },
  centerCoreWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  frostCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#0F172A',
    borderWidth: 3,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  frostCircleActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  frostCircleViolated: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    shadowColor: '#EF4444',
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#CBD5E1',
    lineHeight: 52,
  },
  countdownUnit: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBox: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 6,
  },
  statusSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  violationTag: {
    marginTop: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  violationTagText: {
    fontSize: 11,
    color: '#FCA5A5',
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  finishBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelLinkText: {
    fontSize: 12,
    color: '#64748B',
    textDecorationLine: 'underline',
  },
});
