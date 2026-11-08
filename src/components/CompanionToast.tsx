import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { CompanionMessage, GirlfriendConfig } from '../types';
import { girlfriendCompanion } from '../services/girlfriendCompanion';

interface CompanionToastProps {
  topOffset?: number;
}

export const CompanionToast: React.FC<CompanionToastProps> = ({
  topOffset = 54,
}) => {
  const [currentMessage, setCurrentMessage] = useState<CompanionMessage | null>(null);
  const [config, setConfig] = useState<GirlfriendConfig>(girlfriendCompanion.getConfig());
  const [configModalVisible, setConfigModalVisible] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(config.name);
  const [titleInput, setTitleInput] = useState<string>(config.title);

  // Animated translateY and opacity using standard RN Animated via useState
  const [translateY] = useState(() => new Animated.Value(-120));
  const [opacity] = useState(() => new Animated.Value(0));

  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentMessage(null);
    });
  }, [translateY, opacity]);

  useEffect(() => {
    girlfriendCompanion.loadConfig().then((cfg) => {
      setConfig(cfg);
      setNameInput(cfg.name);
      setTitleInput(cfg.title);
    });

    const unsubscribe = girlfriendCompanion.subscribe((msg) => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);

      setCurrentMessage(msg);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 15,
          stiffness: 120,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 6 seconds
      dismissTimer.current = setTimeout(() => {
        hideToast();
      }, 6000);
    });

    return () => {
      unsubscribe();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [hideToast, opacity, translateY]);

  const handleToastPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    hideToast();
  };

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setNameInput(config.name);
    setTitleInput(config.title);
    setConfigModalVisible(true);
  };

  const handleSaveSettings = async () => {
    const updated = await girlfriendCompanion.saveConfig({
      name: nameInput.trim() || '寶寶',
      title: titleInput.trim() || '女友',
    });
    setConfig(updated);
    setConfigModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert('虛擬女友設定已保存', `稱謂：${updated.title} ${updated.name}`);
  };

  const getCategoryTheme = (category?: string) => {
    switch (category) {
      case 'guidance':
        return {
          color: '#38BDF8',
          bg: 'rgba(14, 165, 233, 0.2)',
          icon: 'camera-outline',
          badgeText: '拍照指導',
        };
      case 'praise':
        return {
          color: '#F43F5E',
          bg: 'rgba(244, 63, 94, 0.2)',
          icon: 'heart',
          badgeText: '生理讚美',
        };
      case 'discipline':
        return {
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.2)',
          icon: 'shield-alert-outline',
          badgeText: '急停調教',
        };
      case 'pacing':
        return {
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.2)',
          icon: 'pulse',
          badgeText: '節奏控射',
        };
      default:
        return {
          color: '#EC4899',
          bg: 'rgba(236, 72, 153, 0.2)',
          icon: 'chatbubble-ellipses-outline',
          badgeText: '女友陪伴',
        };
    }
  };

  const catTheme = getCategoryTheme(currentMessage?.category);

  return (
    <>
      {/* Toast Notification Container */}
      {currentMessage && (
        <Animated.View
          style={[
            styles.toastContainer,
            { top: topOffset, transform: [{ translateY }], opacity },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.toastCard}
            onPress={handleToastPress}
            activeOpacity={0.9}
          >
            <BlurView intensity={85} tint="dark" style={styles.blurBackground}>
              {/* Top Row: Girlfriend Name + Badge + Close */}
              <View style={styles.toastTopRow}>
                <View style={styles.profileRow}>
                  <View style={[styles.avatarBox, { backgroundColor: catTheme.bg }]}>
                    <Ionicons name={catTheme.icon as any} size={15} color={catTheme.color} />
                  </View>
                  <Text style={styles.companionName}>
                    {config.title} {config.name}
                  </Text>
                  <View style={[styles.categoryBadge, { borderColor: catTheme.color }]}>
                    <Text style={[styles.categoryBadgeText, { color: catTheme.color }]}>
                      {catTheme.badgeText}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.settingsIconBtn}
                  onPress={handleOpenSettings}
                >
                  <Ionicons name="settings-outline" size={14} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Message text */}
              <Text style={styles.messageText}>{currentMessage.text}</Text>

              {/* Tap to dismiss hint */}
              <Text style={styles.tapHint}>點擊關閉 • 長按設定稱謂</Text>
            </BlurView>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Settings Modal */}
      <Modal
        visible={configModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfigModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="heart" size={20} color="#EC4899" />
                <Text style={styles.modalTitle}>自訂虛擬女友陪伴</Text>
              </View>
              <TouchableOpacity onPress={() => setConfigModalVisible(false)}>
                <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>虛擬伴侶姓名（替換語錄中的呼稱）：</Text>
            <TextInput
              style={styles.textInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="例如：寶寶、主人、哥哥"
              placeholderTextColor={THEME.colors.textMuted}
            />

            <Text style={styles.inputLabel}>伴侶角色稱謂：</Text>
            <TextInput
              style={styles.textInput}
              value={titleInput}
              onChangeText={setTitleInput}
              placeholder="例如：女友、專屬調教師、學妹"
              placeholderTextColor={THEME.colors.textMuted}
            />

            <View style={styles.presetButtonsRow}>
              <TouchableOpacity
                style={styles.presetBtn}
                onPress={() => {
                  setNameInput('寶寶');
                  setTitleInput('女友');
                }}
              >
                <Text style={styles.presetBtnText}>預設：女友 寶寶</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetBtn}
                onPress={() => {
                  setNameInput('主人');
                  setTitleInput('小女僕');
                }}
              >
                <Text style={styles.presetBtnText}>女僕 主人</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.testBtn}
                onPress={() => {
                  girlfriendCompanion.triggerEvent('praise');
                  setConfigModalVisible(false);
                }}
              >
                <Text style={styles.testBtnText}>測試觸發讚美</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
                <Text style={styles.saveBtnText}>保存設定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
  },
  toastCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(236, 72, 153, 0.35)',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  blurBackground: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toastTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companionName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F472B6',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  settingsIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 19,
    marginVertical: 2,
  },
  tapHint: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: THEME.colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  presetBtnText: {
    fontSize: 11,
    color: '#F472B6',
    fontWeight: '700',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  testBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  testBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#EC4899',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
