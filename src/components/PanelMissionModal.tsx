import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import {
  PanelDailyMission,
  DischargeVolumeScore,
} from '../types';
import { panelMissionService } from '../services/panelMissionService';

interface PanelMissionModalProps {
  visible: boolean;
  onClose: () => void;
  onMissionCompleted?: (mission: PanelDailyMission) => void;
}

export const PanelMissionModal: React.FC<PanelMissionModalProps> = ({
  visible,
  onClose,
  onMissionCompleted,
}) => {
  const [mission, setMission] = useState<PanelDailyMission | null>(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [selectedVolume, setSelectedVolume] = useState<DischargeVolumeScore>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    const todayMission = await panelMissionService.getTodayMission();
    setMission(todayMission);
    if (todayMission.evidenceUri) {
      setCapturedPhotoUri(todayMission.evidenceUri);
    }
    if (todayMission.volumeScore) {
      setSelectedVolume(todayMission.volumeScore);
    }
  };

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        void loadData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handlePickImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('無法選取圖片', '請檢查相簿存取權限');
    }
  };

  const handleTakePhoto = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('需要相機權限', '請前往設定開啟相機權限以採樣證物');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('無法啟動相機', '請重試');
    }
  };

  const handleSubmitEvidence = async () => {
    if (!capturedPhotoUri || !mission) {
      Alert.alert('尚未提供採樣', '請先拍照或選取採樣照片後再進行提交！');
      return;
    }

    setIsSubmitting(true);
    try {
      const volume = mission.category === 'DISCHARGE_VOLUME' ? selectedVolume : undefined;
      const updated = await panelMissionService.submitEvidence(capturedPhotoUri, volume);
      setMission(updated);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Alert.alert(
        '🎉 採樣驗收通過！',
        `陪審團成員【${mission.issuerName}】已完成審核。\n獲得獎勵：+${mission.rewardTokens} 自律代幣！`
      );

      if (onMissionCompleted) {
        onMissionCompleted(updated);
      }
    } catch (e: any) {
      Alert.alert('提交失敗', e.message || '請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mission) return null;

  const volumeOptions: { key: DischargeVolumeScore; label: string; sub: string; icon: string }[] = [
    { key: 'LOW', label: '微量', sub: '1~2 ml 輕微分泌', icon: 'water-outline' },
    { key: 'MEDIUM', label: '適中', sub: '3~5 ml 常規爆發', icon: 'water' },
    { key: 'HIGH', label: '飽滿', sub: '6~8 ml 蓄能充盈', icon: 'waves' },
    { key: 'MASSIVE', label: '海量', sub: '>8 ml 頂級噴薄', icon: 'fire' },
  ];

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

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleCol}>
              <View style={styles.badgeRow}>
                <View style={[styles.headerIconCircle, { backgroundColor: `${mission.issuerColor}20` }]}>
                  <MaterialCommunityIcons name="gavel" size={18} color={mission.issuerColor} />
                </View>
                <Text style={styles.sheetTitle}>虛擬陪審團每日指派任務</Text>
              </View>
              <Text style={styles.sheetSub}>
                {mission.date} · 履約採樣存證 · 審查官即時評判
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Mission Card */}
            <View style={[styles.missionCard, mission.isCompleted && styles.missionCardCompleted]}>
              {/* Issuer pill & Category */}
              <View style={styles.missionHeaderRow}>
                <View style={[styles.issuerPill, { borderColor: mission.issuerColor }]}>
                  <MaterialCommunityIcons name={mission.issuerAvatarIcon as any} size={14} color={mission.issuerColor} />
                  <Text style={[styles.issuerText, { color: mission.issuerColor }]}>
                    {mission.issuerName} · {mission.issuerTitle}
                  </Text>
                </View>

                <View style={styles.rewardPill}>
                  <Text style={styles.rewardPillText}>🪙 +{mission.rewardTokens} 代幣</Text>
                </View>
              </View>

              <Text style={styles.missionTitle}>{mission.title}</Text>

              {/* Briefing Speech Bubble */}
              <View style={[styles.speechBubble, { borderLeftColor: mission.issuerColor }]}>
                <Text style={styles.speechDialog}>{mission.briefingDialog}</Text>
              </View>

              {/* Requirement Box */}
              <View style={styles.reqBox}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#38BDF8" style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reqLabel}>驗收標準與採證指引：</Text>
                  <Text style={styles.reqContent}>{mission.targetRequirement}</Text>
                </View>
              </View>
            </View>

            {/* Evidence Submission / Review Outcome Section */}
            {mission.isCompleted ? (
              /* Completed View: Evidence + Character Review */
              <View style={styles.completedCard}>
                <View style={styles.completedHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.completedTitle}>採樣存證已通過審查！</Text>
                </View>

                {capturedPhotoUri && (
                  <View style={styles.evidenceImageWrapper}>
                    <Image source={{ uri: capturedPhotoUri }} style={styles.evidenceImage} />
                    <View style={styles.watermarkTag}>
                      <Text style={styles.watermarkText}>VAULT VERIFIED EVIDENCE</Text>
                    </View>
                  </View>
                )}

                {mission.volumeScore && (
                  <View style={styles.volumeScoreBadge}>
                    <Text style={styles.volumeScoreBadgeText}>
                      評估容積等級：【{mission.volumeScore}】
                    </Text>
                  </View>
                )}

                {/* Review Feedback Bubble */}
                <View style={[styles.feedbackBubble, { borderColor: `${mission.issuerColor}40` }]}>
                  <Text style={[styles.feedbackAuthor, { color: mission.issuerColor }]}>
                    💬 {mission.issuerName} 的審查評語：
                  </Text>
                  <Text style={styles.feedbackText}>{mission.reviewFeedback}</Text>
                </View>
              </View>
            ) : (
              /* Pending Submission View: Take/Select Photo + Volume Estimator */
              <View style={styles.captureCard}>
                <Text style={styles.sectionTitle}>📸 證物採樣拍攝與上傳</Text>

                {capturedPhotoUri ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: capturedPhotoUri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.retakeBtn}
                      onPress={() => setCapturedPhotoUri(null)}
                    >
                      <Ionicons name="refresh" size={14} color="#FFFFFF" />
                      <Text style={styles.retakeBtnText}>重選採樣</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.actionPickRow}>
                    <TouchableOpacity
                      style={styles.pickActionBtn}
                      onPress={handleTakePhoto}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.pickIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                        <Ionicons name="camera-outline" size={24} color="#38BDF8" />
                      </View>
                      <Text style={styles.pickActionTitle}>即時拍照採樣</Text>
                      <Text style={styles.pickActionSub}>現場定格上傳</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.pickActionBtn}
                      onPress={handlePickImage}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.pickIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                        <Ionicons name="images-outline" size={24} color="#A855F7" />
                      </View>
                      <Text style={styles.pickActionTitle}>從沙盒相簿選取</Text>
                      <Text style={styles.pickActionSub}>已存檔私密採樣</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Volume Estimator if category is DISCHARGE_VOLUME */}
                {mission.category === 'DISCHARGE_VOLUME' && (
                  <View style={styles.volumeSelectorContainer}>
                    <Text style={styles.sectionTitle}>💧 終局產物容積初估 (Volume Estimate)</Text>
                    <View style={styles.volumeGrid}>
                      {volumeOptions.map((opt) => {
                        const isSelected = selectedVolume === opt.key;
                        return (
                          <TouchableOpacity
                            key={opt.key}
                            style={[styles.volumeOptionCard, isSelected && styles.volumeOptionCardActive]}
                            onPress={() => {
                              try {
                                Haptics.selectionAsync();
                              } catch {}
                              setSelectedVolume(opt.key);
                            }}
                          >
                            <MaterialCommunityIcons
                              name={opt.icon as any}
                              size={18}
                              color={isSelected ? '#38BDF8' : '#94A3B8'}
                            />
                            <Text style={[styles.volumeOptionLabel, isSelected && styles.volumeOptionLabelActive]}>
                              {opt.label}
                            </Text>
                            <Text style={styles.volumeOptionSub}>{opt.sub}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (!capturedPhotoUri || isSubmitting) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmitEvidence}
                  disabled={!capturedPhotoUri || isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#0F172A" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle" size={18} color="#0F172A" />
                      <Text style={styles.submitBtnText}>確認提交採樣並接受陪審團審查</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sheetSub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
  },
  scrollArea: {
    marginBottom: 8,
  },
  missionCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  missionCardCompleted: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  missionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  issuerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  issuerText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rewardPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rewardPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
  },
  missionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  speechBubble: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    marginBottom: 12,
  },
  speechDialog: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  reqBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  reqLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 2,
  },
  reqContent: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  completedCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },
  evidenceImageWrapper: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  watermarkTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  watermarkText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  volumeScoreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  volumeScoreBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  feedbackBubble: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  feedbackAuthor: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  captureCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 10,
  },
  actionPickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  pickActionBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  pickIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pickActionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  pickActionSub: {
    fontSize: 10,
    color: '#64748B',
  },
  previewContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  retakeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  retakeBtnText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  volumeSelectorContainer: {
    marginBottom: 14,
  },
  volumeGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  volumeOptionCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  volumeOptionCardActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  volumeOptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
    marginTop: 4,
    marginBottom: 2,
  },
  volumeOptionLabelActive: {
    color: '#38BDF8',
  },
  volumeOptionSub: {
    fontSize: 8,
    color: '#64748B',
    textAlign: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  submitBtnDisabled: {
    backgroundColor: '#334155',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});
