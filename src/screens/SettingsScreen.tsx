import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { useUserProfile } from '../services/userProfile';
import { useApp } from '../context/AppContext';
import { VaultArchiveModal } from '../components/VaultArchiveModal';
import { WishlistModal } from '../components/WishlistModal';
import { MedicalKnowledgeScreen } from './MedicalKnowledgeScreen';

interface SettingsScreenProps {
  visible?: boolean;
  onClose?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  visible = true,
  onClose,
}) => {
  const { profile, updateProfile } = useUserProfile();
  const { settings, updateSettings } = useApp();

  const [gender, setGender] = useState<'male' | 'female' | 'other'>(profile.gender);
  const [userName, setUserName] = useState<string>(profile.userName);
  const [partnerName, setPartnerName] = useState<string>(profile.partnerName);
  const [userLength, setUserLength] = useState<string>(profile.userLength);

  const [biometrics, setBiometrics] = useState<boolean>(settings.biometricsEnabled);
  const [blurOnBg, setBlurOnBg] = useState<boolean>(settings.blurOnBackground);
  const [stealthRec, setStealthRec] = useState<boolean>(settings.stealthRecordingDefault);

  const [vaultModalVisible, setVaultModalVisible] = useState<boolean>(false);
  const [wishlistModalVisible, setWishlistModalVisible] = useState<boolean>(false);
  const [medicalModalVisible, setMedicalModalVisible] = useState<boolean>(false);

  const handleModalShow = () => {
    setGender(profile.gender);
    setUserName(profile.userName);
    setPartnerName(profile.partnerName);
    setUserLength(profile.userLength);
    setBiometrics(settings.biometricsEnabled);
    setBlurOnBg(settings.blurOnBackground);
    setStealthRec(settings.stealthRecordingDefault);
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        gender,
        userName: userName.trim() || '頂流男神',
        partnerName: partnerName.trim() || '寶寶',
        userLength: userLength.trim() || '16.5',
      });

      await updateSettings({
        biometricsEnabled: biometrics,
        blurOnBackground: blurOnBg,
        stealthRecordingDefault: stealthRec,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('設定已儲存', '個人檔案與全域安全配置已成功更新！');
      if (onClose) onClose();
    } catch {
      Alert.alert('儲存失敗', '請重試');
    }
  };

  const content = (
    <View style={styles.sheetContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="person-circle" size={24} color={THEME.colors.primaryLight} />
          </View>
          <View>
            <Text style={styles.title}>個人檔案與全局設定</Text>
            <Text style={styles.subtitle}>自訂身分、伴侶稱謂與隱私防護參數</Text>
          </View>
        </View>
        {onClose && (
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="card-account-details-outline" size={18} color="#38BDF8" />
            <Text style={styles.sectionHeaderTitle}>基本資料設定 (VCR 新聞連動)</Text>
          </View>

          {/* Gender */}
          <Text style={styles.inputLabel}>生理性別：</Text>
          <View style={styles.genderRow}>
            {[
              { key: 'male', label: '男性 ♂' },
              { key: 'female', label: '女性 ♀' },
              { key: 'other', label: '其他 ⚧' },
            ].map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[
                  styles.genderBtn,
                  gender === g.key && styles.genderBtnActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setGender(g.key as any);
                }}
              >
                <Text
                  style={[
                    styles.genderBtnText,
                    gender === g.key && styles.genderBtnTextActive,
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* User Name */}
          <Text style={styles.inputLabel}>你的名稱（外流新聞頭條標題）：</Text>
          <TextInput
            style={styles.input}
            value={userName}
            onChangeText={setUserName}
            placeholder="例如：頂流男神、周董、阿豪"
            placeholderTextColor={THEME.colors.textMuted}
          />

          {/* Partner Name */}
          <Text style={styles.inputLabel}>伴侶 / 虛擬女友名稱：</Text>
          <TextInput
            style={styles.input}
            value={partnerName}
            onChangeText={setPartnerName}
            placeholder="例如：寶寶、昆凌、心怡"
            placeholderTextColor={THEME.colors.textMuted}
          />

          {/* User Length */}
          <Text style={styles.inputLabel}>你的長度 (公分 cm)：</Text>
          <View style={styles.lengthInputRow}>
            <TextInput
              style={[styles.input, styles.lengthInput]}
              value={userLength}
              onChangeText={setUserLength}
              placeholder="16.5"
              placeholderTextColor={THEME.colors.textMuted}
              keyboardType="decimal-pad"
            />
            <View style={styles.lengthUnitBadge}>
              <Text style={styles.lengthUnitText}>公分 (cm)</Text>
            </View>
          </View>
          <Text style={styles.inputHint}>
            💡 此長度將即時寫入八卦外流頭條新聞導言內文中！
          </Text>
        </View>

        {/* Security Settings Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
            <Text style={styles.sectionHeaderTitle}>系統防護與沙盒隱私</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchLabel}>Face ID / 生物解鎖保護</Text>
              <Text style={styles.switchSub}>解鎖分析頁與機密快照時必須驗證</Text>
            </View>
            <Switch
              value={biometrics}
              onValueChange={setBiometrics}
              trackColor={{ false: '#334155', true: THEME.colors.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchLabel}>切出 App 背景全域模糊</Text>
              <Text style={styles.switchSub}>多工切換器畫面自動上鎖遮罩</Text>
            </View>
            <Switch
              value={blurOnBg}
              onValueChange={setBlurOnBg}
              trackColor={{ false: '#334155', true: THEME.colors.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchLabel}>預設啟動背景錄影</Text>
              <Text style={styles.switchSub}>進入體驗頁自動展開沙盒錄製</Text>
            </View>
            <Switch
              value={stealthRec}
              onValueChange={setStealthRec}
              trackColor={{ false: '#334155', true: THEME.colors.primary }}
            />
          </View>
        </View>

        {/* Encrypted Vault Backup & Restore Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="shield-key" size={16} color="#3B82F6" />
            <Text style={styles.sectionHeaderTitle}>自定義 AES-256 加密容器備份</Text>
          </View>

          <TouchableOpacity
            style={styles.vaultArchiveBtn}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setVaultModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.vaultBtnLeft}>
              <View style={styles.vaultIconCircle}>
                <Ionicons name="archive-outline" size={20} color="#60A5FA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vaultBtnTitle}>跨設備模組化匯出 / 還原 (.vault)</Text>
                <Text style={styles.vaultBtnSub}>100k 次 PBKDF2 密鑰 · 防原生解壓檢視</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section: 評鑑團願望清單與泌尿醫學知識庫 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="book-open-page-variant" size={16} color="#38BDF8" />
            <Text style={styles.sectionHeaderTitle}>專屬成就與醫學百科</Text>
          </View>

          {/* Wishlist Entry */}
          <TouchableOpacity
            style={[styles.vaultArchiveBtn, { marginBottom: 10 }]}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setWishlistModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.vaultBtnLeft}>
              <View style={[styles.vaultIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="trophy-outline" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vaultBtnTitle}>評鑑團成員願望清單</Text>
                <Text style={styles.vaultBtnSub}>角色自律目標 · 專屬手寫賀卡 · 限定 3D 材質</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          {/* Medical Almanac Entry */}
          <TouchableOpacity
            style={styles.vaultArchiveBtn}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setMedicalModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.vaultBtnLeft}>
              <View style={[styles.vaultIconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <MaterialCommunityIcons name="medical-bag" size={20} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vaultBtnTitle}>男性泌尿專科醫學科普庫</Text>
                <Text style={styles.vaultBtnSub}>白膜解剖學 · 伸縮比 · 控射反射弧 · 避坑指南</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>儲存所有設定</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Vault Archive Modal */}
      <VaultArchiveModal
        visible={vaultModalVisible}
        onClose={() => setVaultModalVisible(false)}
      />

      {/* Wishlist Modal */}
      <WishlistModal
        visible={wishlistModalVisible}
        onClose={() => setWishlistModalVisible(false)}
      />

      {/* Medical Knowledge Screen */}
      <MedicalKnowledgeScreen
        visible={medicalModalVisible}
        onClose={() => setMedicalModalVisible(false)}
      />
    </View>
  );

  if (onClose) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        onShow={handleModalShow}
      >
        <View style={styles.backdrop}>{content}</View>
      </Modal>
    );
  }

  return <View style={styles.standaloneContainer}>{content}</View>;
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  standaloneContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  sheetContainer: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 6,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderColor: THEME.colors.primaryLight,
  },
  genderBtnText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  genderBtnTextActive: {
    color: THEME.colors.primaryLight,
    fontWeight: '800',
  },
  lengthInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lengthInput: {
    flex: 1,
    marginBottom: 0,
  },
  lengthUnitBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  lengthUnitText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primaryLight,
  },
  inputHint: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  switchTextGroup: {
    flex: 1,
    paddingRight: 10,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  switchSub: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  vaultArchiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginTop: 4,
  },
  vaultBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  vaultIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaultBtnTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  vaultBtnSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
