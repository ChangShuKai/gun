import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Animated,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { THEME } from '../constants/theme';
import {
  PanelMember,
  PersonaType,
  ReviewComment,
  ReviewSessionContext,
  PanelVerdict,
} from '../types';
import { virtualGroupService } from '../services/virtualGroupService';
import { userProfileService } from '../services/userProfile';
import { listDailyCheckInPhotos } from '../services/mediaStorage';
import { danmakuService } from '../services/danmakuService';

interface VirtualReviewPanelModalProps {
  visible: boolean;
  onClose: () => void;
  initialPhotoUri?: string | null;
  initialContext?: Partial<ReviewSessionContext>;
}

const PERSONA_LABELS: Record<PersonaType, { label: string; icon: string }> = {
  tsundere: { label: '傲嬌毒舌', icon: 'heart-dislike' },
  seductive: { label: '魅惑御姐', icon: 'flame' },
  analytical: { label: '數據生理', icon: 'analytics' },
  bro: { label: '硬派兄弟', icon: 'barbell' },
};

const COLOR_PALETTE = ['#EC4899', '#F43F5E', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6'];

export const VirtualReviewPanelModal: React.FC<VirtualReviewPanelModalProps> = ({
  visible,
  onClose,
  initialPhotoUri,
  initialContext,
}) => {
  const [photoUri, setPhotoUri] = useState<string | null>(initialPhotoUri || null);
  const [members, setMembers] = useState<PanelMember[]>([]);
  const [verdict, setVerdict] = useState<PanelVerdict | null>(null);
  const [displayedComments, setDisplayedComments] = useState<ReviewComment[]>([]);
  const [typingMember, setTypingMember] = useState<PanelMember | null>(null);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Stamp scale animation
  const [stampScale] = useState(() => new Animated.Value(0));

  // Member editing modal
  const [editorVisible, setEditorVisible] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<PanelMember | null>(null);

  // Photo selector sheet
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [showPhotoPicker, setShowPhotoPicker] = useState<boolean>(false);

  // Favorability & Token State
  const [tokens, setTokens] = useState<number>(120);
  const [favorabilityMap, setFavorabilityMap] = useState<Record<string, any>>({});

  const loadInitialData = async () => {
    const loadedMembers = await virtualGroupService.getMembers();
    setMembers(loadedMembers);

    const store = await danmakuService.getFavorabilityStore();
    setTokens(store.tokens);
    setFavorabilityMap(store.members);

    const history = await listDailyCheckInPhotos();
    const uris = history.map((item) => item.uri);
    setGalleryPhotos(uris);

    if (!photoUri && uris.length > 0) {
      setPhotoUri(uris[0]);
    }
  };

  const handleGiftMember = async (persona: string) => {
    const res = await danmakuService.giftMember(persona, 20);
    if (!res.success) {
      Alert.alert('提示', res.message);
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const store = await danmakuService.getFavorabilityStore();
    setTokens(store.tokens);
    setFavorabilityMap(store.members);

    Alert.alert('💖 好感度提升', res.message);
  };

  const handleModalShow = () => {
    if (initialPhotoUri) {
      setPhotoUri(initialPhotoUri);
    }
    void loadInitialData();
    stampScale.setValue(0);
    setDisplayedComments([]);
    setTypingMember(null);
    setIsReviewing(false);
    setIsCompleted(false);
    setVerdict(null);

    // Auto-start review
    setTimeout(() => {
      startReviewFlow();
    }, 400);
  };

  const startReviewFlow = (customMembers?: PanelMember[]) => {
    const activeMembers = customMembers || members;
    if (activeMembers.length === 0) return;

    const profile = userProfileService.getProfile();
    const context: ReviewSessionContext = {
      photoUri: photoUri || undefined,
      userLength: initialContext?.userLength || `${profile.userLength || '16.5'} cm`,
      currentBPM: initialContext?.currentBPM || 118,
      arousalLevel: initialContext?.arousalLevel || 9.2,
      groomingStyle: initialContext?.groomingStyle,
      checkInType: initialContext?.checkInType || 'most_erotic_of_the_day',
    };

    const newVerdict = virtualGroupService.generateReview(context);
    setVerdict(newVerdict);
    setDisplayedComments([]);
    setIsReviewing(true);
    setIsCompleted(false);
    stampScale.setValue(0);

    // Sequence through each comment with typing simulation
    let currentIdx = 0;
    const allComments = newVerdict.comments;

    const playNext = () => {
      if (currentIdx >= allComments.length) {
        setTypingMember(null);
        setIsReviewing(false);
        setIsCompleted(true);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}

        Animated.spring(stampScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }).start();
        return;
      }

      const comment = allComments[currentIdx];
      const member = activeMembers.find((m) => m.id === comment.memberId) || activeMembers[currentIdx];
      setTypingMember(member);

      setTimeout(() => {
        setDisplayedComments((prev) => [...prev, comment]);
        setTypingMember(null);
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}

        currentIdx += 1;
        setTimeout(playNext, 450);
      }, 1200);
    };

    playNext();
  };

  const handleSkipAll = () => {
    if (!verdict) return;
    setTypingMember(null);
    setDisplayedComments(verdict.comments);
    setIsReviewing(false);
    setIsCompleted(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Animated.spring(stampScale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePickLocalPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      if (!res.canceled && res.assets && res.assets[0].uri) {
        setPhotoUri(res.assets[0].uri);
        setShowPhotoPicker(false);
        setTimeout(() => startReviewFlow(), 300);
      }
    } catch {
      Alert.alert('提示', '無法存取相簿');
    }
  };

  const handleShareReport = async () => {
    if (!verdict) return;
    try {
      const reportText = `👑【虛擬圍觀團・品評認證報告】\n` +
        `評審裁決：${verdict.consensusBadge}\n` +
        `綜合評分：${verdict.compositeScore} / 10\n` +
        `────────────────────\n` +
        verdict.comments.map((c) => `[${c.memberName}・${c.badge}]\n「${c.text}」`).join('\n\n') +
        `\n────────────────────\n` +
        `總結：${verdict.summaryText}`;

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable && photoUri) {
        await Sharing.shareAsync(photoUri, {
          dialogTitle: '分享圍觀品評認證',
        });
      } else {
        Alert.alert('品評報告已生成', reportText);
      }
    } catch {
      // Ignored
    }
  };

  const openMemberEditor = (member: PanelMember) => {
    setEditingMember({ ...member });
    setEditorVisible(true);
  };

  const saveEditedMember = async () => {
    if (!editingMember) return;
    const updatedList = await virtualGroupService.updateMember(editingMember);
    setMembers(updatedList);
    setEditorVisible(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const resetMembers = async () => {
    const list = await virtualGroupService.resetDefaultMembers();
    setMembers(list);
    setEditorVisible(false);
    Alert.alert('完成', '已恢復預設 4 位圍觀團成員');
  };

  const activeColor = typingMember ? typingMember.color : '#F59E0B';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleModalShow}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Top Navigation Bar */}
          <View style={styles.navBar}>
            <View style={styles.navTitleRow}>
              <View style={[styles.navIconCircle, { backgroundColor: activeColor + '22' }]}>
                <Ionicons name="people" size={18} color={activeColor} />
              </View>
              <View>
                <Text style={styles.navTitle}>虛擬團圍觀審查</Text>
                <Text style={styles.navSubtitle}>多維度性格群聊品評舞台 · 純本地離線</Text>
              </View>
            </View>

            <View style={styles.navActions}>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => {
                  if (members.length > 0) openMemberEditor(members[0]);
                }}
              >
                <Ionicons name="settings-sharp" size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={onClose}>
                <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Audience Seating Strip (圍觀席) */}
          <View style={styles.audienceSection}>
            <View style={styles.audienceHeader}>
              <View style={styles.audienceHeaderLeft}>
                <Text style={styles.audienceSectionTitle}>圍觀團席位 ({members.length}人)</Text>
                <View style={styles.tokenPill}>
                  <MaterialCommunityIcons name="star-circle" size={13} color="#F59E0B" />
                  <Text style={styles.tokenPillText}>{tokens} 點數</Text>
                </View>
              </View>
              {isReviewing && (
                <TouchableOpacity onPress={handleSkipAll}>
                  <Text style={styles.skipBtnText}>全部跳過 ⚡</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.audienceRow}>
              {members.map((member) => {
                const isTyping = typingMember?.id === member.id;
                const memberFav = favorabilityMap[member.persona];
                const currentTier = memberFav?.tier || 1;
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.audienceSeat,
                      isTyping && { borderColor: member.color, transform: [{ scale: 1.05 }] },
                    ]}
                    onPress={() => openMemberEditor(member)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.avatarCircle, { borderColor: member.color }]}>
                      {member.avatarUri ? (
                        <Image source={{ uri: member.avatarUri }} style={styles.avatarImg} />
                      ) : (
                        <Ionicons
                          name={member.avatarIcon as keyof typeof Ionicons.glyphMap}
                          size={22}
                          color={member.color}
                        />
                      )}
                      {isTyping && <View style={[styles.typingDot, { backgroundColor: member.color }]} />}
                    </View>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {member.name}
                    </Text>
                    <View style={[styles.personaPill, { backgroundColor: member.color + '22' }]}>
                      <Text style={[styles.personaPillText, { color: member.color }]}>
                        {PERSONA_LABELS[member.persona]?.label || member.title}
                      </Text>
                    </View>

                    {/* Member Intimacy Tier & Quick Gifting Pill */}
                    <View style={styles.memberTierRow}>
                      <View style={[styles.tierBadge, { borderColor: member.color }]}>
                        <Text style={[styles.tierBadgeText, { color: member.color }]}>
                          T{currentTier}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.giftMiniBtn}
                        onPress={() => handleGiftMember(member.persona)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="gift-outline" size={10} color="#F59E0B" />
                        <Text style={styles.giftMiniText}>+20</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
            {/* Center Stage Photo Display (中央自拍展示舞台) */}
            <View style={[styles.stageCard, { borderColor: activeColor }]}>
              {photoUri ? (
                <View style={styles.stageImageWrapper}>
                  <Image source={{ uri: photoUri }} style={styles.stageImage} resizeMode="cover" />
                  <LinearGradientMock color={activeColor} />

                  {/* Stage Badges Overlay */}
                  <View style={styles.stageOverlayTop}>
                    <View style={styles.stageTag}>
                      <MaterialCommunityIcons name="shield-check" size={14} color="#10B981" />
                      <Text style={styles.stageTagText}>私密沙盒審查中</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.switchPhotoBtn}
                      onPress={() => setShowPhotoPicker(true)}
                    >
                      <Ionicons name="images" size={14} color="#FFFFFF" />
                      <Text style={styles.switchPhotoText}>更換照片</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.stageOverlayBottom}>
                    <View style={styles.stageInfoBox}>
                      <Text style={styles.stageInfoTitle}>
                        {initialContext?.userLength || '16.5 cm'} · EHS 4級頂標
                      </Text>
                      <Text style={styles.stageInfoSub}>
                        {initialContext?.groomingStyle || 'Fade 視覺延展'} · 充血峰值 118 BPM
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.emptyStage}
                  onPress={() => setShowPhotoPicker(true)}
                >
                  <Ionicons name="camera-outline" size={38} color={THEME.colors.textMuted} />
                  <Text style={styles.emptyStageText}>點擊選擇或拍攝審查照片</Text>
                  <Text style={styles.emptyStageSub}>支援每日打卡照或沙盒私密快照</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Live Chat Stream (輪流群聊品評對話流) */}
            <View style={styles.chatSection}>
              <View style={styles.chatHeaderRow}>
                <MaterialCommunityIcons name="chat-processing-outline" size={16} color="#60A5FA" />
                <Text style={styles.chatSectionTitle}>審查團即時評語對話流</Text>
              </View>

              {displayedComments.map((comment) => (
                <View key={comment.id} style={styles.chatMessageRow}>
                  <View style={[styles.chatAvatar, { borderColor: comment.color }]}>
                    {comment.avatarUri ? (
                      <Image source={{ uri: comment.avatarUri }} style={styles.chatAvatarImg} />
                    ) : (
                      <Ionicons
                        name={comment.avatarIcon as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color={comment.color}
                      />
                    )}
                  </View>

                  <View style={styles.chatBubbleContainer}>
                    <View style={styles.chatBubbleHeader}>
                      <Text style={[styles.chatAuthorName, { color: comment.color }]}>
                        {comment.memberName}
                      </Text>
                      <View style={[styles.chatBadgePill, { backgroundColor: comment.color + '22' }]}>
                        <Text style={[styles.chatBadgeText, { color: comment.color }]}>
                          {comment.badge}
                        </Text>
                      </View>
                      <Text style={styles.chatRatingText}>⭐ {comment.rating.toFixed(1)}</Text>
                    </View>

                    <View style={[styles.chatBubble, { borderColor: comment.color + '55' }]}>
                      {comment.quotedComment && (
                        <View style={styles.quotedContainer}>
                          <View style={[styles.quotedBorderLine, { backgroundColor: comment.color }]} />
                          <View style={styles.quotedContent}>
                            <Text style={[styles.quotedAuthor, { color: comment.color }]}>
                              引用 @{comment.quotedComment.memberName}：
                            </Text>
                            <Text style={styles.quotedText} numberOfLines={2}>
                              「{comment.quotedComment.text}」
                            </Text>
                          </View>
                        </View>
                      )}
                      <Text style={styles.chatBubbleText}>{comment.text}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Typing indicator */}
              {typingMember && (
                <View style={styles.typingRow}>
                  <View style={[styles.chatAvatar, { borderColor: typingMember.color }]}>
                    <Ionicons
                      name={typingMember.avatarIcon as keyof typeof Ionicons.glyphMap}
                      size={16}
                      color={typingMember.color}
                    />
                  </View>
                  <View style={[styles.typingBubble, { borderColor: typingMember.color + '44' }]}>
                    <Text style={[styles.typingText, { color: typingMember.color }]}>
                      {typingMember.name} 正在仔細審查並輸入評語...
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Final Grand Verdict Card (評審團總裁決卡) */}
            {isCompleted && verdict && (
              <View style={styles.verdictCard}>
                <View style={styles.verdictHeader}>
                  <View>
                    <Text style={styles.verdictTitle}>審查團全體綜合總裁決</Text>
                    <Text style={styles.verdictScore}>
                      綜合評分 <Text style={styles.scoreHighlight}>{verdict.compositeScore}</Text> / 10
                    </Text>
                  </View>

                  <Animated.View style={[styles.stampBox, { transform: [{ scale: stampScale }] }]}>
                    <Text style={styles.stampText}>{verdict.consensusBadge}</Text>
                  </Animated.View>
                </View>

                <Text style={styles.verdictSummary}>{verdict.summaryText}</Text>

                {/* Verdict Actions */}
                <View style={styles.verdictActionsRow}>
                  <TouchableOpacity
                    style={styles.reReviewBtn}
                    onPress={() => startReviewFlow()}
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.reReviewText}>重新審查</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareReportBtn}
                    onPress={handleShareReport}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#60A5FA" />
                    <Text style={styles.shareReportText}>導出品評報告</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>

        {/* Photo Picker Modal Sheet */}
        <Modal
          visible={showPhotoPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPhotoPicker(false)}
        >
          <View style={styles.pickerBackdrop}>
            <View style={styles.pickerCard}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>選擇審查照片</Text>
                <TouchableOpacity onPress={() => setShowPhotoPicker(false)}>
                  <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.pickerSelectDeviceBtn}
                onPress={handlePickLocalPhoto}
              >
                <Ionicons name="images-outline" size={20} color="#FFFFFF" />
                <Text style={styles.pickerSelectDeviceText}>從相簿挑選新照片</Text>
              </TouchableOpacity>

              <Text style={styles.pickerSubTitle}>歷史打卡紀錄照片 ({galleryPhotos.length}):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryStrip}>
                {galleryPhotos.map((uri, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.galleryThumb}
                    onPress={() => {
                      setPhotoUri(uri);
                      setShowPhotoPicker(false);
                      setTimeout(() => startReviewFlow(), 300);
                    }}
                  >
                    <Image source={{ uri }} style={styles.thumbImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Member Editor Modal */}
        {editingMember && (
          <Modal
            visible={editorVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setEditorVisible(false)}
          >
            <View style={styles.pickerBackdrop}>
              <View style={styles.editorCard}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>自訂圍觀團成員</Text>
                  <TouchableOpacity onPress={() => setEditorVisible(false)}>
                    <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.editorField}>
                  <Text style={styles.editorLabel}>成員稱呼 / 名稱</Text>
                  <TextInput
                    style={styles.editorInput}
                    value={editingMember.name}
                    onChangeText={(txt) =>
                      setEditingMember((prev) => (prev ? { ...prev, name: txt } : null))
                    }
                    placeholder="輸入成員名稱"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View style={styles.editorField}>
                  <Text style={styles.editorLabel}>性格類型 (Persona)</Text>
                  <View style={styles.personaRow}>
                    {(['tsundere', 'seductive', 'analytical', 'bro'] as PersonaType[]).map((p) => {
                      const isSel = editingMember.persona === p;
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[
                            styles.personaChoiceBtn,
                            isSel && { borderColor: editingMember.color, backgroundColor: editingMember.color + '22' },
                          ]}
                          onPress={() =>
                            setEditingMember((prev) => (prev ? { ...prev, persona: p } : null))
                          }
                        >
                          <Text
                            style={[
                              styles.personaChoiceText,
                              isSel && { color: editingMember.color, fontWeight: '700' },
                            ]}
                          >
                            {PERSONA_LABELS[p].label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.editorField}>
                  <Text style={styles.editorLabel}>專屬對話強調色</Text>
                  <View style={styles.paletteRow}>
                    {COLOR_PALETTE.map((c) => {
                      const isSel = editingMember.color === c;
                      return (
                        <TouchableOpacity
                          key={c}
                          style={[
                            styles.colorDot,
                            { backgroundColor: c },
                            isSel && styles.colorDotSelected,
                          ]}
                          onPress={() =>
                            setEditingMember((prev) => (prev ? { ...prev, color: c } : null))
                          }
                        />
                      );
                    })}
                  </View>
                </View>

                <View style={styles.editorActionsRow}>
                  <TouchableOpacity style={styles.resetBtn} onPress={resetMembers}>
                    <Text style={styles.resetBtnText}>重設全部</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveEditedMember}>
                    <Text style={styles.saveBtnText}>儲存變更</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

// Subtle gradient mock for image overlay
const LinearGradientMock: React.FC<{ color: string }> = ({ color }) => (
  <View
    pointerEvents="none"
    style={[
      StyleSheet.absoluteFill,
      {
        backgroundColor: color + '08',
        borderWidth: 1,
        borderColor: color + '33',
        borderRadius: 16,
      },
    ]}
  />
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '94%',
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  navTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  navSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audienceSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#131D33',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  audienceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  audienceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#F59E0B',
  },
  tokenPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
  },
  audienceSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skipBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  audienceRow: {
    flexDirection: 'row',
  },
  audienceSeat: {
    alignItems: 'center',
    marginRight: 14,
    padding: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#0F172A',
    minWidth: 70,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  typingDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  memberName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  personaPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  personaPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  memberTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  tierBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  tierBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },
  giftMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#F59E0B',
  },
  giftMiniText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FBBF24',
  },
  mainScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  stageCard: {
    height: 240,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: '#050914',
    overflow: 'hidden',
    marginBottom: 16,
  },
  stageImageWrapper: {
    flex: 1,
    position: 'relative',
  },
  stageImage: {
    width: '100%',
    height: '100%',
  },
  stageOverlayTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stageTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  switchPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  switchPhotoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stageOverlayBottom: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  stageInfoBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stageInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  stageInfoSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStageText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CBD5E1',
    marginTop: 8,
  },
  emptyStageSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  chatSection: {
    marginBottom: 16,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  chatSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  chatMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  chatAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  chatBubbleContainer: {
    flex: 1,
  },
  chatBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  chatAuthorName: {
    fontSize: 12,
    fontWeight: '800',
  },
  chatBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  chatBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  chatRatingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
    marginLeft: 'auto',
  },
  chatBubble: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  quotedContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    gap: 8,
  },
  quotedBorderLine: {
    width: 3,
    borderRadius: 2,
  },
  quotedContent: {
    flex: 1,
  },
  quotedAuthor: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  quotedText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  chatBubbleText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#E2E8F0',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  typingBubble: {
    backgroundColor: '#172033',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  typingText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  verdictCard: {
    backgroundColor: '#131D33',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    marginTop: 8,
  },
  verdictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  verdictTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  verdictScore: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
  },
  scoreHighlight: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F59E0B',
  },
  stampBox: {
    backgroundColor: '#78350F',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stampText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FDE68A',
  },
  verdictSummary: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 14,
  },
  verdictActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reReviewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    borderRadius: 10,
  },
  reReviewText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  shareReportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 10,
  },
  shareReportText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#60A5FA',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerCard: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 18,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  pickerSelectDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  pickerSelectDeviceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pickerSubTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 10,
  },
  galleryStrip: {
    flexDirection: 'row',
  },
  galleryThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  editorCard: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 18,
  },
  editorField: {
    marginBottom: 14,
  },
  editorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
  },
  editorInput: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  personaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  personaChoiceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  personaChoiceText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editorActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 11,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 11,
    backgroundColor: '#10B981',
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
