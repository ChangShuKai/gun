<<<<<<< Updated upstream
import React from 'react';
=======
import React, { useState, useEffect } from 'react';
>>>>>>> Stashed changes
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { WidgetType, SnapshotMetadata } from '../types';
import { SplitViewContainer } from './SplitViewContainer';
import { TimerWidget } from './TimerWidget';
import { PhotoWidget } from './PhotoWidget';
import { CameraWidget } from './CameraWidget';
import { SelfCarouselWidget } from './widgets/SelfCarouselWidget';
import { AnatomyMassageWidget } from './widgets/AnatomyMassageWidget';
import { SensoryTickleWidget } from './widgets/SensoryTickleWidget';
import { StretchingRoutineWidget } from './widgets/StretchingRoutineWidget';
import { KegelTrainerWidget } from './3d/KegelTrainerWidget';

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
  elapsedSeconds?: number;
  currentBPM?: number;
  stage?: string;
  arousalLevel?: number;
  onSnapshotCaptured?: (snapshot: SnapshotMetadata) => void;
  recentSnapshots?: SnapshotMetadata[];
  onOpenCheckIn?: () => void;
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
  elapsedSeconds,
  currentBPM,
  stage,
  arousalLevel,
  onSnapshotCaptured,
  recentSnapshots,
  onOpenCheckIn,
}) => {
<<<<<<< Updated upstream
=======
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

  useEffect(() => {
    if (initialTopRatio !== undefined) {
      ratio.value = initialTopRatio;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTopRatio]);

  const topAnimatedStyle = useAnimatedStyle(() => ({
    flex: ratio.value,
  }));

  const bottomAnimatedStyle = useAnimatedStyle(() => ({
    flex: 1 - ratio.value,
  }));

>>>>>>> Stashed changes
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
      return (
        <CameraWidget
          elapsedSeconds={elapsedSeconds}
          currentBPM={currentBPM}
          stage={stage}
          arousalLevel={arousalLevel}
          onSnapshotCaptured={onSnapshotCaptured}
          recentSnapshots={recentSnapshots}
        />
      );
    }
    if (widget === 'self_carousel') {
      return <SelfCarouselWidget onOpenCheckIn={onOpenCheckIn} />;
    }
    if (widget === 'massage') {
      return <AnatomyMassageWidget />;
    }
    if (widget === 'tickle') {
      return <SensoryTickleWidget />;
    }
    if (widget === 'stretch') {
      return <StretchingRoutineWidget />;
    }
    if (widget === 'kegel') {
      return <KegelTrainerWidget />;
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
        <Text style={styles.emptySubtitle}>計時器・本地相片・即時鏡頭・看看自己</Text>
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
      case 'self_carousel':
        return '看看自己 (輪播)';
      case 'massage':
        return '周邊深層按摩';
      case 'tickle':
        return '微神經搔癢指引';
      case 'stretch':
        return '3D 延展牽引課表';
      case 'kegel':
        return 'PC 肌 3D 阻抗訓練';
      case 'text':
        return '讀稿機文本';
      case 'pacing':
        return '節奏控射動畫';
      default:
        return '未設定';
    }
  };

  return (
    <SplitViewContainer
      initialRatio={initialTopRatio || 0.5}
      onRatioChange={onRatioChange}
      style={styles.container}
      topChild={
        <View style={styles.pane}>
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
        </View>
      }
      bottomChild={
        <View style={styles.pane}>
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
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  pane: {
    flex: 1,
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
  emptyCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  plusCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
});
