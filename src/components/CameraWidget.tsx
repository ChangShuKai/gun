import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { SnapshotMetadata } from '../types';
import { saveSnapshotToSandbox } from '../services/mediaStorage';

interface CameraWidgetProps {
  elapsedSeconds?: number;
  currentBPM?: number;
  stage?: string;
  arousalLevel?: number;
  onSnapshotCaptured?: (snapshot: SnapshotMetadata) => void;
  recentSnapshots?: SnapshotMetadata[];
}

export const CameraWidget: React.FC<CameraWidgetProps> = ({
  elapsedSeconds = 0,
  currentBPM = 0,
  stage = 'WARM_UP',
  arousalLevel = 1.0,
  onSnapshotCaptured,
  recentSnapshots = [],
}) => {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');

  // Ghost / Onion skin overlay state
  const [ghostEnabled, setGhostEnabled] = useState<boolean>(false);
  const [lastSnapshotUri, setLastSnapshotUri] = useState<string | null>(
    recentSnapshots.length > 0 ? recentSnapshots[recentSnapshots.length - 1].uri : null
  );

  // Shutter blink flash state
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  const toggleCameraFacing = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleGhostMode = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setGhostEnabled((prev) => !prev);
  };

  // Seamless in-recording snapshot
  const handleTakeSnapshot = async () => {
    if (!cameraRef.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

      // Trigger white flash blink
      setIsFlashing(true);
      setTimeout(() => {
        setIsFlashing(false);
      }, 200);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: true,
      });

      if (photo && photo.uri) {
        const mins = Math.floor(elapsedSeconds / 60);
        const secs = elapsedSeconds % 60;
        const timestampLabel = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        const saved = await saveSnapshotToSandbox(photo.uri, {
          timestampSeconds: elapsedSeconds,
          timestampLabel,
          currentBPM,
          stage,
          arousalLevel,
        });

        setLastSnapshotUri(saved.uri);
        if (onSnapshotCaptured) {
          onSnapshotCaptured(saved);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (e) {
      console.warn('[CameraWidget] Snapshot capture error:', e);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={THEME.colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={40} color={THEME.colors.warning} />
        <Text style={styles.permissionTitle}>相機權限未授權</Text>
        <Text style={styles.permissionSub}>
          我們需要相機權限以提供即時鏡頭預覽與時序截圖功能
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text style={styles.permissionBtnText}>開啟相機權限</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
        enableTorch={false}
      />

      {/* Ghost / Onion Skin Overlay */}
      {ghostEnabled && lastSnapshotUri && (
        <View style={styles.ghostContainer} pointerEvents="none">
          <Image
            source={{ uri: lastSnapshotUri }}
            style={styles.ghostImage}
            resizeMode="cover"
          />
          <View style={styles.ghostIndicatorBadge}>
            <Text style={styles.ghostIndicatorText}>👻 幽靈殘影對比中 (35% 透明度)</Text>
          </View>
        </View>
      )}

      {/* Shutter Blink Flash Overlay */}
      {isFlashing && <View style={styles.flashOverlay} pointerEvents="none" />}

      {/* Top Floating Controls */}
      <View style={styles.topControlsOverlay}>
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={toggleCameraFacing}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-reverse" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {lastSnapshotUri && (
          <TouchableOpacity
            style={[
              styles.ghostToggleBtn,
              ghostEnabled && styles.ghostToggleBtnActive,
            ]}
            onPress={toggleGhostMode}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={ghostEnabled ? 'ghost' : 'ghost-off'}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.ghostToggleText}>
              {ghostEnabled ? '殘影開' : '殘影關'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.cameraBadge}>
          <Text style={styles.cameraBadgeText}>
            {facing === 'front' ? '前置' : '後置'}
          </Text>
        </View>
      </View>

      {/* Bottom Shutter Snap Button */}
      <View style={styles.bottomControlsOverlay}>
        <TouchableOpacity
          style={styles.shutterButton}
          onPress={handleTakeSnapshot}
          activeOpacity={0.7}
        >
          <View style={styles.shutterInnerRing}>
            <MaterialCommunityIcons name="camera-iris" size={26} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <Text style={styles.shutterHint}>即時抓拍</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  permissionSub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
  },
  permissionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topControlsOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  ghostToggleBtnActive: {
    backgroundColor: THEME.colors.accent,
    borderColor: '#FFFFFF',
  },
  ghostToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cameraBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ghostContainer: {
    ...StyleSheet.absoluteFill,
  },
  ghostImage: {
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  ghostIndicatorBadge: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ghostIndicatorText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
  },
  bottomControlsOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    alignItems: 'center',
    gap: 4,
  },
  shutterButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInnerRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterHint: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
