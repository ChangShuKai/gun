import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface PrivacyBlurOverlayProps {
  visible: boolean;
}

export const PrivacyBlurOverlay: React.FC<PrivacyBlurOverlayProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.absoluteContainer} pointerEvents="auto">
      <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={48} color={THEME.colors.primary} />
          </View>
          <Text style={styles.title}>健康尻尻</Text>
          <Text style={styles.badge}>🔒 隱私防護已啟用</Text>
          <Text style={styles.subtitle}>
            已自動模糊全螢幕畫面，防止多工切換時機密外洩
          </Text>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    elevation: 999999,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'rgba(11, 15, 25, 0.4)',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.text,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  badge: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    overflow: 'hidden',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
