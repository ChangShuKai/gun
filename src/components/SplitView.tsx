import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { WidgetType } from '../types';
import { TimerWidget } from './TimerWidget';
import { PhotoWidget } from './PhotoWidget';
import { CameraWidget } from './CameraWidget';

interface SplitViewProps {
  topWidget: WidgetType;
  bottomWidget: WidgetType;
  topRatio: number;
  onRatioChange?: (ratio: number) => void;
  onSelectWidgetPress: (pane: 'top' | 'bottom') => void;
  topPhotoUri?: string | null;
  bottomPhotoUri?: string | null;
  onTopPhotoSelected: (uri: string) => void;
  onBottomPhotoSelected: (uri: string) => void;
  onTimerTick?: (seconds: number) => void;
}

export const SplitView: React.FC<SplitViewProps> = ({
  topWidget,
  bottomWidget,
  topRatio: initialTopRatio,
  onRatioChange,
  onSelectWidgetPress,
  topPhotoUri,
  bottomPhotoUri,
  onTopPhotoSelected,
  onBottomPhotoSelected,
  onTimerTick,
}) => {
  const [containerHeight, setContainerHeight] = useState<number>(500);
  const ratio = useSharedValue(initialTopRatio || 0.5);
  const startRatio = useSharedValue(initialTopRatio || 0.5);

  const onLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) {
      setContainerHeight(height);
    }
  };

  const notifyRatioChange = (val: number) => {
    if (onRatioChange) onRatioChange(val);
  };

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startRatio.value = ratio.value;
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      if (containerHeight > 0) {
        const delta = event.translationY / containerHeight;
        let newRatio = startRatio.value + delta;
        // Clamp between 20% and 80%
        if (newRatio < 0.2) newRatio = 0.2;
        if (newRatio > 0.8) newRatio = 0.8;
        ratio.value = newRatio;
      }
    })
    .onEnd(() => {
      runOnJS(notifyRatioChange)(ratio.value);
      runOnJS(triggerHaptic)();
    });

  const topAnimatedStyle = useAnimatedStyle(() => ({
    flex: ratio.value,
  }));

  const bottomAnimatedStyle = useAnimatedStyle(() => ({
    flex: 1 - ratio.value,
  }));

  const renderWidgetContent = (
    widget: WidgetType,
    pane: 'top' | 'bottom',
    photoUri?: string | null,
    onPhotoSelected?: (uri: string) => void
  ) => {
    if (widget === 'timer') {
      return <TimerWidget onTimerTick={onTimerTick} />;
    }
    if (widget === 'photo') {
      return (
        <PhotoWidget
          photoUri={photoUri}
          onPhotoSelected={onPhotoSelected || (() => {})}
        />
      );
    }
    if (widget === 'camera') {
      return <CameraWidget />;
    }

    // Default: Empty state with large +
    return (
      <TouchableOpacity
        style={styles.emptyCard}
        activeOpacity={0.7}
        onPress={() => onSelectWidgetPress(pane)}
      >
        <View style={styles.plusCircle}>
          <Ionicons name="add" size={36} color={THEME.colors.primaryLight} />
        </View>
        <Text style={styles.emptyTitle}>點擊加入小部件</Text>
        <Text style={styles.emptySubtitle}>計時器・本地相片・即時鏡頭</Text>
      </TouchableOpacity>
    );
  };

  const getWidgetLabel = (widget: WidgetType) => {
    switch (widget) {
      case 'timer':
        return '計時器';
      case 'photo':
        return '本地相片';
      case 'camera':
        return '即時相機';
      default:
        return '未設定';
    }
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* Top Pane */}
      <Animated.View style={[styles.pane, topAnimatedStyle]}>
        <View style={styles.paneHeader}>
          <View style={styles.paneBadge}>
            <Text style={styles.paneBadgeText}>上視窗：{getWidgetLabel(topWidget)}</Text>
          </View>
          <TouchableOpacity
            style={styles.changeWidgetBtn}
            onPress={() => onSelectWidgetPress('top')}
            activeOpacity={0.7}
          >
            <Feather name="layers" size={14} color={THEME.colors.textSecondary} />
            <Text style={styles.changeWidgetText}>更換</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.paneBody}>
          {renderWidgetContent(topWidget, 'top', topPhotoUri, onTopPhotoSelected)}
        </View>
      </Animated.View>

      {/* Draggable Divider Line */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.dividerArea}>
          <View style={styles.dividerLine}>
            <View style={styles.grabberPill}>
              <View style={styles.grabberDot} />
              <View style={styles.grabberDot} />
              <View style={styles.grabberDot} />
            </View>
          </View>
        </View>
      </GestureDetector>

      {/* Bottom Pane */}
      <Animated.View style={[styles.pane, bottomAnimatedStyle]}>
        <View style={styles.paneHeader}>
          <View style={styles.paneBadge}>
            <Text style={styles.paneBadgeText}>下視窗：{getWidgetLabel(bottomWidget)}</Text>
          </View>
          <TouchableOpacity
            style={styles.changeWidgetBtn}
            onPress={() => onSelectWidgetPress('bottom')}
            activeOpacity={0.7}
          >
            <Feather name="layers" size={14} color={THEME.colors.textSecondary} />
            <Text style={styles.changeWidgetText}>更換</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.paneBody}>
          {renderWidgetContent(bottomWidget, 'bottom', bottomPhotoUri, onBottomPhotoSelected)}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  pane: {
    overflow: 'hidden',
    backgroundColor: THEME.colors.surface,
    position: 'relative',
  },
  paneHeader: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  paneBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  paneBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  changeWidgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  changeWidgetText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  paneBody: {
    flex: 1,
  },
  dividerArea: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    zIndex: 20,
  },
  dividerLine: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  grabberPill: {
    width: 60,
    height: 18,
    borderRadius: 9,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.borderActive,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  grabberDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.primaryLight,
  },
  emptyCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    margin: 12,
    borderRadius: THEME.radius.lg,
  },
  plusCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
});
