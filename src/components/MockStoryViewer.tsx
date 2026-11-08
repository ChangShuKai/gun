import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '../services/userProfile';

interface MockStoryViewerProps {
  visible: boolean;
  onClose: () => void;
  photoUri: string | null;
  onDeleted?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MOCK_VIEWERS = [
  { id: '1', handle: 'alex_99', name: 'Alex Wang', time: '剛剛', reaction: '🔥' },
  { id: '2', handle: 'sarah.chen', name: 'Sarah Chen', time: '1 分鐘前', reaction: '😮' },
  { id: '3', handle: 'jason_k', name: 'Jason Kuo', time: '2 分鐘前', reaction: '💯' },
  { id: '4', handle: 'kevin_tw', name: 'Kevin Lee', time: '2 分鐘前', reaction: null },
  { id: '5', handle: 'chloe.h', name: 'Chloe Huang', time: '3 分鐘前', reaction: '👀' },
  { id: '6', handle: 'lisa_daily', name: 'Lisa Daily', time: '4 分鐘前', reaction: null },
  { id: '7', handle: 'eric_lin', name: 'Eric Lin', time: '5 分鐘前', reaction: '❤️' },
];

export const MockStoryViewer: React.FC<MockStoryViewerProps> = ({
  visible,
  onClose,
  photoUri,
  onDeleted,
}) => {
  const { userName, partnerName } = useUserProfile();

  const [audienceDrawerVisible, setAudienceDrawerVisible] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // 5-second progress bar animation via useState initializer
  const [progressAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible || !photoUri) return;

    if (!isPaused && !audienceDrawerVisible) {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          onClose();
        }
      });
    } else {
      progressAnim.stopAnimation();
    }
  }, [visible, photoUri, isPaused, audienceDrawerVisible, onClose, progressAnim]);

  const handleModalShow = () => {
    progressAnim.setValue(0);
    setIsPaused(false);
    setAudienceDrawerVisible(false);
  };

  const handleOpenDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsPaused(true);
    setAudienceDrawerVisible(true);
  };

  const handleCloseDrawer = () => {
    setAudienceDrawerVisible(false);
    setIsPaused(false);
  };

  const handlePanicDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Alert.alert(
      '🚨 緊急撤回限時動態',
      '確定要立即刪除這則私密限時動態嗎？刪除後觀眾將無法再查看。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定刪除 (安全撤回)',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            onClose();
            if (onDeleted) onDeleted();
            Alert.alert('已安全撤回', '限時動態已即時刪除，伺服器快取已清除！');
          },
        },
      ]
    );
  };

  // Upward swipe gesture to open Audience Drawer
  const panGesture = Gesture.Pan()
    .activeOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationY < -30) {
        handleOpenDrawer();
      }
    });

  if (!visible || !photoUri) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      onShow={handleModalShow}
    >
      <View style={styles.container}>
        <GestureDetector gesture={panGesture}>
          <View style={styles.viewerWrapper}>
            {/* Fullscreen Story Image */}
            <Image source={{ uri: photoUri }} style={styles.storyImage} resizeMode="cover" />

            {/* Top 5s Progress Bar */}
            <View style={styles.topProgressTrack}>
              <Animated.View
                style={[
                  styles.topProgressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            {/* Story Header: Profile + Handle + Time */}
            <View style={styles.storyHeader}>
              <View style={styles.profileRow}>
                <View style={styles.avatarRing}>
                  <Ionicons name="person" size={14} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.userNameText}>{userName}</Text>
                  <Text style={styles.timeTagText}>剛剛 • 公開</Text>
                </View>
              </View>

              <View style={styles.headerRightButtons}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={onClose}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Actions Bar */}
            <View style={styles.bottomBar}>
              {/* Audience Pill (Swipe Up Hint) */}
              <TouchableOpacity
                style={styles.audiencePill}
                onPress={handleOpenDrawer}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-up" size={14} color="#FFFFFF" />
                <View style={styles.audiencePillRow}>
                  <Ionicons name="eye" size={13} color="#FFFFFF" />
                  <Text style={styles.audiencePillText}>18 次觀看</Text>
                </View>
              </TouchableOpacity>

              {/* Panic Delete Button */}
              <TouchableOpacity
                style={styles.panicDeleteBtn}
                onPress={handlePanicDelete}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={styles.panicDeleteText}>緊急撤回</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GestureDetector>

        {/* Audience Viewer Drawer (向上滑動查看名單) */}
        <Modal
          visible={audienceDrawerVisible}
          transparent
          animationType="slide"
          onRequestClose={handleCloseDrawer}
        >
          <View style={styles.drawerBackdrop}>
            <TouchableOpacity
              style={styles.drawerBackdropDismiss}
              activeOpacity={1}
              onPress={handleCloseDrawer}
            />

            <BlurView intensity={85} tint="dark" style={styles.drawerContent}>
              {/* Drawer Handle */}
              <View style={styles.drawerHandle} />

              {/* Drawer Title & Stats */}
              <View style={styles.drawerHeaderRow}>
                <View>
                  <Text style={styles.drawerTitle}>動態分析與觀看名單</Text>
                  <Text style={styles.drawerSubtitle}>共 18 人已瀏覽此私密限時動態</Text>
                </View>

                <TouchableOpacity style={styles.drawerDeleteIconBtn} onPress={handlePanicDelete}>
                  <Ionicons name="trash" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {/* Special Highlight: Partner Account (第一位固定伴侶) */}
              <View style={styles.partnerHighlightCard}>
                <View style={styles.partnerHeaderRow}>
                  <View style={styles.partnerAvatarBox}>
                    <Ionicons name="heart" size={16} color="#EC4899" />
                  </View>
                  <View style={styles.partnerInfo}>
                    <View style={styles.partnerNameRow}>
                      <Text style={styles.partnerNameText}>{partnerName}</Text>
                      <View style={styles.partnerBadge}>
                        <Text style={styles.partnerBadgeText}>親密伴侶</Text>
                      </View>
                    </View>
                    <Text style={styles.partnerSeenTime}>1 分鐘前已完整看過</Text>
                  </View>
                </View>

                {/* Partner Fake Panicked DM Speech Bubbles */}
                <View style={styles.partnerDMBubble}>
                  <MaterialCommunityIcons name="chat-alert-outline" size={16} color="#EF4444" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dmBubbleTitle}>伴侶私訊傳來警告：</Text>
                    <Text style={styles.dmBubbleText}>
                      「？？你瘋了嗎怎麼發這個？！快點刪掉啦...被別人看到了啦😱😱」
                    </Text>
                  </View>
                </View>
              </View>

              {/* Viewers List */}
              <Text style={styles.listSectionHeader}>其他觀看者 (已看過 17 人)：</Text>
              <ScrollView style={styles.viewerListScroll} showsVerticalScrollIndicator={false}>
                {MOCK_VIEWERS.map((viewer) => (
                  <View key={viewer.id} style={styles.viewerRow}>
                    <View style={styles.viewerAvatar}>
                      <Text style={styles.viewerAvatarLetter}>
                        {viewer.handle.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.viewerTextGroup}>
                      <Text style={styles.viewerHandleText}>{viewer.handle}</Text>
                      <Text style={styles.viewerSubText}>{viewer.name} • {viewer.time}</Text>
                    </View>
                    {viewer.reaction && (
                      <View style={styles.reactionPill}>
                        <Text style={styles.reactionEmoji}>{viewer.reaction}</Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.viewerMoreBtn}>
                      <Feather name="more-horizontal" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {/* Bottom Panic Recall Banner in Drawer */}
              <TouchableOpacity
                style={styles.drawerBottomDeleteBtn}
                onPress={handlePanicDelete}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-outline" size={18} color="#FFFFFF" />
                <Text style={styles.drawerBottomDeleteText}>立即緊急撤回並徹底刪除動態</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  viewerWrapper: {
    flex: 1,
    position: 'relative',
  },
  storyImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topProgressTrack: {
    position: 'absolute',
    top: 48,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 2,
    overflow: 'hidden',
    zIndex: 50,
  },
  topProgressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  storyHeader: {
    position: 'absolute',
    top: 58,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 50,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeTagText: {
    fontSize: 10,
    color: '#CBD5E1',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 34,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 50,
  },
  audiencePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    gap: 2,
  },
  audiencePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  audiencePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  panicDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  panicDeleteText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  drawerBackdropDismiss: {
    flex: 1,
  },
  drawerContent: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  drawerHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  drawerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  drawerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  drawerDeleteIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  partnerHighlightCard: {
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#EC4899',
    marginBottom: 16,
  },
  partnerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  partnerAvatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(236, 72, 153, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EC4899',
  },
  partnerInfo: {
    flex: 1,
  },
  partnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partnerNameText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  partnerBadge: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  partnerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  partnerSeenTime: {
    fontSize: 10,
    color: '#F472B6',
    marginTop: 2,
  },
  partnerDMBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  dmBubbleTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FCA5A5',
    marginBottom: 2,
  },
  dmBubbleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 17,
  },
  listSectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 10,
  },
  viewerListScroll: {
    maxHeight: 220,
    marginBottom: 16,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  viewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  viewerAvatarLetter: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  viewerTextGroup: {
    flex: 1,
  },
  viewerHandleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewerSubText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  reactionPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  viewerMoreBtn: {
    padding: 6,
  },
  drawerBottomDeleteBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 14,
  },
  drawerBottomDeleteText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
