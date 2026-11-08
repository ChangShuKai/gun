import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import {
  listSandboxVideos,
  listDailyCheckInPhotos,
  listSandboxSnapshots,
  listSandboxImages,
} from '../services/mediaStorage';
import { DanmakuOverlay } from './DanmakuOverlay';

interface LeakedVCRPlayerProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  partnerName?: string;
}

interface MediaItem {
  type: 'video' | 'photo';
  uri: string;
  label: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LeakedVCRPlayer: React.FC<LeakedVCRPlayerProps> = ({
  visible,
  onClose,
  userName = '頂流男神',
  partnerName = '寶寶',
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <VCRPlayerContent
        onClose={onClose}
        userName={userName}
        partnerName={partnerName}
      />
    </Modal>
  );
};

const VCRPlayerContent: React.FC<{
  onClose: () => void;
  userName: string;
  partnerName: string;
}> = ({ onClose, userName, partnerName }) => {
  const [playlist, setPlaylist] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Blinking REC dot
  const [recBlink, setRecBlink] = useState<boolean>(true);

  // Timecode frame counter (0-29)
  const [frameCounter, setFrameCounter] = useState<number>(0);

  // Photo fade animation
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const totalDurationSec = 60;
  const photoDurationSec = 3.5;

  // 1. Gather all media from Vault and assemble into 60-second playlist
  useEffect(() => {
    let isMounted = true;
    async function preparePlaylist() {
      const items: MediaItem[] = [];

      try {
        const videos = await listSandboxVideos();
        for (const v of videos) {
          items.push({ type: 'video', uri: v, label: '機密錄影證據' });
        }
      } catch {}

      try {
        const checkins = await listDailyCheckInPhotos();
        for (const c of checkins) {
          items.push({ type: 'photo', uri: c.uri, label: `每日打卡：${c.title}` });
        }
      } catch {}

      try {
        const snaps = await listSandboxSnapshots();
        for (const s of snaps) {
          items.push({ type: 'photo', uri: s, label: '時序高光截圖' });
        }
      } catch {}

      try {
        const photos = await listSandboxImages();
        for (const p of photos) {
          items.push({ type: 'photo', uri: p, label: '私密素材' });
        }
      } catch {}

      if (isMounted) {
        if (items.length === 0) {
          // Fallback placeholder notice item
          items.push({
            type: 'photo',
            uri: '',
            label: '尚無私密檔案，請先進行打卡或錄影',
          });
        }
        setPlaylist(items);
        setIsReady(true);
      }
    }

    void preparePlaylist();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Master 60-second countdown and frame counter
  useEffect(() => {
    if (!isReady || isCompleted) return;

    // 1-second countdown
    const countTimer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countTimer);
          setIsCompleted(true);
          return 0;
        }
        return prev - 1;
      });
      setRecBlink((b) => !b);
    }, 1000);

    // Frame counter running at ~100ms
    const frameTimer = setInterval(() => {
      setFrameCounter((f) => (f + 3) % 30);
    }, 100);

    return () => {
      clearInterval(countTimer);
      clearInterval(frameTimer);
    };
  }, [isReady, isCompleted]);

  // 3. Photo slide sequencer (cycles every 3.5 seconds)
  useEffect(() => {
    if (!isReady || playlist.length <= 1 || isCompleted) return;

    const currentItem = playlist[currentIndex];
    // If current is video, let video play for up to 15s or switch
    const intervalTime = currentItem?.type === 'video' ? 12000 : photoDurationSec * 1000;

    const slideTimer = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.1, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 1800, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 1700, useNativeDriver: true }),
      ]).start();

      setCurrentIndex((prev) => (prev + 1) % playlist.length);
    }, intervalTime);

    return () => clearInterval(slideTimer);
  }, [isReady, playlist, currentIndex, isCompleted, fadeAnim, scaleAnim]);

  // 4. Double tap gesture to instantly exit
  const handleExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onClose();
  };

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      handleExit();
    });

  const currentMedia = playlist[currentIndex];
  const progressRatio = (totalDurationSec - secondsRemaining) / totalDurationSec;

  // Format timecode: 00:00:SS:FF
  const pad = (n: number) => n.toString().padStart(2, '0');
  const elapsedSec = totalDurationSec - secondsRemaining;
  const timecodeStr = `00:${pad(Math.floor(elapsedSec / 60))}:${pad(elapsedSec % 60)}:${pad(frameCounter)}`;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={doubleTapGesture}>
        <View style={styles.mainView}>
          {/* Media Content */}
          {!isReady ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#EF4444" />
              <Text style={styles.loadingText}>拼貼 60 秒外流證據鏈中...</Text>
            </View>
          ) : isCompleted ? (
            /* Completed Screen */
            <View style={styles.centerBox}>
              <View style={styles.completedIconBox}>
                <Ionicons name="checkmark-done-circle" size={54} color="#10B981" />
              </View>
              <Text style={styles.completedTitle}>60 秒外流 VCR 播放完畢</Text>
              <Text style={styles.completedSub}>
                【{userName}】私密證據鏈已完整封裝・全網轟動
              </Text>
              <TouchableOpacity style={styles.finishCloseBtn} onPress={handleExit}>
                <Text style={styles.finishCloseBtnText}>回到主頁</Text>
              </TouchableOpacity>
            </View>
          ) : currentMedia?.type === 'video' && currentMedia.uri ? (
            /* Video player view */
            <VCRVideoItem videoUri={currentMedia.uri} />
          ) : currentMedia?.uri ? (
            /* Photo slide with Ken Burns animation */
            <Animated.Image
              source={{ uri: currentMedia.uri }}
              style={[
                styles.photoImage,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.centerBox}>
              <MaterialCommunityIcons name="folder-lock" size={48} color="#94A3B8" />
              <Text style={styles.emptyNoticeText}>沙盒暫無照片或影片</Text>
              <Text style={styles.emptyNoticeSub}>
                先進行每日生理打卡或錄影，即可自動拼貼外流 VCR！
              </Text>
            </View>
          )}

          {/* Surveillance Overlay Filter */}
          <View style={styles.scanlineOverlay} pointerEvents="none" />

          {/* Live Virtual Danmaku Flying Layer */}
          <DanmakuOverlay densityMultiplier={1.6} />

          {/* Crosshair Markers on Corners */}
          <View style={[styles.cornerCross, styles.cornerTL]} pointerEvents="none" />
          <View style={[styles.cornerCross, styles.cornerTR]} pointerEvents="none" />
          <View style={[styles.cornerCross, styles.cornerBL]} pointerEvents="none" />
          <View style={[styles.cornerCross, styles.cornerBR]} pointerEvents="none" />

          {/* Top 60s Progress Bar */}
          <View style={styles.topProgressBarTrack}>
            <View style={[styles.topProgressBarFill, { width: `${progressRatio * 100}%` }]} />
          </View>

          {/* Top Bar HUD */}
          <View style={styles.hudTopBar}>
            {/* Left Tag */}
            <View style={styles.hudLeftGroup}>
              <View style={styles.recBadge}>
                <View
                  style={[
                    styles.recDot,
                    { backgroundColor: recBlink ? '#EF4444' : 'transparent' },
                  ]}
                />
                <Text style={styles.recText}>REC 🔴</Text>
              </View>
              <View style={styles.leakTag}>
                <Text style={styles.leakTagText}>LEAKED ARCHIVE</Text>
              </View>
            </View>

            {/* Right Close Button */}
            <TouchableOpacity style={styles.closeBtn} onPress={handleExit} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Bottom HUD: Timecode, Camera ID & Metadata */}
          <View style={styles.hudBottomBar}>
            <View style={styles.hudBottomLeft}>
              <Text style={styles.timecodeText}>{timecodeStr}</Text>
              <Text style={styles.camIdText}>CAM-03 // PRIVATE_VAULT_FEED</Text>
              <Text style={styles.partnerNoticeText}>
                ⚠️ 檔案提供者：親密伴侶【{partnerName}】
              </Text>
            </View>

            <View style={styles.hudBottomRight}>
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownNumber}>{secondsRemaining}s</Text>
                <Text style={styles.countdownLabel}>倒數結束</Text>
              </View>
              <Text style={styles.doubleTapHint}>雙擊螢幕立即隱私退出</Text>
            </View>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
};

