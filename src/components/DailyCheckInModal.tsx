import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { DailyCheckInType, DailyCheckInItem, EHSLevel, EnvironmentTag, PhysiologicalBiasResult } from '../types';
import { ehsService, EHS_LEVEL_METADATA } from '../services/ehsService';
import { panelDramaService } from '../services/panelDramaService';
import {
  saveDailyCheckInPhoto,
  listDailyCheckInPhotos,
} from '../services/mediaStorage';
import { GroomingStylistModal, GroomingStyleItem } from './GroomingStylistModal';
import { VirtualReviewPanelModal } from './VirtualReviewPanelModal';
import { UnderwearWardrobeModal } from './UnderwearWardrobeModal';
import { danmakuService } from '../services/danmakuService';
import { environmentContextService } from '../services/environmentContextService';
import { EnvironmentalLogModal } from './EnvironmentalLogModal';

interface DailyCheckInModalProps {
  visible: boolean;
  onClose: () => void;
  onCheckInCompleted?: (item: DailyCheckInItem) => void;
}

const PRAISE_QUOTES = [
  '🔥 哇好大...太頂了！',
  '💎 今天的形狀與緊緻度完全是極品！',
  '⚡ 太性感了...光看照片就讓人受不了！',
  '👑 今日最色封神！完美的充血膨脹狀態！',
  '🔥 血管青筋跟飽滿度簡直是天菜級別！',
  '✨ 雄性荷爾蒙完全爆棚...真的是極品身材！',
];

