import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { SnapshotMetadata } from '../types';
import { VirtualReviewPanelModal } from './VirtualReviewPanelModal';

interface TimelineComparatorProps {
  snapshots: SnapshotMetadata[];
  onClose: () => void;
  onUpdateEHS?: (snapshotId: string, score: number) => void;
}

const EHS_LEVELS = [
  { level: 1, label: 'EHS 1', desc: '微膨脹 (豆腐)', color: '#64748B' },
  { level: 2, label: 'EHS 2', desc: '中膨脹 (去皮香蕉)', color: '#F59E0B' },
  { level: 3, label: 'EHS 3', desc: '充血堅實 (帶皮香蕉)', color: '#3B82F6' },
  { level: 4, label: 'EHS 4', desc: '完全堅硬 (小黃瓜)', color: '#10B981' },
];

export const TimelineComparator: React.FC<TimelineComparatorProps> = ({
  snapshots,
  onClose,
  onUpdateEHS,
}) => {
  const [selectedAIndex, setSelectedAIndex] = useState<number>(0);
  const [selectedBIndex, setSelectedBIndex] = useState<number>(
    snapshots.length > 1 ? snapshots.length - 1 : 0
  );
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);

  const [containerWidth, setContainerWidth] = useState<number>(
    Dimensions.get('window').width - 32
  );
  const [containerHeight, setContainerHeight] = useState<number>(260);

  // Split slider position (0 to containerWidth)
  const splitPos = useSharedValue<number>(containerWidth * 0.5);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
      splitPos.value = width * 0.5;
    }
    if (height > 0) {
      setContainerHeight(height);
    }
  };

  const triggerHaptic = () => {
    Haptics.selectionAsync().catch(() => {});
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (containerWidth > 0) {
        const clampedX = Math.max(0, Math.min(containerWidth, e.x));
        splitPos.value = clampedX;
      }
    })
    .onEnd(() => {
      runOnJS(triggerHaptic)();
    });

  const dividerStyle = useAnimatedStyle(() => ({
    left: splitPos.value - 1.5,
  }));

  const overlayCropStyle = useAnimatedStyle(() => ({
    width: splitPos.value,
  }));

  const snapA = snapshots[selectedAIndex] || snapshots[0];
  const snapB = snapshots[selectedBIndex] || snapshots[0];

  const handleSelectSnapshot = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (index === selectedAIndex) {
      // Already A
      return;
    }
    if (index !== selectedBIndex) {
      // Set as B
      setSelectedBIndex(index);
    } else {
      // Toggle
      setSelectedAIndex(index);
    }
  };

  const handleEHSSelect = (score: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (onUpdateEHS && snapB) {
      onUpdateEHS(snapB.id, score);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleGroup}>
            <MaterialCommunityIcons
              name="compare-horizontal"
              size={22}
              color={THEME.colors.primary}
            />
            <Text style={styles.headerTitle}>時序狀態對比檢視器</Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={20} color={THEME.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Interactive Split-Slider Viewer */}
        <View style={styles.viewerContainer} onLayout={onLayout}>
          {snapA && snapB ? (
            <GestureDetector gesture={panGesture}>
              <View style={styles.comparisonFrame}>
                {/* Image A (Base / Right / Bottom layer) */}
                <Image
                  source={{ uri: snapB.uri }}
                  style={[styles.fullImage, { width: containerWidth, height: containerHeight }]}
                  resizeMode="cover"
                />

                {/* Badge for Image B (Right side) */}
                <View style={[styles.imageBadge, styles.badgeRight]}>
                  <Text style={styles.badgeText}>B: {snapB.timestampLabel}</Text>
                  <Text style={styles.badgeSub}>{snapB.stage}</Text>
                </View>

                {/* Image A (Top cropped overlay) */}
                <Animated.View style={[styles.cropWrapper, overlayCropStyle]}>
                  <Image
                    source={{ uri: snapA.uri }}
                    style={[styles.fullImage, { width: containerWidth, height: containerHeight }]}
                    resizeMode="cover"
                  />
                  {/* Badge for Image A (Left side) */}
                  <View style={[styles.imageBadge, styles.badgeLeft]}>
                    <Text style={styles.badgeText}>A: {snapA.timestampLabel}</Text>
                    <Text style={styles.badgeSub}>{snapA.stage}</Text>
                  </View>
                </Animated.View>

                {/* Draggable Divider Handle */}
                <Animated.View style={[styles.dividerBar, dividerStyle]}>
                  <View style={styles.dividerLine} />
                  <View style={styles.dividerKnob}>
                    <Ionicons name="code" size={14} color="#FFFFFF" />
                  </View>
                </Animated.View>
              </View>
            </GestureDetector>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={36} color={THEME.colors.textMuted} />
              <Text style={styles.emptyText}>本次 Session 尚未擷取截圖</Text>
            </View>
          )}
        </View>

        {/* EHS Hardness Rating Panel */}
        {snapB && (
          <View style={styles.ehsPanel}>
            <View style={styles.ehsHeader}>
              <Text style={styles.ehsTitle}>
                當前對比點 (B: {snapB.timestampLabel}) EHS 勃起硬度評級：
              </Text>
              <Text style={styles.ehsCurrentScore}>
                {snapB.ehsScore ? `Level ${snapB.ehsScore}` : '未評估'}
              </Text>
            </View>
            <View style={styles.ehsRow}>
              {EHS_LEVELS.map((ehs) => {
                const isSelected = snapB.ehsScore === ehs.level;
                return (
                  <TouchableOpacity
                    key={ehs.level}
                    style={[
                      styles.ehsBtn,
                      isSelected && { borderColor: ehs.color, backgroundColor: `${ehs.color}25` },
                    ]}
                    onPress={() => handleEHSSelect(ehs.level)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.ehsBtnText, isSelected && { color: ehs.color }]}>
                      {ehs.label}
                    </Text>
                    <Text style={styles.ehsDescText}>{ehs.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.reviewSnapBtn}
              onPress={() => setReviewModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="people" size={14} color="#0F172A" />
              <Text style={styles.reviewSnapBtnText}>
                召喚圍觀團品評截圖 (B: {snapB.timestampLabel})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Horizontal Timeline Snapshot Carousel */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionSubtitle}>
            時序快照時間軸 (點擊切換 A/B 對比)：
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timelineScroll}
          >
            {snapshots.map((snap, idx) => {
              const isA = idx === selectedAIndex;
              const isB = idx === selectedBIndex;
              return (
                <TouchableOpacity
                  key={snap.id}
                  style={[
                    styles.thumbCard,
                    isA && styles.thumbCardA,
                    isB && styles.thumbCardB,
                  ]}
                  onPress={() => handleSelectSnapshot(idx)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: snap.uri }} style={styles.thumbImage} />
                  {isA && (
                    <View style={[styles.selectionTag, { backgroundColor: THEME.colors.primary }]}>
                      <Text style={styles.selectionTagText}>A</Text>
                    </View>
                  )}
                  {isB && (
                    <View style={[styles.selectionTag, { backgroundColor: THEME.colors.accent }]}>
                      <Text style={styles.selectionTagText}>B</Text>
                    </View>
                  )}
                  <View style={styles.thumbFooter}>
                    <Text style={styles.thumbTime}>{snap.timestampLabel}</Text>
                    <Text style={styles.thumbBpm}>
                      {snap.currentBPM > 0 ? `${snap.currentBPM} BPM` : '急停'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Virtual Review Panel for Snapshot */}
      {snapB && (
        <VirtualReviewPanelModal
          visible={reviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          initialPhotoUri={snapB.uri}
          initialContext={{
            currentBPM: snapB.currentBPM,
            arousalLevel: snapB.arousalLevel,
            checkInType: 'snapshot',
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.9)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    padding: 16,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerContainer: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  comparisonFrame: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  fullImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cropWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  dividerBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 30,
    marginLeft: -15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  dividerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  dividerKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 6,
  },
  imageBadge: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeLeft: {
    left: 8,
  },
  badgeRight: {
    right: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeSub: {
    color: THEME.colors.textMuted,
    fontSize: 9,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
  },
  ehsPanel: {
    marginTop: 14,
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 10,
    borderRadius: 12,
  },
  ehsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ehsTitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  ehsCurrentScore: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primaryLight,
  },
  ehsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ehsBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
  },
  ehsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  ehsDescText: {
    fontSize: 8,
    color: THEME.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  reviewSnapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 8,
  },
  reviewSnapBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineSection: {
    marginTop: 14,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 8,
  },
  timelineScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  thumbCard: {
    width: 76,
    height: 96,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  thumbCardA: {
    borderColor: THEME.colors.primary,
  },
  thumbCardB: {
    borderColor: THEME.colors.accent,
  },
  thumbImage: {
    width: '100%',
    height: 64,
  },
  selectionTag: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  thumbFooter: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  thumbTime: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  thumbBpm: {
    fontSize: 8,
    color: THEME.colors.textMuted,
  },
});
