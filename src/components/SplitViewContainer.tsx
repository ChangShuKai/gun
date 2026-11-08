import React from 'react';
import {
  StyleSheet,
  View,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export interface SplitViewContainerProps {
  topChild: React.ReactNode;
  bottomChild: React.ReactNode;
  initialRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  onRatioChange?: (ratio: number) => void;
  style?: StyleProp<ViewStyle>;
}

export const SplitViewContainer: React.FC<SplitViewContainerProps> = ({
  topChild,
  bottomChild,
  initialRatio = 0.5,
  minRatio = 0.20,
  maxRatio = 0.80,
  onRatioChange,
  style,
}) => {
  const containerHeight = useSharedValue<number>(600);
  const ratio = useSharedValue<number>(initialRatio);
  const startRatio = useSharedValue<number>(initialRatio);

  const onLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) {
      containerHeight.value = height;
    }
  };

  const triggerLightHaptic = () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const triggerMediumHaptic = () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  const handleRatioEnd = (finalRatio: number) => {
    if (onRatioChange) {
      onRatioChange(finalRatio);
    }
  };

  // 1. Double Tap: Reset to standard 50% : 50%
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd(() => {
      runOnJS(triggerMediumHaptic)();
      ratio.value = withSpring(0.5, { damping: 15, stiffness: 150 });
      runOnJS(handleRatioEnd)(0.5);
    });

  // 2. Pan Drag: Smooth vertical sliding with edge snap (<25% or >75%)
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startRatio.value = ratio.value;
      runOnJS(triggerLightHaptic)();
    })
    .onUpdate((event) => {
      if (containerHeight.value > 0) {
        const delta = event.translationY / containerHeight.value;
        let newRatio = startRatio.value + delta;
        // Allow slight elastic overdrag before snap boundary
        newRatio = Math.max(0.10, Math.min(0.90, newRatio));
        ratio.value = newRatio;
      }
    })
    .onEnd(() => {
      const current = ratio.value;

      if (current < 0.25) {
        // Snap to Bottom Pane Maximized (Top Pane Mini 12%)
        const snapVal = 0.12;
        runOnJS(triggerMediumHaptic)();
        ratio.value = withSpring(snapVal, { damping: 16, stiffness: 140 });
        runOnJS(handleRatioEnd)(snapVal);
      } else if (current > 0.75) {
        // Snap to Top Pane Maximized (Bottom Pane Mini 12%)
        const snapVal = 0.88;
        runOnJS(triggerMediumHaptic)();
        ratio.value = withSpring(snapVal, { damping: 16, stiffness: 140 });
        runOnJS(handleRatioEnd)(snapVal);
      } else {
        // Clamp smoothly within normal [minRatio, maxRatio]
        const clamped = Math.max(minRatio, Math.min(maxRatio, current));
        ratio.value = withSpring(clamped, { damping: 18, stiffness: 160 });
        runOnJS(handleRatioEnd)(clamped);
      }
    });

  // Composed Gesture: Double tap takes precedence, otherwise pan
  const composedGesture = Gesture.Exclusive(doubleTapGesture, panGesture);

  const topAnimatedStyle = useAnimatedStyle(() => ({
    flex: ratio.value,
  }));

  const bottomAnimatedStyle = useAnimatedStyle(() => ({
    flex: 1 - ratio.value,
  }));

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      {/* Top Pane */}
      <Animated.View style={[styles.pane, topAnimatedStyle]}>
        {topChild}
      </Animated.View>

      {/* 12px Translucent Glassmorphic Divider Handle */}
      <GestureDetector gesture={composedGesture}>
        <View style={styles.handleHitSlop}>
          <View style={styles.glassHandle}>
            <View style={styles.grabberPill} />
          </View>
        </View>
      </GestureDetector>

      {/* Bottom Pane */}
      <Animated.View style={[styles.pane, bottomAnimatedStyle]}>
        {bottomChild}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  pane: {
    overflow: 'hidden',
    width: '100%',
  },
  handleHitSlop: {
    height: 24, // Expanded touchable area for thumb ergonomics
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  glassHandle: {
    width: '100%',
    height: 12, // Exactly 12px translucent glass handle
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.14)',
    borderBottomColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  grabberPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
});
