import React, { useState } from 'react';
import { StyleSheet, View, Text, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface ArousalSliderProps {
  level: number; // 1.0 to 10.0
  onLevelChange: (level: number) => void;
  isIntercepted?: boolean;
  side?: 'left' | 'right';
}

export const ArousalSlider: React.FC<ArousalSliderProps> = ({
  level,
  onLevelChange,
  isIntercepted = false,
  side = 'right',
}) => {
  const [sliderHeight, setSliderHeight] = useState<number>(300);

  const touchY = useSharedValue<number>(0);
  const isDragging = useSharedValue<boolean>(false);
  const lastIntShared = useSharedValue<number>(Math.floor(level));

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      setSliderHeight(h);
    }
  };

  const triggerHaptic = () => {
    Haptics.selectionAsync().catch(() => {});
  };

  const handleUpdate = (rawY: number) => {
    if (sliderHeight <= 0) return;
    const clampedY = Math.max(0, Math.min(sliderHeight, rawY));
    const ratio = 1 - clampedY / sliderHeight;
    const newLevel = Math.round((1 + ratio * 9) * 10) / 10;
    const intVal = Math.floor(newLevel);

    if (intVal !== lastIntShared.value) {
      lastIntShared.value = intVal;
      triggerHaptic();
    }

    onLevelChange(newLevel);
  };

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      isDragging.value = true;
      touchY.value = e.y;
      runOnJS(handleUpdate)(e.y);
    })
    .onUpdate((e) => {
      touchY.value = e.y;
      runOnJS(handleUpdate)(e.y);
    })
    .onFinalize(() => {
      isDragging.value = false;
    });

  const getLevelColor = (val: number) => {
    if (val >= 8) return THEME.colors.danger;
    if (val >= 6) return THEME.colors.warning;
    if (val >= 4) return THEME.colors.accent;
    return THEME.colors.primary;
  };

  const fillPercentage = ((level - 1) / 9) * 100;
  const currentColor = getLevelColor(level);

  const thumbAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isDragging.value ? 1.2 : 1.0) }],
    };
  });

  return (
    <View
      style={[
        styles.container,
        side === 'left' ? styles.alignLeft : styles.alignRight,
      ]}
      pointerEvents="box-none"
    >
      <GestureDetector gesture={panGesture}>
        <View
          style={[
            styles.sliderTrack,
            isIntercepted && styles.trackIntercepted,
          ]}
          onLayout={onLayout}
        >
          {/* Fill Indicator (From bottom up) */}
          <View
            style={[
              styles.fillBar,
              {
                height: `${fillPercentage}%`,
                backgroundColor: currentColor,
              },
            ]}
          />

          {/* Danger zone threshold indicator (7.5 ~ 8.0) */}
          <View style={styles.dangerThresholdLine} />

          {/* Scale Notches 1-10 */}
          {Array.from({ length: 10 }).map((_, i) => {
            const stepNum = 10 - i;
            const isDanger = stepNum >= 8;
            return (
              <View key={stepNum} style={styles.notchRow}>
                <View
                  style={[
                    styles.notchDot,
                    isDanger && styles.notchDanger,
                    stepNum <= level && { backgroundColor: currentColor },
                  ]}
                />
              </View>
            );
          })}

          {/* Thumb Badge */}
          <Animated.View
            style={[
              styles.thumbBadge,
              {
                bottom: `${fillPercentage}%`,
                backgroundColor: currentColor,
              },
              thumbAnimStyle,
            ]}
          >
            {isIntercepted ? (
              <MaterialCommunityIcons name="alert-octagon" size={14} color="#FFF" />
            ) : (
              <Text style={styles.thumbText}>{level.toFixed(1)}</Text>
            )}
          </Animated.View>
        </View>
      </GestureDetector>

      {/* Floating Status Label */}
      <View style={styles.statusLabelContainer}>
        <Text style={[styles.statusLevelText, { color: currentColor }]}>
          Lv.{level.toFixed(1)}
        </Text>
        <Text style={styles.statusSubText}>
          {isIntercepted ? '急停煞車' : level >= 7.5 ? '高危警戒' : '盲操滑桿'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '25%',
    bottom: '25%',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alignRight: {
    right: 8,
  },
  alignLeft: {
    left: 8,
  },
  sliderTrack: {
    width: 32,
    height: '100%',
    minHeight: 240,
    maxHeight: 400,
    backgroundColor: 'rgba(19, 27, 46, 0.85)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'visible',
    justifyContent: 'space-between',
    paddingVertical: 12,
    alignItems: 'center',
  },
  trackIntercepted: {
    borderColor: THEME.colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  fillBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 16,
    opacity: 0.35,
  },
  dangerThresholdLine: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: THEME.colors.danger,
    opacity: 0.7,
  },
  notchRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: 14,
  },
  notchDot: {
    width: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  notchDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.5)',
  },
  thumbBadge: {
    position: 'absolute',
    left: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  thumbText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statusLabelContainer: {
    marginTop: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusLevelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusSubText: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
});
