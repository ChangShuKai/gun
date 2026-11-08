import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { authenticateWithBiometrics } from '../services/authService';

export const GateScreen: React.FC = () => {
  const { settings, setCurrentScreen } = useApp();
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleAdultConfirm = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // First time launch: go straight to onboarding
    if (settings.isFirstLaunch) {
      setCurrentScreen('onboarding');
      return;
    }

    // Subsequent launches: trigger biometrics authentication
    setIsVerifying(true);
    setStatusMessage('正在進行生物辨識...');

    try {
      const result = await authenticateWithBiometrics('請驗證身份以進入健康紀錄');
      if (result.success) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        setCurrentScreen('main');
      } else {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
        setStatusMessage('');
        Alert.alert(
          '驗證失敗',
          '無法驗證您的身份。請確認生物辨識設定或重新嘗試。',
          [
            { text: '重新驗證', onPress: () => handleAdultConfirm() },
            {
              text: '使用密碼/直接進入 (測試模式)',
              onPress: () => setCurrentScreen('main'),
              style: 'default',
            },
            { text: '取消', style: 'cancel' },
          ]
        );
      }
    } catch (err: any) {
      setStatusMessage('');
      Alert.alert('驗證異常', err?.message || '發生未知錯誤');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Top subtle privacy pill */}
      <View style={styles.header}>
        <View style={styles.privacyPill}>
          <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
          <Text style={styles.privacyText}>100% 離線純本地加密存儲</Text>
        </View>
      </View>

      {/* Center hero */}
      <View style={styles.centerSection}>
        <View style={styles.badgeCircle}>
          <Text style={styles.ageBadge}>18+</Text>
        </View>
        
        <Text style={styles.appName}>健康尻尻</Text>
        <Text style={styles.tagline}>個人專屬・絕對隱私・習慣追蹤</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.82}
          onPress={handleAdultConfirm}
          disabled={isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>我已成年</Text>
          )}
        </TouchableOpacity>

        {statusMessage ? (
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        ) : null}
      </View>

      {/* Footer notice */}
      <View style={styles.footer}>
        <Text style={styles.noticeText}>
          本應用程式為個人健康與生活習慣管理工具。{'\n'}
          未滿 18 歲請勿進入。所有資料嚴格保存在本裝置沙盒內。
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean pure white background as specified
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 56,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 16,
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 6,
  },
  privacyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    letterSpacing: 0.3,
  },
  centerSection: {
    width: '100%',
    alignItems: 'center',
    maxWidth: 340,
  },
  badgeCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  ageBadge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 44,
  },
  primaryButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#2563EB', // Vibrant blue button
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  statusMessage: {
    marginTop: 16,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