const VCRVideoItem: React.FC<{ videoUri: string }> = ({ videoUri }) => {
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.videoPlayer}
      contentFit="cover"
      nativeControls={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mainView: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#05070D',
  },
  photoImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '800',
  },
  completedIconBox: {
    marginBottom: 8,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  completedSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  finishCloseBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  finishCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  emptyNoticeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyNoticeSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  scanlineOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 20, 10, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cornerCross: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: 'rgba(239, 68, 68, 0.65)',
  },
  cornerTL: {
    top: 36,
    left: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    top: 36,
    right: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    bottom: 30,
    left: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    bottom: 30,
    right: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  topProgressBarTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 100,
  },
  topProgressBarFill: {
    height: '100%',
    backgroundColor: '#EF4444',
  },
  hudTopBar: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 90,
  },
  hudLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  leakTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leakTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hudBottomBar: {
    position: 'absolute',
    bottom: 36,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 90,
  },
  hudBottomLeft: {
    gap: 2,
  },
  timecodeText: {
    fontSize: 20,
    fontFamily: 'monospace',
    fontWeight: '900',
    color: '#00FF66',
    textShadowColor: 'rgba(0, 255, 102, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  camIdText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#CBD5E1',
    fontWeight: '700',
  },
  partnerNoticeText: {
    fontSize: 10,
    color: '#FCA5A5',
    fontWeight: '700',
    marginTop: 2,
  },
  hudBottomRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  countdownBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#EF4444',
  },
  countdownLabel: {
    fontSize: 8,
    color: '#94A3B8',
    fontWeight: '700',
  },
  doubleTapHint: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
