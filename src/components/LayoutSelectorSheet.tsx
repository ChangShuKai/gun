import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { LayoutMode } from '../types';

interface LayoutSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectLayout: (mode: LayoutMode) => void;
}

export const LayoutSelectorSheet: React.FC<LayoutSelectorSheetProps> = ({
  visible,
  onClose,
  onSelectLayout,
}) => {
  const handleSelect = async (mode: LayoutMode) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onSelectLayout(mode);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>選擇本次體驗佈局</Text>
          <Text style={styles.sheetSubtitle}>
            依據個人偏好選擇全螢幕專注或動態雙視窗組合
          </Text>

          <View style={styles.optionsList}>
            {/* Option 1: Fullscreen Timer */}
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.8}
              onPress={() => handleSelect('fullscreen_timer')}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="timer-outline" size={28} color={THEME.colors.primaryLight} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>全螢幕計時器</Text>
                <Text style={styles.optionDesc}>
                  沉浸式極簡大字體計時，專注於身心節奏與放鬆
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>

            {/* Option 2: Split-View Widgets */}
            <TouchableOpacity
              style={[styles.optionCard, styles.recommendedCard]}
              activeOpacity={0.8}
              onPress={() => handleSelect('split_view')}
            >
              <View style={[styles.iconCircle, styles.purpleCircle]}>
                <Feather name="columns" size={26} color="#A78BFA" />
              </View>
              <View style={styles.optionInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.optionTitle}>上下分割視窗</Text>
                  <View style={styles.recBadge}>
                    <Text style={styles.recBadgeText}>推薦</Text>
                  </View>
                </View>
                <Text style={styles.optionDesc}>
                  可拖曳調整比例，自由配置計時器、本地相片與即時相機
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>取消</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsList: {
    gap: 14,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: THEME.radius.lg,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    gap: 14,
  },
  recommendedCard: {
    borderColor: 'rgba(139, 92, 246, 0.45)',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  purpleCircle: {
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
  },
  optionInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  recBadge: {
    backgroundColor: THEME.colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  optionDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  cancelBtn: {
    height: 48,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
});
