import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';

export const CameraWidget: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');

  const toggleCameraFacing = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
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
          我們需要相機權限以提供即時鏡頭預覽功能
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
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
        enableTorch={false}
      />

      {/* Floating control buttons */}
      <View style={styles.controlsOverlay}>
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={toggleCameraFacing}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-reverse" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.cameraBadge}>
          <Text style={styles.cameraBadgeText}>
            {facing === 'front' ? '前置鏡頭' : '後置鏡頭'}
          </Text>
        </View>
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
  controlsOverlay: {
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
});
