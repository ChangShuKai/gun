import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  PanResponder,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { MorphingFrame } from '../types';
import { morphingService } from '../services/morphingService';
import { useApp } from '../context/AppContext';

interface MorphingModalProps {
  visible: boolean;
  onClose: () => void;
}

type PresetMode = 'LATEST_2' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL' | 'ANNUAL_52';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CANVAS_WIDTH = Math.min(SCREEN_WIDTH - 40, 360);
const CANVAS_HEIGHT = Math.round(CANVAS_WIDTH * 1.33);

export const MorphingModal: React.FC<MorphingModalProps> = ({ visible, onClose }) => {
  const { records } = useApp();

  const [loading, setLoading] = useState<boolean>(true);
  const [allFrames, setAllFrames] = useState<MorphingFrame[]>([]);
  const [activeFrames, setActiveFrames] = useState<MorphingFrame[]>([]);
  const [presetMode, setPresetMode] = useState<PresetMode>('LATEST_2');

  // Playback state: ratio 0.0 -> 1.0 (for current sequence)
  const [ratio, setRatio] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 1x, 1.5x, 2x

  // Double-tap privacy blur
  const [isPrivacyBlurred, setIsPrivacyBlurred] = useState<boolean>(false);
  const lastTapRef = useRef<number>(0);

  // Milestone info
  const milestoneInfo = useMemo(() => {
    return morphingService.checkAnnualMilestoneUnlocked(allFrames, records);
  }, [allFrames, records]);

  // Load frames when modal is opened
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const frames = await morphingService.loadMorphingFrames();
      setAllFrames(frames);

      // Apply initial preset
      if (frames.length >= 2) {
        const latest2 = morphingService.filterLatest2(frames);
        setActiveFrames(latest2);
        setPresetMode('LATEST_2');
      } else {
        setActiveFrames(frames);
      }
    } catch (err) {
      console.warn('[MorphingModal] Failed to load frames:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleModalShow = () => {
    loadData();
    setRatio(0);
    setIsPlaying(false);
  };

  // Switch Preset Mode
  const handleSelectPreset = (mode: PresetMode) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setPresetMode(mode);
    setRatio(0);

    if (allFrames.length === 0) return;

    let selected: MorphingFrame[] = [];
    if (mode === 'LATEST_2') {
      selected = morphingService.filterLatest2(allFrames);
    } else if (mode === 'THIS_WEEK') {
      selected = morphingService.filterThisWeek(allFrames);
    } else if (mode === 'THIS_MONTH') {
      selected = morphingService.filterThisMonth(allFrames);
    } else if (mode === 'ALL' || mode === 'ANNUAL_52') {
      selected = [...allFrames];
    }

    setActiveFrames(selected);
  };

  // Toggle single frame selection
  const handleToggleFrame = (frame: MorphingFrame) => {
    try {
      Haptics.selectionAsync();
    } catch {}

    const exists = activeFrames.some((f) => f.id === frame.id);
    if (exists) {
      if (activeFrames.length <= 2) {
        // Minimum 2 frames needed
        return;
      }
      setActiveFrames(activeFrames.filter((f) => f.id !== frame.id));
    } else {
      const next = [...activeFrames, frame].sort((a, b) => a.timestamp - b.timestamp);
      setActiveFrames(next);
    }
    setRatio(0);
  };

  // Continuous loop playback timer
  useEffect(() => {
    if (!isPlaying || activeFrames.length < 2) return;

    const frameCount = activeFrames.length;
    // Base cycle duration: 2 frames = 2.5s; N frames = N * 0.5s
    const baseDurationMs =
      presetMode === 'ANNUAL_52'
        ? Math.max(20000, frameCount * 1200)
        : frameCount === 2
        ? 2400
        : Math.max(3000, frameCount * 600);

    const stepIntervalMs = 30;
    const stepDelta = (stepIntervalMs / (baseDurationMs / playbackSpeed));

    const timer = setInterval(() => {
      setRatio((prev) => {
        const next = prev + stepDelta;
        if (next >= 1) {
          return 0; // Loop back
        }
        return next;
      });
    }, stepIntervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, activeFrames.length, presetMode, playbackSpeed]);

  // Compute current Frame A, Frame B and local cross-dissolve progress
  const currentPair = useMemo(() => {
    if (activeFrames.length < 2) {
      return {
        frameA: activeFrames[0] || null,
        frameB: null,
        localRatio: 0,
        correction: null,
        startFrame: activeFrames[0] || null,
        endFrame: activeFrames[0] || null,
      };
    }

    const startFrame = activeFrames[0];
    const endFrame = activeFrames[activeFrames.length - 1];

    if (activeFrames.length === 2) {
      const frameA = activeFrames[0];
      const frameB = activeFrames[1];
      const anchorA = frameA.anchor || { rootPoint: { x: 0.5, y: 0.8 }, tipPoint: { x: 0.5, y: 0.3 } };
      const anchorB = frameB.anchor || { rootPoint: { x: 0.5, y: 0.8 }, tipPoint: { x: 0.5, y: 0.3 } };

      const correction = morphingService.calculateAnchorAlignment(
        anchorA,
        anchorB,
        CANVAS_WIDTH,
        CANVAS_HEIGHT
      );

      return {
        frameA,
        frameB,
        localRatio: ratio,
        correction,
        startFrame,
        endFrame,
      };
    }

    // Multi-frame sequence
    const segmentCount = activeFrames.length - 1;
    const scaled = ratio * segmentCount;
    const index = Math.min(Math.floor(scaled), segmentCount - 1);
    const localRatio = scaled - index;

    const frameA = activeFrames[index];
    const frameB = activeFrames[index + 1];

    const anchorA = frameA.anchor || { rootPoint: { x: 0.5, y: 0.8 }, tipPoint: { x: 0.5, y: 0.3 } };
    const anchorB = frameB.anchor || { rootPoint: { x: 0.5, y: 0.8 }, tipPoint: { x: 0.5, y: 0.3 } };

    const correction = morphingService.calculateAnchorAlignment(
      anchorA,
      anchorB,
      CANVAS_WIDTH,
      CANVAS_HEIGHT
    );

    return {
      frameA,
      frameB,
      localRatio,
      correction,
      startFrame,
      endFrame,
    };
  }, [activeFrames, ratio]);

  // Double tap handler for privacy blur
  const handleCanvasTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      setIsPrivacyBlurred((prev) => !prev);
    }
    lastTapRef.current = now;
  };

  // Interactive scrubbing PanResponder
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setIsPlaying(false);
        },
        onPanResponderMove: (_, gestureState) => {
          const trackWidth = CANVAS_WIDTH;
          // Calculate ratio based on touch location
          const newRatio = Math.max(0, Math.min(1, gestureState.dx / trackWidth + ratio));
          setRatio(newRatio);
        },
        onPanResponderRelease: () => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
        },
      }),
    [ratio]
  );

  // Direct track tap for slider
  const handleTrackTap = (e: any) => {
    const locationX = e.nativeEvent.locationX;
    const newRatio = Math.max(0, Math.min(1, locationX / CANVAS_WIDTH));
    setRatio(newRatio);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  // Metrics summary
  const growthDelta = useMemo(() => {
    if (!currentPair.startFrame || !currentPair.endFrame) return 0;
    return (
      Math.round(
        (currentPair.endFrame.lengthCm - currentPair.startFrame.lengthCm) * 10
      ) / 10
    );
  }, [currentPair.startFrame, currentPair.endFrame]);

  // Compute transform matrix styles for Frame B relative to Frame A
  const frameBTransformStyle = useMemo(() => {
    if (!currentPair.correction) {
      return {
        opacity: currentPair.localRatio,
      };
    }

    const { translateX, translateY, scale, rotateDeg } = currentPair.correction;
    const progress = currentPair.localRatio;

    return {
      opacity: progress,
      transform: [
        { translateX: translateX * progress },
        { translateY: translateY * progress },
        { scale: 1 + (scale - 1) * progress },
        { rotate: `${Math.round(rotateDeg * progress)}deg` },
      ],
    };
  }, [currentPair]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      onShow={handleModalShow}
    >
      <View style={styles.container}>
        {/* Top Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color={THEME.colors.text} />
          </TouchableOpacity>

          <View style={styles.titleColumn}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="animation-play" size={17} color="#60A5FA" />
              <Text style={styles.modalTitle}>隨選生長動態縮時</Text>
            </View>
            <Text style={styles.modalSub}>
              雙錨點對齊 · 影格交疊漸變 (Morphing)
            </Text>
          </View>

          <TouchableOpacity
            style={styles.blurQuickBtn}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setIsPrivacyBlurred(!isPrivacyBlurred);
            }}
          >
            <Ionicons
              name={isPrivacyBlurred ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={THEME.colors.primaryLight}
            />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={THEME.colors.primaryLight} />
            <Text style={styles.loadingText}>載入私密沙盒打卡影像...</Text>
          </View>
        ) : allFrames.length < 2 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="camera-metering-spot"
              size={56}
              color={THEME.colors.textMuted}
            />
            <Text style={styles.emptyTitle}>打卡照片未滿 2 張</Text>
            <Text style={styles.emptyText}>
              Morphing 動態縮時需要至少 2 張沙盒照片進行雙錨點對齊與漸變。
              請先於每日生理打卡完成 2 次拍攝！
            </Text>
            <TouchableOpacity style={styles.reloadBtn} onPress={loadData}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.reloadBtnText}>重新偵測沙盒照片</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 52-Week Milestone Glowing Banner */}
            {milestoneInfo.isUnlocked && (
              <TouchableOpacity
                style={[
                  styles.milestoneBanner,
                  presetMode === 'ANNUAL_52' && styles.milestoneBannerActive,
                ]}
                activeOpacity={0.85}
                onPress={() => handleSelectPreset('ANNUAL_52')}
              >
                <View style={styles.milestoneIconGlow}>
                  <Ionicons name="trophy" size={20} color="#F59E0B" />
                </View>
                <View style={styles.milestoneTextBox}>
                  <View style={styles.milestoneTitleRow}>
                    <Text style={styles.milestoneTitle}>
                      🏆 年度 52 週蛻變高光已解鎖
                    </Text>
                    <View style={styles.milestoneTag}>
                      <Text style={styles.milestoneTagText}>ANNUAL</Text>
                    </View>
                  </View>
                  <Text style={styles.milestoneSub}>
                    整年度完整照片串聯 · 渲染 30~60 秒蛻變縮時精華
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Growth Metric Badge */}
            <View style={styles.metricBanner}>
              <View style={styles.metricLeft}>
                <Text style={styles.metricLabel}>生長進程區間</Text>
                <Text style={styles.metricDates}>
                  {currentPair.startFrame?.dateString || '起點'} ➔{' '}
                  {currentPair.endFrame?.dateString || '最新'}
                </Text>
              </View>

              <View style={styles.metricRight}>
                <Text style={styles.metricLengthTitle}>生長變化</Text>
                <Text
                  style={[
                    styles.metricLengthVal,
                    { color: growthDelta >= 0 ? '#10B981' : THEME.colors.textSecondary },
                  ]}
                >
                  {growthDelta >= 0 ? `+${growthDelta}` : growthDelta} cm
                </Text>
              </View>
            </View>

            {/* Presets Row */}
            <View style={styles.presetsRow}>
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  presetMode === 'LATEST_2' && styles.presetChipActive,
                ]}
                onPress={() => handleSelectPreset('LATEST_2')}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    presetMode === 'LATEST_2' && styles.presetChipTextActive,
                  ]}
                >
                  最新 2 張極速
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetChip,
                  presetMode === 'THIS_WEEK' && styles.presetChipActive,
                ]}
                onPress={() => handleSelectPreset('THIS_WEEK')}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    presetMode === 'THIS_WEEK' && styles.presetChipTextActive,
                  ]}
                >
                  本週對比
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetChip,
                  presetMode === 'THIS_MONTH' && styles.presetChipActive,
                ]}
                onPress={() => handleSelectPreset('THIS_MONTH')}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    presetMode === 'THIS_MONTH' && styles.presetChipTextActive,
                  ]}
                >
                  本月趨勢
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetChip,
                  presetMode === 'ALL' && styles.presetChipActive,
                ]}
                onPress={() => handleSelectPreset('ALL')}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    presetMode === 'ALL' && styles.presetChipTextActive,
                  ]}
                >
                  全部 ({allFrames.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Morphing Dynamic Canvas */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleCanvasTap}
              style={[styles.canvasContainer, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }]}
            >
              {/* Frame A (Base Layer) */}
              {currentPair.frameA && (
                <View style={StyleSheet.absoluteFill}>
                  <Image
                    source={{ uri: currentPair.frameA.uri }}
                    style={styles.canvasImage}
                    blurRadius={isPrivacyBlurred ? 25 : 0}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* Frame B (Interpolated & Aligned Morphing Layer) */}
              {currentPair.frameB && (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    frameBTransformStyle,
                  ]}
                >
                  <Image
                    source={{ uri: currentPair.frameB.uri }}
                    style={styles.canvasImage}
                    blurRadius={isPrivacyBlurred ? 25 : 0}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* Double Tap Privacy Blur Overlay Indicator */}
              {isPrivacyBlurred && (
                <View style={styles.blurActiveOverlay}>
                  <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
                  <Text style={styles.blurActiveText}>隱私遮蔽已開啟 (雙擊畫布解除)</Text>
                </View>
              )}

              {/* Top Frame Tag */}
              <View style={styles.canvasTopTag}>
                <Text style={styles.canvasTopTagText}>
                  {currentPair.frameA?.title || '私密打卡'} ·{' '}
                  {currentPair.frameA?.dateString} ➔ {currentPair.frameB?.dateString || ''}
                </Text>
                <Text style={styles.canvasLengthTag}>
                  {currentPair.frameA?.lengthCm} cm ➔ {currentPair.frameB?.lengthCm || ''} cm
                </Text>
              </View>

              {/* Bottom Privacy Watermark */}
              <View style={styles.watermarkTag}>
                <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.7)" />
                <Text style={styles.watermarkText}>
                  VAULT TIMELAPSE · LOCAL CONFIDENTIAL
                </Text>
              </View>
            </TouchableOpacity>

            {/* Interactive Player Controls */}
            <View style={[styles.playerControls, { width: CANVAS_WIDTH }]}>
              {/* Scrubbing Slider Track */}
              <View style={styles.scrubberContainer}>
                <View style={styles.scrubberLabelsRow}>
                  <Text style={styles.scrubberLabel}>Frame A (0%)</Text>
                  <Text style={styles.scrubberCenterLabel}>
                    過渡進度：{Math.round(ratio * 100)}%
                  </Text>
                  <Text style={styles.scrubberLabel}>Frame B (100%)</Text>
                </View>

                <TouchableOpacity
                  activeOpacity={1}
                  onPress={handleTrackTap}
                  style={styles.sliderTrack}
                  {...panResponder.panHandlers}
                >
                  <View
                    style={[
                      styles.sliderFill,
                      { width: `${Math.round(ratio * 100)}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.sliderThumb,
                      { left: `${Math.max(0, Math.min(94, ratio * 100))}%` },
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {/* Buttons Row: Play/Pause, Step, Speed */}
              <View style={styles.buttonsRow}>
                {/* Step back */}
                <TouchableOpacity
                  style={styles.ctrlBtn}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setRatio((prev) => Math.max(0, prev - 0.1));
                  }}
                >
                  <Ionicons name="play-skip-back" size={18} color={THEME.colors.text} />
                </TouchableOpacity>

                {/* Play / Pause Toggle */}
                <TouchableOpacity
                  style={styles.mainPlayBtn}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    } catch {}
                    setIsPlaying(!isPlaying);
                  }}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={22}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                {/* Step forward */}
                <TouchableOpacity
                  style={styles.ctrlBtn}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setRatio((prev) => Math.min(1, prev + 0.1));
                  }}
                >
                  <Ionicons name="play-skip-forward" size={18} color={THEME.colors.text} />
                </TouchableOpacity>

                {/* Speed toggle */}
                <TouchableOpacity
                  style={styles.speedBtn}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    setPlaybackSpeed((prev) => (prev === 1.0 ? 1.5 : prev === 1.5 ? 2.0 : 1.0));
                  }}
                >
                  <Text style={styles.speedBtnText}>{playbackSpeed}x 速度</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Custom Frame Selection Strip */}
            <View style={styles.frameStripSection}>
              <View style={styles.frameStripHeader}>
                <Text style={styles.frameStripTitle}>
                  選取影格佇列 ({activeFrames.length}/{allFrames.length})
                </Text>
                <Text style={styles.frameStripSub}>點擊縮圖勾選/取消參與縮時生成</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stripScroll}
              >
                {allFrames.map((frame) => {
                  const isSelected = activeFrames.some((f) => f.id === frame.id);
                  return (
                    <TouchableOpacity
                      key={frame.id}
                      activeOpacity={0.8}
                      onPress={() => handleToggleFrame(frame)}
                      style={[
                        styles.frameThumbCard,
                        isSelected && styles.frameThumbCardSelected,
                      ]}
                    >
                      <Image
                        source={{ uri: frame.uri }}
                        style={styles.frameThumbImg}
                        blurRadius={10}
                      />
                      <View style={styles.frameThumbOverlay}>
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={isSelected ? '#10B981' : 'rgba(255,255,255,0.6)'}
                        />
                        <Text style={styles.frameThumbDate}>{frame.dateString}</Text>
                        <Text style={styles.frameThumbLen}>{frame.lengthCm} cm</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070B14',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#1E293B',
    borderRadius: 20,
  },
  titleColumn: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  modalSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  blurQuickBtn: {
    padding: 6,
    backgroundColor: '#1E293B',
    borderRadius: 20,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  emptyText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  reloadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 30,
  },
  milestoneBanner: {
    width: CANVAS_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  milestoneBannerActive: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  milestoneIconGlow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneTextBox: {
    flex: 1,
  },
  milestoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  milestoneTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F59E0B',
  },
  milestoneTag: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  milestoneTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
  },
  milestoneSub: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  metricBanner: {
    width: CANVAS_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  metricLeft: {},
  metricLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  metricDates: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 2,
  },
  metricRight: {
    alignItems: 'flex-end',
  },
  metricLengthTitle: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  metricLengthVal: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderColor: '#3B82F6',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  presetChipTextActive: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  canvasContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  canvasImage: {
    width: '100%',
    height: '100%',
  },
  blurActiveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  blurActiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  canvasTopTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  canvasTopTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  canvasLengthTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60A5FA',
  },
  watermarkTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  watermarkText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  playerControls: {
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  scrubberContainer: {
    marginBottom: 12,
  },
  scrubberLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scrubberLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  scrubberCenterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
  },
  sliderTrack: {
    height: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 9,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  sliderThumb: {
    position: 'absolute',
    top: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  ctrlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  speedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  speedBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  frameStripSection: {
    width: CANVAS_WIDTH,
  },
  frameStripHeader: {
    marginBottom: 8,
  },
  frameStripTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  frameStripSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  stripScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  frameThumbCard: {
    width: 72,
    height: 96,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  frameThumbCardSelected: {
    borderColor: '#10B981',
  },
  frameThumbImg: {
    width: '100%',
    height: '100%',
  },
  frameThumbOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    justifyContent: 'space-between',
  },
  frameThumbDate: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 3,
    borderRadius: 3,
  },
  frameThumbLen: {
    fontSize: 9,
    fontWeight: '800',
    color: '#60A5FA',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 3,
    borderRadius: 3,
  },
});
