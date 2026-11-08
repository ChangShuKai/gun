import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import {
  UnderwearItem,
  UnderwearCheckInRecord,
  UnderwearCutType,
} from '../types';
import {
  underwearService,
  CUT_TYPE_CONFIG,
} from '../services/underwearService';
import { saveUnderwearPhoto } from '../services/mediaStorage';
import { VirtualReviewPanelModal } from './VirtualReviewPanelModal';
import { UnderwearOverlay3D } from './3d/UnderwearOverlay3D';
import { danmakuService } from '../services/danmakuService';

interface UnderwearWardrobeModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = 'checkin' | 'wardrobe' | 'history' | 'tryon3d';
type AngleType = 'flat' | 'front' | 'side';

const COLOR_OPTIONS = ['#0F172A', '#475569', '#DC2626', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#FFFFFF'];

export const UnderwearWardrobeModal: React.FC<UnderwearWardrobeModalProps> = ({
  visible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('checkin');
  const [wardrobe, setWardrobe] = useState<UnderwearItem[]>([]);
  const [checkIns, setCheckIns] = useState<UnderwearCheckInRecord[]>([]);

  // Selected underwear for check-in
  const [selectedUnderwearId, setSelectedUnderwearId] = useState<string>('');

  // 3-angle captured photos
  const [flatLayUri, setFlatLayUri] = useState<string | null>(null);
  const [frontFitUri, setFrontFitUri] = useState<string | null>(null);
  const [sideFitUri, setSideFitUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Camera capture modal state
  const [cameraVisible, setCameraVisible] = useState<boolean>(false);
  const [activeCapturingAngle, setActiveCapturingAngle] = useState<AngleType>('flat');
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = React.useRef<CameraView>(null);

  // New Underwear Creator state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newCutType, setNewCutType] = useState<UnderwearCutType>('TRUNK');
  const [newBrand, setNewBrand] = useState<string>('');
  const [newColor, setNewColor] = useState<string>('#0F172A');

  // Virtual Review Panel linkage
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);
  const [reviewPhotoUri, setReviewPhotoUri] = useState<string | null>(null);

  const loadData = async () => {
    const list = await underwearService.getWardrobe();
    setWardrobe(list);
    if (list.length > 0 && !selectedUnderwearId) {
      setSelectedUnderwearId(list[0].id);
    }
    const history = await underwearService.getCheckIns();
    setCheckIns(history);
  };

  const handleModalShow = () => {
    void loadData();
    setFlatLayUri(null);
    setFrontFitUri(null);
    setSideFitUri(null);
    setActiveTab('checkin');
  };

  const handleStartCapture = (angle: AngleType) => {
    setActiveCapturingAngle(angle);
    setCameraVisible(true);
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
        if (activeCapturingAngle === 'flat') setFlatLayUri(photo.uri);
        if (activeCapturingAngle === 'front') setFrontFitUri(photo.uri);
        if (activeCapturingAngle === 'side') setSideFitUri(photo.uri);
        setCameraVisible(false);
      }
    } catch {
      Alert.alert('拍攝失敗', '請確認相機權限後重試');
    }
  };

  const handlePickFromLibrary = async (angle: AngleType) => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (!res.canceled && res.assets && res.assets[0].uri) {
        const uri = res.assets[0].uri;
        if (angle === 'flat') setFlatLayUri(uri);
        if (angle === 'front') setFrontFitUri(uri);
        if (angle === 'side') setSideFitUri(uri);
      }
    } catch {
      Alert.alert('提示', '無法存取相簿');
    }
  };

  const handleSaveCheckIn = async () => {
    if (!flatLayUri && !frontFitUri && !sideFitUri) {
      Alert.alert('尚未拍照', '請至少拍攝一張內褲視角照片');
      return;
    }

    const selectedItem = wardrobe.find((w) => w.id === selectedUnderwearId);
    if (!selectedItem) {
      Alert.alert('請選擇款式', '請先指定今日穿搭的內褲款式');
      return;
    }

    setIsSaving(true);
    try {
      const today = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

      let finalFlat = '';
      let finalFront = '';
      let finalSide = '';

      if (flatLayUri) {
        finalFlat = await saveUnderwearPhoto(flatLayUri, 'flat', dateStr);
      }
      if (frontFitUri) {
        finalFront = await saveUnderwearPhoto(frontFitUri, 'front', dateStr);
      }
      if (sideFitUri) {
        finalSide = await saveUnderwearPhoto(sideFitUri, 'side', dateStr);
      }

      await underwearService.saveCheckIn({
        date: dateStr,
        underwearId: selectedItem.id,
        underwearName: selectedItem.name,
        cutType: selectedItem.cutType,
        flatLayUri: finalFlat,
        frontFitUri: finalFront,
        sideFitUri: finalSide,
      });

      void danmakuService.addTokens(15, '內褲穿搭三視角打卡獎勵');

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      const updatedHistory = await underwearService.getCheckIns();
      setCheckIns(updatedHistory);

      Alert.alert(
        '🩲 內褲穿搭三視角打卡成功！',
        '照片已安全隔離寫入沙盒 `/Documents/Vault/Underwear/`！\n是否立即召喚虛擬圍觀團進行穿搭審查？',
        [
          { text: '稍後查看', style: 'cancel' },
          {
            text: '👥 立即圍觀品評',
            onPress: () => {
              setReviewPhotoUri(finalFront || finalSide || finalFlat);
              setReviewModalVisible(true);
            },
          },
        ]
      );

      setFlatLayUri(null);
      setFrontFitUri(null);
      setSideFitUri(null);
    } catch {
      Alert.alert('儲存失敗', '無法寫入沙盒目錄');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUnderwear = async () => {
    if (!newName.trim()) {
      Alert.alert('請輸入名稱', '例如：「CK 經典純黑平口」');
      return;
    }
    await underwearService.addUnderwear({
      name: newName.trim(),
      cutType: newCutType,
      brand: newBrand.trim() || undefined,
      colorTag: newColor,
    });
    setNewName('');
    setNewBrand('');
    setShowAddModal(false);
    const list = await underwearService.getWardrobe();
    setWardrobe(list);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleDeleteUnderwear = async (id: string) => {
    Alert.alert('刪除內褲款式？', '確定要將此款式從款式庫移除嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '確定刪除',
        style: 'destructive',
        onPress: async () => {
          await underwearService.deleteUnderwear(id);
          const list = await underwearService.getWardrobe();
          setWardrobe(list);
        },
      },
    ]);
  };

  const handleDeleteCheckIn = async (id: string) => {
    Alert.alert('刪除打卡紀錄？', '確定要刪除這組三視角紀錄嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '確定刪除',
        style: 'destructive',
        onPress: async () => {
          await underwearService.deleteCheckIn(id);
          const list = await underwearService.getCheckIns();
          setCheckIns(list);
        },
      },
    ]);
  };

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
                <MaterialCommunityIcons name="tshirt-v-outline" size={20} color="#60A5FA" />
              </View>
              <View>
                <Text style={styles.title}>每日內褲款式庫與三視角打卡</Text>
                <Text style={styles.subtitle}>沙盒加密存儲 · 平鋪 / 正面 / 側面實穿定鏡</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'checkin' && styles.tabItemActive]}
              onPress={() => setActiveTab('checkin')}
            >
              <Ionicons
                name="camera"
                size={14}
                color={activeTab === 'checkin' ? '#3B82F6' : '#94A3B8'}
              />
              <Text
                style={[styles.tabItemText, activeTab === 'checkin' && styles.tabItemTextActive]}
              >
                今日打卡
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'wardrobe' && styles.tabItemActive]}
              onPress={() => setActiveTab('wardrobe')}
            >
              <MaterialCommunityIcons
                name="wardrobe-outline"
                size={14}
                color={activeTab === 'wardrobe' ? '#3B82F6' : '#94A3B8'}
              />
              <Text
                style={[styles.tabItemText, activeTab === 'wardrobe' && styles.tabItemTextActive]}
              >
                款式庫 ({wardrobe.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
              onPress={() => setActiveTab('history')}
            >
              <Ionicons
                name="time"
                size={14}
                color={activeTab === 'history' ? '#3B82F6' : '#94A3B8'}
              />
              <Text
                style={[styles.tabItemText, activeTab === 'history' && styles.tabItemTextActive]}
              >
                歷史穿搭 ({checkIns.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'tryon3d' && styles.tabItemActive]}
              onPress={() => setActiveTab('tryon3d')}
            >
              <MaterialCommunityIcons
                name="cube-scan"
                size={14}
                color={activeTab === 'tryon3d' ? '#3B82F6' : '#94A3B8'}
              />
              <Text
                style={[styles.tabItemText, activeTab === 'tryon3d' && styles.tabItemTextActive]}
              >
                3D 試穿
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {activeTab === 'checkin' && (
              /* TAB 1: 3-Angle Check-In */
              <View>
                {/* 1. Pick Underwear Item */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>1. 選擇今日穿搭內褲</Text>
                  <TouchableOpacity
                    style={styles.addUnderwearSmallBtn}
                    onPress={() => setShowAddModal(true)}
                  >
                    <Ionicons name="add" size={14} color="#60A5FA" />
                    <Text style={styles.addUnderwearSmallText}>新增款式</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {wardrobe.map((item) => {
                    const isSelected = selectedUnderwearId === item.id;
                    const cutCfg = CUT_TYPE_CONFIG[item.cutType];
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setSelectedUnderwearId(item.id)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.chipColorDot,
                            { backgroundColor: item.colorTag || '#475569' },
                          ]}
                        />
                        <View>
                          <Text style={[styles.chipTitle, isSelected && styles.chipTitleActive]}>
                            {item.name}
                          </Text>
                          <Text style={styles.chipSub}>{cutCfg.label}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* 2. Three Angles Capture Cards */}
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>2. 三視角定鏡拍攝</Text>

                {/* Angle 1: Flat Lay */}
                <AngleCaptureCard
                  title="視角一：僅內褲平鋪"
                  subtitle="平整擺放 · 展現面料紋理與版型線條"
                  icon="tshirt-crew-outline"
                  photoUri={flatLayUri}
                  onCapture={() => handleStartCapture('flat')}
                  onPick={() => handlePickFromLibrary('flat')}
                  onClear={() => setFlatLayUri(null)}
                />

                {/* Angle 2: Front Fit */}
                <AngleCaptureCard
                  title="視角二：穿上正面實穿"
                  subtitle="正對鏡頭 · 突顯囊袋立體飽滿度與低腰折角"
                  icon="human-male"
                  photoUri={frontFitUri}
                  onCapture={() => handleStartCapture('front')}
                  onPick={() => handlePickFromLibrary('front')}
                  onClear={() => setFrontFitUri(null)}
                />

                {/* Angle 3: Side Fit */}
                <AngleCaptureCard
                  title="視角三：穿上側面實穿"
                  subtitle="側轉 90 度 · 展現前凸弧度與臀部提托翹度"
                  icon="angle-right"
                  photoUri={sideFitUri}
                  onCapture={() => handleStartCapture('side')}
                  onPick={() => handlePickFromLibrary('side')}
                  onClear={() => setSideFitUri(null)}
                />

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.saveCheckInBtn}
                  onPress={handleSaveCheckIn}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.saveCheckInText}>加密歸檔內褲三視角穿搭</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'wardrobe' && (
              /* TAB 2: Wardrobe Management */
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>我的內褲庫存 ({wardrobe.length})</Text>
                  <TouchableOpacity
                    style={styles.addUnderwearSmallBtn}
                    onPress={() => setShowAddModal(true)}
                  >
                    <Ionicons name="add" size={14} color="#60A5FA" />
                    <Text style={styles.addUnderwearSmallText}>新增款式</Text>
                  </TouchableOpacity>
                </View>

                {wardrobe.map((item) => {
                  const cutCfg = CUT_TYPE_CONFIG[item.cutType];
                  return (
                    <View key={item.id} style={styles.wardrobeCard}>
                      <View
                        style={[
                          styles.wardrobeColorBar,
                          { backgroundColor: item.colorTag || '#475569' },
                        ]}
                      />
                      <View style={styles.wardrobeInfo}>
                        <View style={styles.wardrobeTitleRow}>
                          <Text style={styles.wardrobeName}>{item.name}</Text>
                          <View style={styles.cutBadge}>
                            <Text style={styles.cutBadgeText}>{cutCfg.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.wardrobeDesc}>
                          {item.brand ? `品牌：${item.brand} · ` : ''}
                          {cutCfg.desc}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteUnderwear(item.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {activeTab === 'history' && (
              /* TAB 3: History Timeline */
              <View>
                <Text style={styles.sectionTitle}>穿搭打卡歷史紀錄 ({checkIns.length})</Text>
                {checkIns.length === 0 ? (
                  <View style={styles.emptyHistory}>
                    <MaterialCommunityIcons name="tshirt-v-outline" size={36} color="#64748B" />
                    <Text style={styles.emptyHistoryText}>尚無內褲穿搭紀錄</Text>
                    <Text style={styles.emptyHistorySub}>立即拍攝今日平鋪與穿搭上傳！</Text>
                  </View>
                ) : (
                  checkIns.map((record) => (
                    <View key={record.id} style={styles.historyRecordCard}>
                      <View style={styles.historyRecordHeader}>
                        <View>
                          <Text style={styles.historyRecordName}>{record.underwearName}</Text>
                          <Text style={styles.historyRecordDate}>
                            {record.date} · {CUT_TYPE_CONFIG[record.cutType]?.label}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.reviewLaunchSmallBtn}
                          onPress={() => {
                            setReviewPhotoUri(
                              record.frontFitUri || record.sideFitUri || record.flatLayUri
                            );
                            setReviewModalVisible(true);
                          }}
                        >
                          <Ionicons name="people" size={12} color="#0F172A" />
                          <Text style={styles.reviewLaunchSmallText}>品評</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteCheckIn(record.id)}
                          style={{ marginLeft: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>

                      {/* 3-in-1 Triptych Strip */}
                      <View style={styles.triptychRow}>
                        <View style={styles.triptychCol}>
                          {record.flatLayUri ? (
                            <Image source={{ uri: record.flatLayUri }} style={styles.triptychImg} />
                          ) : (
                            <View style={styles.triptychPlaceholder}>
                              <Text style={styles.triptychPlaceholderText}>無平鋪照</Text>
                            </View>
                          )}
                          <Text style={styles.triptychLabel}>平鋪</Text>
                        </View>

                        <View style={styles.triptychCol}>
                          {record.frontFitUri ? (
                            <Image source={{ uri: record.frontFitUri }} style={styles.triptychImg} />
                          ) : (
                            <View style={styles.triptychPlaceholder}>
                              <Text style={styles.triptychPlaceholderText}>無正面照</Text>
                            </View>
                          )}
                          <Text style={styles.triptychLabel}>正面實穿</Text>
                        </View>

                        <View style={styles.triptychCol}>
                          {record.sideFitUri ? (
                            <Image source={{ uri: record.sideFitUri }} style={styles.triptychImg} />
                          ) : (
                            <View style={styles.triptychPlaceholder}>
                              <Text style={styles.triptychPlaceholderText}>無側面照</Text>
                            </View>
                          )}
                          <Text style={styles.triptychLabel}>側面實穿</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 4: 3D Virtual Try-On */}
            {activeTab === 'tryon3d' && (
              <UnderwearOverlay3D height={380} />
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>

        {/* Live Camera View Modal */}
        <Modal
          visible={cameraVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCameraVisible(false)}
        >
          <View style={styles.cameraBackdrop}>
            {!permission?.granted ? (
              <View style={styles.cameraPermCard}>
                <Text style={styles.cameraPermText}>需要相機權限以進行三視角拍攝</Text>
                <TouchableOpacity style={styles.cameraPermBtn} onPress={requestPermission}>
                  <Text style={styles.cameraPermBtnText}>授權相機</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CameraView ref={cameraRef} facing={cameraFacing} style={StyleSheet.absoluteFill}>
                {/* Guide overlay */}
                <View style={styles.cameraOverlay}>
                  <View style={styles.cameraGuideHeader}>
                    <Text style={styles.cameraGuideTitle}>
                      {activeCapturingAngle === 'flat'
                        ? '視角一：僅內褲平鋪 (面料版型)'
                        : activeCapturingAngle === 'front'
                        ? '視角二：穿上正面 (囊袋飽滿度)'
                        : '視角三：穿上側面 (前凸提臀弧度)'}
                    </Text>
                    <TouchableOpacity
                      style={styles.cameraFlipBtn}
                      onPress={() =>
                        setCameraFacing((p) => (p === 'back' ? 'front' : 'back'))
                      }
                    >
                      <Ionicons name="camera-reverse" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  {/* Visual Guide Box */}
                  <View style={styles.cameraGuideFrame}>
                    <View style={styles.cameraGuideCrosshair} />
                  </View>

                  {/* Shutter controls */}
                  <View style={styles.cameraShutterRow}>
                    <TouchableOpacity
                      style={styles.cameraCloseBtn}
                      onPress={() => setCameraVisible(false)}
                    >
                      <Ionicons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cameraShutterBtn}
                      onPress={handleTakePhoto}
                    >
                      <View style={styles.cameraShutterInner} />
                    </TouchableOpacity>

                    <View style={{ width: 44 }} />
                  </View>
                </View>
              </CameraView>
            )}
          </View>
        </Modal>

        {/* Add Underwear Creator Modal */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.backdrop}>
            <View style={styles.createCard}>
              <View style={styles.createHeader}>
                <Text style={styles.createTitle}>新增內褲款式</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>款式名稱</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="例如：CK 經典黑平口"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>版型剪裁</Text>
              <View style={styles.cutsRow}>
                {(['TRUNK', 'BRIEF', 'BOXER', 'JOCKSTRAP', 'OTHER'] as UnderwearCutType[]).map(
                  (c) => {
                    const isSel = newCutType === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[styles.cutBtn, isSel && styles.cutBtnActive]}
                        onPress={() => setNewCutType(c)}
                      >
                        <Text style={[styles.cutBtnText, isSel && styles.cutBtnTextActive]}>
                          {CUT_TYPE_CONFIG[c].label.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              <Text style={styles.inputLabel}>品牌 (選填)</Text>
              <TextInput
                style={styles.input}
                value={newBrand}
                onChangeText={setNewBrand}
                placeholder="例如：Calvin Klein / UNIQLO"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>代表色標籤</Text>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((col) => {
                  const isSel = newColor === col;
                  return (
                    <TouchableOpacity
                      key={col}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: col },
                        isSel && styles.colorCircleActive,
                      ]}
                      onPress={() => setNewColor(col)}
                    />
                  );
                })}
              </View>

              <TouchableOpacity style={styles.submitAddBtn} onPress={handleCreateUnderwear}>
                <Text style={styles.submitAddBtnText}>儲存至款式庫</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Virtual Review Panel Modal Link */}
        <VirtualReviewPanelModal
          visible={reviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          initialPhotoUri={reviewPhotoUri}
          initialContext={{
            checkInType: 'most_erotic_of_the_day',
            groomingStyle: '內褲穿搭審查',
          }}
        />
      </View>
    </Modal>
  );
};

// Sub-component for each angle capture card
const AngleCaptureCard: React.FC<{
  title: string;
  subtitle: string;
  icon: string;
  photoUri: string | null;
  onCapture: () => void;
  onPick: () => void;
  onClear: () => void;
}> = ({ title, subtitle, icon, photoUri, onCapture, onPick, onClear }) => {
  return (
    <View style={styles.angleCard}>
      <View style={styles.angleHeader}>
        <View style={styles.angleTitleRow}>
          <MaterialCommunityIcons name={icon as any} size={18} color="#60A5FA" />
          <Text style={styles.angleTitle}>{title}</Text>
        </View>
        {photoUri && (
          <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={14} color="#EF4444" />
            <Text style={styles.clearText}>重拍</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.angleSub}>{subtitle}</Text>

      {photoUri ? (
        <View style={styles.previewBox}>
          <Image source={{ uri: photoUri }} style={styles.previewImg} />
          <View style={styles.previewBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.previewBadgeText}>已就緒</Text>
          </View>
        </View>
      ) : (
        <View style={styles.actionBtnRow}>
          <TouchableOpacity style={styles.angleBtn} onPress={onCapture} activeOpacity={0.8}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
            <Text style={styles.angleBtnText}>啟動相機</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.anglePickerBtn} onPress={onPick} activeOpacity={0.8}>
            <Ionicons name="images-outline" size={16} color="#60A5FA" />
            <Text style={styles.anglePickerBtnText}>相簿挑選</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#334155',
    maxHeight: '92%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#131D33',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  tabItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  tabItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabItemTextActive: {
    color: '#60A5FA',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  addUnderwearSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addUnderwearSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60A5FA',
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#131D33',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  chipColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  chipTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  chipTitleActive: {
    color: '#FFFFFF',
  },
  chipSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  angleCard: {
    backgroundColor: '#131D33',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  angleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  angleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  angleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  angleSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearText: {
    fontSize: 10,
    color: '#EF4444',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  angleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingVertical: 9,
    borderRadius: 8,
  },
  angleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  anglePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 9,
    borderRadius: 8,
  },
  anglePickerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
  },
  previewBox: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  previewBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  saveCheckInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 8,
  },
  saveCheckInText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  wardrobeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131D33',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  wardrobeColorBar: {
    width: 6,
    height: 38,
    borderRadius: 3,
    marginRight: 10,
  },
  wardrobeInfo: {
    flex: 1,
  },
  wardrobeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  wardrobeName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  cutBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cutBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  wardrobeDesc: {
    fontSize: 10,
    color: '#64748B',
  },
  deleteBtn: {
    padding: 6,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyHistoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 8,
  },
  emptyHistorySub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  historyRecordCard: {
    backgroundColor: '#131D33',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  historyRecordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyRecordName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  historyRecordDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  reviewLaunchSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  reviewLaunchSmallText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  triptychRow: {
    flexDirection: 'row',
    gap: 8,
  },
  triptychCol: {
    flex: 1,
    alignItems: 'center',
  },
  triptychImg: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    marginBottom: 4,
  },
  triptychPlaceholder: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  triptychPlaceholderText: {
    fontSize: 9,
    color: '#64748B',
  },
  triptychLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  cameraBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraPermCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraPermText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  cameraPermBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cameraPermBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
  },
  cameraGuideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 10,
  },
  cameraGuideTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraFlipBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraGuideFrame: {
    width: 260,
    height: 320,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: 'rgba(96, 165, 250, 0.6)',
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraGuideCrosshair: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cameraShutterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraShutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraShutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  createCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  createHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  createTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cutsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  cutBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cutBtnActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  cutBtnText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cutBtnTextActive: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  colorCircleActive: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  submitAddBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitAddBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
