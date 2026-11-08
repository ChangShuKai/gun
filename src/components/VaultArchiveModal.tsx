import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import {
  VaultModulesConfig,
  VaultManifest,
  VaultPayload,
  VaultRestoreSummary,
} from '../types';
import { vaultArchiveService } from '../services/vaultArchiveService';
import { useApp } from '../context/AppContext';

interface VaultArchiveModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = 'export' | 'import';

export const VaultArchiveModal: React.FC<VaultArchiveModalProps> = ({ visible, onClose }) => {
  const { refreshRecords } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('export');

  // Export State
  const [exportPassword, setExportPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [exportModules, setExportModules] = useState<VaultModulesConfig>({
    settings: true,
    daily_checkin: true,
    snapshots: true,
    highlights: false, // Large files opt-in
    logs: true,
  });
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessInfo, setExportSuccessInfo] = useState<{
    filePath: string;
    manifest: VaultManifest;
  } | null>(null);

  // Import State
  const [pickedFileUri, setPickedFileUri] = useState<string | null>(null);
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);
  const [importPassword, setImportPassword] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [decryptedPayload, setDecryptedPayload] = useState<VaultPayload | null>(null);
  const [restoreSelection, setRestoreSelection] = useState<VaultModulesConfig>({
    settings: true,
    daily_checkin: true,
    snapshots: true,
    highlights: true,
    logs: true,
  });
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreSummary, setRestoreSummary] = useState<VaultRestoreSummary | null>(null);

  // Reset modal state
  const handleReset = () => {
    setExportPassword('');
    setConfirmPassword('');
    setExportSuccessInfo(null);
    setPickedFileUri(null);
    setPickedFileName(null);
    setImportPassword('');
    setDecryptedPayload(null);
    setRestoreSummary(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Toggle export module
  const toggleExportModule = (key: keyof VaultModulesConfig) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setExportModules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle restore module
  const toggleRestoreModule = (key: keyof VaultModulesConfig) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setRestoreSelection((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Execute Export
  const handleExecuteExport = async () => {
    if (!exportPassword || exportPassword.length < 6) {
      Alert.alert('密碼要求', '主密碼長度至少需要 6 個字元以上');
      return;
    }
    if (exportPassword !== confirmPassword) {
      Alert.alert('密碼不一致', '兩次輸入的密碼不相同，請重新確認');
      return;
    }

    const hasAnyModule = Object.values(exportModules).some(Boolean);
    if (!hasAnyModule) {
      Alert.alert('請選擇模組', '至少需要勾選一個要打包匯出的模組');
      return;
    }

    setIsExporting(true);
    setExportSuccessInfo(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const result = await vaultArchiveService.exportVault(exportPassword, exportModules);
      setExportSuccessInfo({
        filePath: result.vaultFilePath,
        manifest: result.manifest,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '匯出失敗';
      Alert.alert('匯出失敗', msg);
    } finally {
      setIsExporting(false);
    }
  };

  // Share exported file
  const handleShareVault = async () => {
    if (!exportSuccessInfo) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await vaultArchiveService.shareVaultFile(exportSuccessInfo.filePath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '分享失敗';
      Alert.alert('分享失敗', msg);
    }
  };

  // Pick .vault file
  const handlePickDocument = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setPickedFileUri(asset.uri);
        setPickedFileName(asset.name);
        setDecryptedPayload(null);
        setRestoreSummary(null);
      }
    } catch (err) {
      console.warn('[DocumentPicker] Error picking vault:', err);
    }
  };

  // Decrypt & Inspect Container
  const handleInspectVault = async () => {
    if (!pickedFileUri) {
      Alert.alert('未選取檔案', '請先選取本機中的 .vault 加密容器檔案');
      return;
    }
    if (!importPassword) {
      Alert.alert('請輸入密碼', '請輸入該封包設定的主還原密碼');
      return;
    }

    setIsDecrypting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const payload = await vaultArchiveService.inspectVaultFile(
        pickedFileUri,
        importPassword
      );
      setDecryptedPayload(payload);

      // Pre-select only modules that exist in manifest
      setRestoreSelection({
        settings: payload.manifest.modules_included.settings,
        daily_checkin: payload.manifest.modules_included.daily_checkin,
        snapshots: payload.manifest.modules_included.snapshots,
        highlights: payload.manifest.modules_included.highlights,
        logs: payload.manifest.modules_included.logs,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '解密失敗';
      Alert.alert('解密驗證失敗', msg);
    } finally {
      setIsDecrypting(false);
    }
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!decryptedPayload) return;

    Alert.alert(
      '確認模組化還原',
      '即將將所選模組寫入私有沙盒。是否確認還原？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確認還原',
          style: 'default',
          onPress: async () => {
            setIsRestoring(true);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
              const summary = await vaultArchiveService.restoreVault(
                decryptedPayload,
                restoreSelection
              );
              setRestoreSummary(summary);
              await refreshRecords();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
                () => {}
              );
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : '還原失敗';
              Alert.alert('還原失敗', msg);
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color={THEME.colors.text} />
          </TouchableOpacity>

          <View style={styles.titleColumn}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="shield-key" size={18} color="#3B82F6" />
              <Text style={styles.modalTitle}>自定義 AES-256 加密容器</Text>
            </View>
            <Text style={styles.modalSub}>
              PBKDF2 (100k 次) · AES-256-GCM · 防原生解壓縮
            </Text>
          </View>

          <View style={{ width: 34 }} />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'export' && styles.tabItemActive]}
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              setActiveTab('export');
            }}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={16}
              color={activeTab === 'export' ? '#60A5FA' : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'export' && styles.tabTextActive,
              ]}
            >
              封裝匯出 (.vault)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'import' && styles.tabItemActive]}
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              setActiveTab('import');
            }}
          >
            <Ionicons
              name="cloud-download-outline"
              size={16}
              color={activeTab === 'import' ? '#60A5FA' : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'import' && styles.tabTextActive,
              ]}
            >
              解密還原 (Restore)
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === 'export' ? (
            /* ================= EXPORT TAB ================= */
            <View style={styles.sectionCard}>
              <View style={styles.securityBanner}>
                <Ionicons name="lock-closed" size={18} color="#10B981" />
                <View style={styles.securityTextBox}>
                  <Text style={styles.securityTitle}>非標準二進位封裝防護</Text>
                  <Text style={styles.securityDesc}>
                    產出之 .vault 檔非標準 PKZip，Windows 與原生解壓工具無法查看內容。
                    僅能以本 App 輸入正確主密碼通過 Auth Tag 驗證後還原。
                  </Text>
                </View>
              </View>

              {/* Module Checklist */}
              <Text style={styles.fieldSectionLabel}>選擇打包模組 (Modular Packaging)</Text>
              <View style={styles.moduleList}>
                <TouchableOpacity
                  style={styles.moduleItem}
                  onPress={() => toggleExportModule('settings')}
                  activeOpacity={0.7}
                >
                  <View style={styles.moduleLeft}>
                    <Ionicons name="settings" size={18} color="#94A3B8" />
                    <View>
                      <Text style={styles.moduleName}>基本資料與偏好設定</Text>
                      <Text style={styles.moduleSub}>包含使用者長度、暱稱與外流模式偏好</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={exportModules.settings ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={exportModules.settings ? '#3B82F6' : THEME.colors.textMuted}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.moduleItem}
                  onPress={() => toggleExportModule('daily_checkin')}
                  activeOpacity={0.7}
                >
                  <View style={styles.moduleLeft}>
                    <Ionicons name="camera" size={18} color="#A855F7" />
                    <View>
                      <Text style={styles.moduleName}>每日生理打卡私密照</Text>
                      <Text style={styles.moduleSub}>沙盒內尺寸、樣式與今日最色照片</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={exportModules.daily_checkin ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={exportModules.daily_checkin ? '#3B82F6' : THEME.colors.textMuted}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.moduleItem}
                  onPress={() => toggleExportModule('snapshots')}
                  activeOpacity={0.7}
                >
                  <View style={styles.moduleLeft}>
                    <MaterialCommunityIcons name="camera-timer" size={18} color="#F59E0B" />
                    <View>
                      <Text style={styles.moduleName}>訓練時序快照</Text>
                      <Text style={styles.moduleSub}>錄影即時抓拍之定格照片與 EHS 評分標籤</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={exportModules.snapshots ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={exportModules.snapshots ? '#3B82F6' : THEME.colors.textMuted}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.moduleItem}
                  onPress={() => toggleExportModule('highlights')}
                  activeOpacity={0.7}
                >
                  <View style={styles.moduleLeft}>
                    <Ionicons name="videocam" size={18} color="#EF4444" />
                    <View>
                      <Text style={styles.moduleName}>深度訓練錄影片段</Text>
                      <Text style={styles.moduleSub}>本機沙盒錄影視訊檔 (檔案較大，選填)</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={exportModules.highlights ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={exportModules.highlights ? '#3B82F6' : THEME.colors.textMuted}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.moduleItem}
                  onPress={() => toggleExportModule('logs')}
                  activeOpacity={0.7}
                >
                  <View style={styles.moduleLeft}>
                    <MaterialCommunityIcons name="notebook-outline" size={18} color="#10B981" />
                    <View>
                      <Text style={styles.moduleName}>習慣訓練紀錄日誌</Text>
                      <Text style={styles.moduleSub}>時間軸時長、波形分佈與挑戰成績清單</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={exportModules.logs ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={exportModules.logs ? '#3B82F6' : THEME.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Password Setting */}
              <Text style={styles.fieldSectionLabel}>容器加密金鑰 (Master Password)</Text>
              <View style={styles.inputBox}>
                <Ionicons name="key-outline" size={18} color={THEME.colors.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="請輸入主密碼 (至少 6 位字元)"
                  placeholderTextColor={THEME.colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={exportPassword}
                  onChangeText={setExportPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={THEME.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color={THEME.colors.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="再次確認主密碼"
                  placeholderTextColor={THEME.colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[styles.primaryActionBtn, isExporting && styles.btnDisabled]}
                onPress={handleExecuteExport}
                disabled={isExporting}
                activeOpacity={0.8}
              >
                {isExporting ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryActionBtnText}>
                      PBKDF2 密鑰衍生中 (100k 次疊代)...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.primaryActionBtnText}>
                    ⚡ 生成並加密導出容器 (.vault)
                  </Text>
                )}
              </TouchableOpacity>

              {/* Success Card */}
              {exportSuccessInfo && (
                <View style={styles.exportSuccessCard}>
                  <View style={styles.successTitleRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.successTitle}>加密容器封裝成功！</Text>
                  </View>
                  <Text style={styles.successDetail}>
                    包含 {exportSuccessInfo.manifest.file_count} 個項目 · 格式：AES-256-GCM
                  </Text>
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={handleShareVault}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.shareBtnText}>分享 / 存檔至系統檔案 (.vault)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            /* ================= IMPORT TAB ================= */
            <View style={styles.sectionCard}>
              <View style={styles.securityBanner}>
                <MaterialCommunityIcons name="file-lock-outline" size={20} color="#3B82F6" />
                <View style={styles.securityTextBox}>
                  <Text style={styles.securityTitle}>容器解密與還原</Text>
                  <Text style={styles.securityDesc}>
                    選取其他設備或先前備份之 .vault 檔案，輸入當初設定之主密碼即可通過 GCM
                    驗證並還原沙盒。
                  </Text>
                </View>
              </View>

              {/* Step 1: Pick File */}
              <Text style={styles.fieldSectionLabel}>步驟 1：選取 .vault 備份檔案</Text>
              <TouchableOpacity
                style={styles.filePickerBtn}
                onPress={handlePickDocument}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={22} color="#60A5FA" />
                <View style={styles.filePickerTextBox}>
                  <Text style={styles.filePickerTitle}>
                    {pickedFileName || '點擊選取本機中的 .vault 檔案'}
                  </Text>
                  <Text style={styles.filePickerSub}>
                    {pickedFileUri ? '檔案已成功載入沙盒快取' : '支援自定義格式容器'}
                  </Text>
                </View>
                <Ionicons name="folder-open-outline" size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>

              {/* Step 2: Enter Password */}
              <Text style={styles.fieldSectionLabel}>步驟 2：輸入解密主密碼</Text>
              <View style={styles.inputBox}>
                <Ionicons name="key-outline" size={18} color={THEME.colors.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="輸入該封包設定的主密碼"
                  placeholderTextColor={THEME.colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={importPassword}
                  onChangeText={setImportPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={THEME.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.inspectBtn, isDecrypting && styles.btnDisabled]}
                onPress={handleInspectVault}
                disabled={isDecrypting}
                activeOpacity={0.8}
              >
                {isDecrypting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.inspectBtnText}>
                    🔓 驗證密碼並解析封包清單 (Manifest)
                  </Text>
                )}
              </TouchableOpacity>

              {/* Step 3: Decrypted Manifest Preview & Module Selection */}
              {decryptedPayload && (
                <View style={styles.manifestCard}>
                  <View style={styles.manifestHeader}>
                    <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                    <Text style={styles.manifestTitle}>Auth Tag 認證通過 · 封包內容</Text>
                  </View>

                  <View style={styles.manifestMetricsRow}>
                    <View style={styles.manifestMetricItem}>
                      <Text style={styles.manifestMetricLabel}>匯出時間</Text>
                      <Text style={styles.manifestMetricVal}>
                        {new Date(
                          decryptedPayload.manifest.exported_at
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.manifestMetricItem}>
                      <Text style={styles.manifestMetricLabel}>版本</Text>
                      <Text style={styles.manifestMetricVal}>
                        v{decryptedPayload.manifest.app_version}
                      </Text>
                    </View>
                    <View style={styles.manifestMetricItem}>
                      <Text style={styles.manifestMetricLabel}>封裝項目數</Text>
                      <Text style={[styles.manifestMetricVal, { color: '#60A5FA' }]}>
                        {decryptedPayload.manifest.file_count} 個
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.restoreSelectionTitle}>請勾選欲還原之模組：</Text>
                  <View style={styles.restoreCheckList}>
                    {decryptedPayload.manifest.modules_included.settings && (
                      <TouchableOpacity
                        style={styles.restoreCheckItem}
                        onPress={() => toggleRestoreModule('settings')}
                      >
                        <Ionicons
                          name={restoreSelection.settings ? 'checkbox' : 'square-outline'}
                          size={20}
                          color="#3B82F6"
                        />
                        <Text style={styles.restoreCheckText}>基本資料與偏好設定</Text>
                      </TouchableOpacity>
                    )}

                    {decryptedPayload.manifest.modules_included.daily_checkin && (
                      <TouchableOpacity
                        style={styles.restoreCheckItem}
                        onPress={() => toggleRestoreModule('daily_checkin')}
                      >
                        <Ionicons
                          name={restoreSelection.daily_checkin ? 'checkbox' : 'square-outline'}
                          size={20}
                          color="#3B82F6"
                        />
                        <Text style={styles.restoreCheckText}>每日生理打卡私密照</Text>
                      </TouchableOpacity>
                    )}

                    {decryptedPayload.manifest.modules_included.snapshots && (
                      <TouchableOpacity
                        style={styles.restoreCheckItem}
                        onPress={() => toggleRestoreModule('snapshots')}
                      >
                        <Ionicons
                          name={restoreSelection.snapshots ? 'checkbox' : 'square-outline'}
                          size={20}
                          color="#3B82F6"
                        />
                        <Text style={styles.restoreCheckText}>訓練時序快照</Text>
                      </TouchableOpacity>
                    )}

                    {decryptedPayload.manifest.modules_included.highlights && (
                      <TouchableOpacity
                        style={styles.restoreCheckItem}
                        onPress={() => toggleRestoreModule('highlights')}
                      >
                        <Ionicons
                          name={restoreSelection.highlights ? 'checkbox' : 'square-outline'}
                          size={20}
                          color="#3B82F6"
                        />
                        <Text style={styles.restoreCheckText}>深度訓練影像</Text>
                      </TouchableOpacity>
                    )}

                    {decryptedPayload.manifest.modules_included.logs && (
                      <TouchableOpacity
                        style={styles.restoreCheckItem}
                        onPress={() => toggleRestoreModule('logs')}
                      >
                        <Ionicons
                          name={restoreSelection.logs ? 'checkbox' : 'square-outline'}
                          size={20}
                          color="#3B82F6"
                        />
                        <Text style={styles.restoreCheckText}>訓練紀錄日誌 (自動合併)</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryActionBtn, isRestoring && styles.btnDisabled]}
                    onPress={handleExecuteRestore}
                    disabled={isRestoring}
                    activeOpacity={0.8}
                  >
                    {isRestoring ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryActionBtnText}>
                        🚀 確認寫入並還原所選模組
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Restore Summary Report */}
              {restoreSummary && (
                <View style={styles.exportSuccessCard}>
                  <View style={styles.successTitleRow}>
                    <Ionicons name="checkmark-done-circle" size={20} color="#10B981" />
                    <Text style={styles.successTitle}>模組還原完成！</Text>
                  </View>
                  <Text style={styles.successDetail}>
                    共還原 {restoreSummary.restoredFilesCount} 個檔案/項目
                  </Text>
                  <View style={styles.summaryTagsRow}>
                    {restoreSummary.restoredModules.map((m, idx) => (
                      <View key={`mod_${idx}`} style={styles.summaryTag}>
                        <Text style={styles.summaryTagText}>{m}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  modalSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  tabItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: '#60A5FA',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  securityTextBox: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  securityDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
    lineHeight: 16,
  },
  fieldSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 8,
    marginTop: 6,
  },
  moduleList: {
    backgroundColor: '#131B2E',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  moduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  moduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  moduleName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  moduleSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131B2E',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.text,
    marginLeft: 8,
  },
  primaryActionBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportSuccessCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  successTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
  },
  successDetail: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 4,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  filePickerTextBox: {
    flex: 1,
    marginLeft: 10,
  },
  filePickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  filePickerSub: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  inspectBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  inspectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA',
  },
  manifestCard: {
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 4,
  },
  manifestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  manifestTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
  },
  manifestMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  manifestMetricItem: {
    alignItems: 'center',
  },
  manifestMetricLabel: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
  manifestMetricVal: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 2,
  },
  restoreSelectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 8,
  },
  restoreCheckList: {
    gap: 6,
    marginBottom: 8,
  },
  restoreCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  restoreCheckText: {
    fontSize: 12,
    color: THEME.colors.text,
  },
  summaryTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  summaryTag: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  summaryTagText: {
    fontSize: 10,
    color: '#60A5FA',
  },
});