export const DailyCheckInModal: React.FC<DailyCheckInModalProps> = ({
  visible,
  onClose,
  onCheckInCompleted,
}) => {
  const [selectedType, setSelectedType] = useState<DailyCheckInType>('most_erotic_of_the_day');
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [checkInEhsLevel, setCheckInEhsLevel] = useState<EHSLevel>(4);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Praise banner modal state
  const [praiseText, setPraiseText] = useState<string>('');
  const [showPraiseBanner, setShowPraiseBanner] = useState<boolean>(false);

  // History list state
  const [historyItems, setHistoryItems] = useState<DailyCheckInItem[]>([]);
  const [isHistoryBlurred, setIsHistoryBlurred] = useState<boolean>(true);

  // Grooming Stylist Modal state
  const [groomingStylistVisible, setGroomingStylistVisible] = useState<boolean>(false);
  const [currentGroomingStyle, setCurrentGroomingStyle] = useState<GroomingStyleItem | null>(null);

  // Virtual Review Panel state
  const [virtualReviewVisible, setVirtualReviewVisible] = useState<boolean>(false);
  const [virtualReviewPhotoUri, setVirtualReviewPhotoUri] = useState<string | null>(null);

  // Underwear Wardrobe Modal state
  const [underwearModalVisible, setUnderwearModalVisible] = useState<boolean>(false);

  // Environmental Context state
  const [envModalVisible, setEnvModalVisible] = useState<boolean>(false);
  const [selectedEnvTags, setSelectedEnvTags] = useState<EnvironmentTag[]>([]);
  const [envBiasResult, setEnvBiasResult] = useState<PhysiologicalBiasResult | null>(null);

  const cameraRef = useRef<CameraView>(null);

  const todayStr = (() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();

  const loadHistory = async () => {
    const list = await listDailyCheckInPhotos();
    setHistoryItems(list);
  };

  useEffect(() => {
    void listDailyCheckInPhotos().then(setHistoryItems);
  }, []);

  const handleModalShow = () => {
    void loadHistory();
    setCapturedUri(null);
    setIsCameraActive(false);
    setShowPraiseBanner(false);
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: true,
      });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setIsCameraActive(false);
      }
    } catch {
      Alert.alert('拍攝失敗', '無法擷取照片，請確認相機權限');
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedUri(result.assets[0].uri);
        setIsCameraActive(false);
      }
    } catch {
      Alert.alert('無法選取圖片', '請檢查相簿讀取權限');
    }
  };

  const handleConfirmSave = async () => {
    if (!capturedUri) return;
    setIsSaving(true);
    try {
      const savedItem = await saveDailyCheckInPhoto(capturedUri, selectedType, todayStr);
      void danmakuService.addTokens(10, '每日生理打卡獎勵');
      void ehsService.saveRecord({
        date: todayStr,
        timestamp: Date.now(),
        level: checkInEhsLevel,
        notes: `每日生理打卡 (${selectedType})`,
      });
      if (selectedEnvTags.length > 0) {
        void environmentContextService.saveLog(
          selectedEnvTags,
          `每日打卡關聯 (${selectedType})`,
          savedItem.id
        );
      }
      void panelDramaService.triggerPostSessionNote();

      // Trigger strong haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 150);

      // Random praise quote
      const praise = PRAISE_QUOTES[Math.floor(Math.random() * PRAISE_QUOTES.length)];
      setPraiseText(praise);
      setShowPraiseBanner(true);

      setCapturedUri(null);
      await loadHistory();
      if (onCheckInCompleted) {
        onCheckInCompleted(savedItem);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '儲存打卡失敗';
      Alert.alert('儲存失敗', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const checkinCategories: {
    type: DailyCheckInType;
    label: string;
    sub: string;
    icon: string;
    color: string;
  }[] = [
    {
      type: 'most_erotic_of_the_day',
      label: '今日最色精選',
      sub: '全盛充血・最頂定格',
      icon: 'fire',
      color: '#EF4444',
    },
    {
      type: 'size',
      label: '尺寸大小紀錄',
      sub: '長度粗度・時序測量',
      icon: 'ruler-square',
      color: '#3B82F6',
    },
    {
      type: 'testicles',
      label: '睪丸緊緻狀態',
      sub: '囊袋輪廓・收斂反饋',
      icon: 'egg-outline',
      color: '#8B5CF6',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleModalShow}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="calendar-check" size={20} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.title}>每日生理打卡與私密歸檔</Text>
                <Text style={styles.subtitle}>
                  {todayStr}・加密隔離存儲至 /Vault/DailyCheckIn/
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Grooming Stylist Recommendation Banner */}
            <TouchableOpacity
              style={styles.groomingStylistBanner}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setGroomingStylistVisible(true);
              }}
              activeOpacity={0.85}
            >
              <View style={styles.groomingBannerLeft}>
                <View style={styles.groomingIconCircle}>
                  <MaterialCommunityIcons name="content-cut" size={18} color="#60A5FA" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.groomingTitleRow}>
                    <Text style={styles.groomingBannerTitle}>智慧修毛美學與輪廓對齊</Text>
                    <Text style={styles.groomingBadge}>
                      {currentGroomingStyle ? currentGroomingStyle.title : '推薦 Fade 延展'}
                    </Text>
                  </View>
                  <Text style={styles.groomingBannerSub}>
                    4 種修剪方案 · 視覺延伸長度 · AR 虛線尺標對齊
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>

            {/* Underwear Fit Check Banner */}
            <TouchableOpacity
              style={styles.underwearEntryBanner}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setUnderwearModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <View style={styles.groomingBannerLeft}>
                <View style={[styles.groomingIconCircle, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
                  <MaterialCommunityIcons name="tshirt-v-outline" size={18} color="#60A5FA" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.groomingTitleRow}>
                    <Text style={styles.groomingBannerTitle}>每日內褲款式庫與三視角打卡</Text>
                    <Text style={[styles.groomingBadge, { color: '#60A5FA', borderColor: '#3B82F6' }]}>
                      三視角實穿
                    </Text>
                  </View>
                  <Text style={styles.groomingBannerSub}>
                    平鋪 · 正面囊袋 · 側面提臀 · 建立私密衣櫥歷史
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>

            {/* Environmental Context Banner */}
            <TouchableOpacity
              style={[styles.underwearEntryBanner, { borderColor: 'rgba(56, 189, 248, 0.35)', backgroundColor: 'rgba(56, 189, 248, 0.05)' }]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setEnvModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <View style={styles.groomingBannerLeft}>
                <View style={[styles.groomingIconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <MaterialCommunityIcons name="weather-partly-cloudy" size={18} color="#38BDF8" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.groomingTitleRow}>
                    <Text style={styles.groomingBannerTitle}>生理環境情境筆記與客觀校正</Text>
                    <Text style={[styles.groomingBadge, { color: '#38BDF8', borderColor: '#0284C7' }]}>
                      {selectedEnvTags.length > 0 ? `${selectedEnvTags.length} 項標籤` : '情境校正'}
                    </Text>
                  </View>
                  <Text style={styles.groomingBannerSub}>
                    {envBiasResult && selectedEnvTags.length > 0
                      ? envBiasResult.alertTitle
                      : '排除低溫收縮、長途騎乘壓迫、晨間充血客觀偏差'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>

            {/* Category Select Tabs */}
            <Text style={styles.sectionHeader}>1. 選擇今日打卡項目</Text>
            <View style={styles.categoryRow}>
              {checkinCategories.map((cat) => {
                const isSelected = selectedType === cat.type;
                return (
                  <TouchableOpacity
                    key={cat.type}
                    style={[
                      styles.categoryCard,
                      isSelected && { borderColor: cat.color, backgroundColor: `${cat.color}15` },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSelectedType(cat.type);
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={cat.icon as any}
                      size={20}
                      color={isSelected ? cat.color : THEME.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.categoryTitle,
                        isSelected && { color: cat.color, fontWeight: '800' },
                      ]}
                    >
                      {cat.label}
                    </Text>
                    <Text style={styles.categorySub}>{cat.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Camera / Capture Section */}
            <Text style={styles.sectionHeader}>2. 拍攝或選取打卡紀錄</Text>

            {capturedUri ? (
              /* Image Preview Before Confirming */
              <View style={styles.previewContainer}>
                <Image source={{ uri: capturedUri }} style={styles.previewImage} />

                {/* EHS Level Rating Selector */}
                <View style={styles.previewEhsSelector}>
                  <Text style={styles.previewEhsTitle}>當前充血 EHS 國際硬度評級：</Text>
                  <View style={styles.previewEhsPillRow}>
                    {([1, 2, 3, 4] as EHSLevel[]).map((lvl) => {
                      const meta = EHS_LEVEL_METADATA[lvl];
                      const isSel = checkInEhsLevel === lvl;
                      return (
                        <TouchableOpacity
                          key={`ehs_pick_${lvl}`}
                          style={[
                            styles.previewEhsPill,
                            isSel && { borderColor: meta.color, backgroundColor: meta.color + '33' },
                          ]}
                          onPress={() => {
                            try {
                              void Haptics.selectionAsync();
                            } catch {}
                            setCheckInEhsLevel(lvl);
                          }}
                        >
                          <Text style={[styles.previewEhsPillText, isSel && { color: meta.color, fontWeight: '700' }]}>
                            L{lvl} {meta.analogy}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.previewOverlay}>
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={() => setCapturedUri(null)}
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.retakeText}>重拍</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmBtn, isSaving && { opacity: 0.6 }]}
                    onPress={handleConfirmSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                        <Text style={styles.confirmText}>加密歸檔並領取讚美</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : isCameraActive ? (
              /* Live Camera View */
              <View style={styles.cameraBox}>
                {!permission?.granted ? (
                  <View style={styles.permCard}>
                    <Text style={styles.permText}>需要相機權限以進行打卡紀錄</Text>
                    <TouchableOpacity
                      style={styles.permBtn}
                      onPress={requestPermission}
                    >
                      <Text style={styles.permBtnText}>授權相機權限</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <CameraView
                    ref={cameraRef}
                    facing={facing}
                    style={StyleSheet.absoluteFill}
                  >
                    <View style={styles.cameraOverlay}>
                      <TouchableOpacity
                        style={styles.flipBtn}
                        onPress={() =>
                          setFacing((prev) => (prev === 'back' ? 'front' : 'back'))
                        }
                      >
                        <Ionicons name="camera-reverse" size={20} color="#FFFFFF" />
                      </TouchableOpacity>

                      <View style={styles.shutterRow}>
                        <TouchableOpacity
                          style={styles.closeCamBtn}
                          onPress={() => setIsCameraActive(false)}
                        >
                          <Ionicons name="close" size={20} color="#FFFFFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.shutterBtn}
                          onPress={handleTakePhoto}
                        >
                          <View style={styles.shutterInner} />
                        </TouchableOpacity>

                        <View style={{ width: 40 }} />
                      </View>
                    </View>
                  </CameraView>
                )}
              </View>
            ) : (
              /* Camera Launch Buttons */
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.launchCameraBtn}
                  onPress={() => setIsCameraActive(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={24} color="#FFFFFF" />
                  <Text style={styles.launchCameraText}>啟動相機拍攝</Text>
                  <Text style={styles.launchCameraSub}>直接調用內部獨立鏡頭</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.launchPickerBtn}
                  onPress={handlePickFromLibrary}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images-outline" size={24} color={THEME.colors.primaryLight} />
                  <Text style={styles.launchPickerText}>從沙盒相簿挑選</Text>
                  <Text style={styles.launchPickerSub}>支援外部已拍素材</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Praise Highlight Banner (Shown after saving) */}
            {showPraiseBanner && (
              <View style={styles.praiseBanner}>
                <View style={styles.praiseGlowEffect} />
                <View style={styles.praiseHeader}>
                  <Text style={styles.praiseTitle}>👑 生理狀態極致肯定</Text>
                  <TouchableOpacity onPress={() => setShowPraiseBanner(false)}>
                    <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.praiseMainText}>{praiseText}</Text>
                <Text style={styles.praiseFootnote}>
                  ✨ 已安全寫入沙盒 `/Documents/Vault/DailyCheckIn/`，日曆與輪播 Widget 已自動同步！
                </Text>
                <TouchableOpacity
                  style={styles.virtualReviewLaunchBtn}
                  onPress={() => {
                    setVirtualReviewPhotoUri(capturedUri);
                    setVirtualReviewVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="people" size={16} color="#FFFFFF" />
                  <Text style={styles.virtualReviewLaunchText}>召喚虛擬圍觀團進行群聊審查 ⚡</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* History Section */}
            <View style={styles.historySectionHeader}>
              <View style={styles.historyTitleRow}>
                <Ionicons name="time-outline" size={16} color={THEME.colors.textMuted} />
                <Text style={styles.historySectionTitle}>
                  歷史打卡庫 ({historyItems.length})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.blurToggleBtn}
                onPress={() => setIsHistoryBlurred((prev) => !prev)}
              >
                <Ionicons
                  name={isHistoryBlurred ? 'eye-off' : 'eye'}
                  size={14}
                  color={THEME.colors.primaryLight}
                />
                <Text style={styles.blurToggleText}>
                  {isHistoryBlurred ? '解除遮罩' : '隱私模糊'}
                </Text>
              </TouchableOpacity>
            </View>

            {historyItems.length === 0 ? (
              <View style={styles.emptyHistoryCard}>
                <MaterialCommunityIcons
                  name="image-filter-hdr"
                  size={32}
                  color={THEME.colors.textMuted}
                />
                <Text style={styles.emptyHistoryText}>尚無歷史打卡照片</Text>
                <Text style={styles.emptyHistorySub}>立即拍攝完成今天的第一筆生理記錄</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.historyStrip}
              >
                {historyItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyCard}
                    onPress={() => {
                      setVirtualReviewPhotoUri(item.uri);
                      setVirtualReviewVisible(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: item.uri }} style={styles.historyImage} />
                    {isHistoryBlurred && (
                      <BlurView
                        intensity={45}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <View style={styles.historyCardBadge}>
                      <Text style={styles.historyCardBadgeText}>
                        {item.type === 'most_erotic_of_the_day'
                          ? '🔥 今日最色'
                          : item.type === 'size'
                          ? '📏 尺寸'
                          : '🥚 睪丸'}
                      </Text>
                    </View>
                    <View style={styles.historyCardFooter}>
                      <Text style={styles.historyCardDate}>{item.dateString}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </ScrollView>
        </View>

        {/* Grooming Stylist Modal */}
        <GroomingStylistModal
          visible={groomingStylistVisible}
          onClose={() => setGroomingStylistVisible(false)}
          onSelectStyle={(style) => setCurrentGroomingStyle(style)}
        />

        {/* Virtual Review Panel Modal */}
        <VirtualReviewPanelModal
          visible={virtualReviewVisible}
          onClose={() => setVirtualReviewVisible(false)}
          initialPhotoUri={virtualReviewPhotoUri}
          initialContext={{
            groomingStyle: currentGroomingStyle?.title,
            checkInType: selectedType,
          }}
        />

        {/* Underwear Wardrobe Modal */}
        <UnderwearWardrobeModal
          visible={underwearModalVisible}
          onClose={() => setUnderwearModalVisible(false)}
        />

        {/* Environmental Context Modal */}
        <EnvironmentalLogModal
          visible={envModalVisible}
          selectedTags={selectedEnvTags}
          onClose={() => setEnvModalVisible(false)}
          onApplyContext={(tags, bias) => {
            setSelectedEnvTags(tags);
            setEnvBiasResult(bias);
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 36,
    maxHeight: '92%',
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
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
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
  scrollContent: {
    marginBottom: 10,
  },
  groomingStylistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginBottom: 12,
  },
  underwearEntryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.35)',
    marginBottom: 16,
  },
  groomingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  groomingIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groomingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  groomingBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  groomingBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#60A5FA',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  groomingBannerSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 6,
    marginBottom: 2,
  },
  categorySub: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  launchCameraBtn: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  launchCameraText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  launchCameraSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  launchPickerBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    gap: 4,
  },
  launchPickerText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primaryLight,
    marginTop: 4,
  },
  launchPickerSub: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  cameraBox: {
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginBottom: 18,
    position: 'relative',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  flipBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  shutterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeCamBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EF4444',
  },
  permCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 12,
  },
  permBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  previewContainer: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginBottom: 18,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewEhsSelector: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewEhsTitle: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '700',
    marginBottom: 6,
  },
  previewEhsPillRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  previewEhsPill: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  previewEhsPillText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flexDirection: 'row',
    gap: 10,
  },
  retakeBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  retakeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  praiseBanner: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  praiseGlowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#F59E0B',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  praiseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  praiseTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FDE047',
  },
  praiseMainText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 26,
    letterSpacing: 0.5,
    marginVertical: 4,
  },
  praiseFootnote: {
    fontSize: 10,
    color: '#DDD6FE',
    marginTop: 6,
    lineHeight: 14,
  },
  virtualReviewLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  virtualReviewLaunchText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historySectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  blurToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  blurToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
  },
  emptyHistoryCard: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyHistoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  emptyHistorySub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  historyStrip: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 8,
  },
  historyCard: {
    width: 110,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  historyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  historyCardBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyCardBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  historyCardFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  historyCardDate: {
    fontSize: 9,
    color: '#CBD5E1',
    fontWeight: '600',
  },
});
