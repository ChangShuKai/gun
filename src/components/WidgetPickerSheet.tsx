import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { WidgetType } from '../types';

interface WidgetPickerSheetProps {
  visible: boolean;
  targetPane: 'top' | 'bottom' | null;
  onClose: () => void;
  onSelectWidget: (widget: WidgetType) => void;
}

export const WidgetPickerSheet: React.FC<WidgetPickerSheetProps> = ({
  visible,
  targetPane,
  onClose,
  onSelectWidget,
}) => {
  const handleSelect = async (type: WidgetType) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onSelectWidget(type);
  };

  const paneLabel = targetPane === 'top' ? '上視窗' : '下視窗';

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

          <Text style={styles.sheetTitle}>配置 {paneLabel} 小部件</Text>
          <Text style={styles.sheetSubtitle}>請選擇要在此區塊呈現的工具或素材</Text>

          <View style={styles.list}>
            {/* Widget 1: Timer */}
            <TouchableOpacity
              style={styles.itemCard}
              activeOpacity={0.8}
              onPress={() => handleSelect('timer')}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="timer-outline" size={26} color={THEME.colors.primaryLight} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>計時器</Text>
                <Text style={styles.itemSub}>大字體動態即時碼表，支援暫停與重置</Text>
              </View>
              <Feather name="plus-circle" size={20} color={THEME.colors.primaryLight} />
            </TouchableOpacity>

            {/* Widget 2: Photo */}
            <TouchableOpacity
              style={styles.itemCard}
              activeOpacity={0.8}
              onPress={() => handleSelect('photo')}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="image-outline" size={26} color={THEME.colors.success} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>本地相片</Text>
                <Text style={styles.itemSub}>讀取 DocumentDirectory 私有隔離沙盒圖片</Text>
              </View>
              <Feather name="plus-circle" size={20} color={THEME.colors.success} />
            </TouchableOpacity>

            {/* Widget 3: Camera */}
            <TouchableOpacity
              style={styles.itemCard}
              activeOpacity={0.8}
              onPress={() => handleSelect('camera')}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Ionicons name="camera-outline" size={26} color={THEME.colors.accent} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>即時相機</Text>
                <Text style={styles.itemSub}>啟用前/後置鏡頭預覽，支援鏡頭切換與時序快照</Text>
              </View>
              <Feather name="plus-circle" size={20} color={THEME.colors.accent} />
            </TouchableOpacity>

            {/* Widget 4: Self Carousel (看看自己) */}
            <TouchableOpacity
              style={styles.itemCard}
              activeOpacity={0.8}
              onPress={() => handleSelect('self_carousel')}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                <Ionicons name="sparkles-outline" size={26} color="#F472B6" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>看看自己 (私密輪播)</Text>
                <Text style={styles.itemSub}>
                  自動輪播每日打卡照與歷史高光快照，支援手勢縮放與隱私模糊
                </Text>
              </View>
              <Feather name="plus-circle" size={20} color="#F472B6" />
            </TouchableOpacity>

            {/* Widget 5: Anatomy Massage (周邊深層按摩) */}
            <TouchableOpacity
              style={styles.itemCard}
              activeOpacity={0.8}
              onPress={() => handleSelect('massage')}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <MaterialCommunityIcons name="hand-heart-outline" size={26} color="#10B981" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>周邊深層按摩</Text>
                <Text style={styles.itemSub}>
                  會陰深層揉壓、根部韌帶撥動與提睪肌輕托，40 BPM 舒緩微震
                </Text>
              </View>
              <Feather name="plus-circle" size={20} color="#10B981" />
            </TouchableOpacity>

            {/* Widget 6: Sensory Tickle (微神經搔癢指引) */}
            <TouchableOpacity
              style={styles.itemCard}
              activeOpacity={0.8}
              onPress={() => handleSelect('tickle')}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(244, 114, 182, 0.15)' }]}>
                <MaterialCommunityIcons name="feather" size={26} color="#F472B6" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>微神經羽毛搔癢</Text>
                <Text style={styles.itemSub}>
                  激發淺層 C-Tactile 神經，冠狀溝羽毛拂過、繫帶微震與伴侶呢喃
                </Text>
              </View>
              <Feather name="plus-circle" size={20} color="#F472B6" />
            </TouchableOpacity>

            {/* Widget 7: Stretching Routine (3D 延展牽引課表) */}
            <TouchableOpacity
              style={styles.itemCard}
              activeOpacity={0.8}
              onPress={() => handleSelect('stretch')}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
                <MaterialCommunityIcons name="arrow-expand-all" size={26} color="#60A5FA" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>3D 延展牽引課表</Text>
                <Text style={styles.itemSub}>
                  前向/兩側懸韌帶延展、O型環牽引教學，15s/5s 律動與 5 分鐘保護防線
                </Text>
              </View>
              <Feather name="plus-circle" size={20} color="#60A5FA" />
            </TouchableOpacity>

            {/* Widget 8: Kegel Trainer (PC 肌 3D 阻抗訓練) */}
            <TouchableOpacity
              style={styles.itemCard}
              activeOpacity={0.8}
              onPress={() => handleSelect('kegel')}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <MaterialCommunityIcons name="lightning-bolt" size={26} color="#38BDF8" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>PC 肌 3D 阻抗訓練</Text>
                <Text style={styles.itemSub}>
                  骨盆底矢狀剖面、爆發快縮與耐力深鎖雙節奏、閉眼觸覺脈衝引導
                </Text>
              </View>
              <Feather name="plus-circle" size={20} color="#38BDF8" />
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
    fontSize: 19,
    fontWeight: '800',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  list: {
    gap: 12,
    marginBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: THEME.radius.lg,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  cancelBtn: {
    height: 46,
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
