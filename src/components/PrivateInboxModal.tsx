import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { SecretNote } from '../types';
import { panelDramaService } from '../services/panelDramaService';

interface PrivateInboxModalProps {
  visible: boolean;
  onClose: () => void;
  onRewardClaimed?: (note: SecretNote) => void;
}

export const PrivateInboxModal: React.FC<PrivateInboxModalProps> = ({
  visible,
  onClose,
  onRewardClaimed,
}) => {
  const [notes, setNotes] = useState<SecretNote[]>([]);
  const [activeHeartAnimId, setActiveHeartAnimId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    const list = await panelDramaService.getSecretNotes();
    setNotes(list);
  }, []);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        void loadNotes();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible, loadNotes]);

  const handleClaimReward = async (note: SecretNote) => {
    if (note.rewardClaimed) return;

    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setActiveHeartAnimId(note.id);
    await panelDramaService.markAsReadAndClaimReward(note.id);
    await loadNotes();

    if (onRewardClaimed) {
      onRewardClaimed(note);
    }

    setTimeout(() => {
      setActiveHeartAnimId(null);
    }, 1200);
  };

  const renderNoteItem = ({ item }: { item: SecretNote }) => {
    const isUnread = !item.isRead;
    const isShowingReaction = activeHeartAnimId === item.id;

    return (
      <View style={[styles.noteCard, isUnread && styles.noteCardUnread]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.senderInfoRow}>
            <View style={[styles.avatarCircle, { borderColor: item.senderColor }]}>
              <Ionicons
                name={(item.avatarIcon as keyof typeof Ionicons.glyphMap) || 'person'}
                size={18}
                color={item.senderColor}
              />
            </View>
            <View>
              <View style={styles.nameRow}>
                <Text style={[styles.senderName, { color: item.senderColor }]}>
                  {item.senderName}
                </Text>
                <View style={[styles.senderTitleBadge, { backgroundColor: item.senderColor + '22' }]}>
                  <Text style={[styles.senderTitleText, { color: item.senderColor }]}>
                    {item.senderTitle}
                  </Text>
                </View>
              </View>
              <Text style={styles.timestampText}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {isUnread && (
            <View style={styles.unreadBadge}>
              <View style={styles.unreadDot} />
              <Text style={styles.unreadText}>私密悄悄話</Text>
            </View>
          )}
        </View>

        {/* Secret Message Body */}
        <View style={[styles.messageBubble, { borderColor: item.senderColor + '44' }]}>
          <Text style={styles.messageText}>{item.message}</Text>
        </View>

        {/* Action / Reaction Bar */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[
              styles.replyActionBtn,
              item.rewardClaimed ? styles.replyActionBtnClaimed : { backgroundColor: item.senderColor + '22', borderColor: item.senderColor },
            ]}
            activeOpacity={0.75}
            onPress={() => handleClaimReward(item)}
            disabled={item.rewardClaimed}
          >
            {isShowingReaction ? (
              <View style={styles.reactionAnimRow}>
                <MaterialCommunityIcons name="heart-flash" size={16} color="#EC4899" />
                <Text style={styles.reactionAnimText}>已回傳心意！親密度 +5 ✨</Text>
              </View>
            ) : item.rewardClaimed ? (
              <View style={styles.reactionAnimRow}>
                <Ionicons name="checkmark-done" size={15} color="#94A3B8" />
                <Text style={styles.claimedText}>已讀並回傳心意 (好感已累積)</Text>
              </View>
            ) : (
              <View style={styles.reactionAnimRow}>
                <MaterialCommunityIcons name="email-fast-outline" size={16} color={item.senderColor} />
                <Text style={[styles.replyActionText, { color: item.senderColor }]}>
                  {item.replyActionLabel || '回傳愛心 ❤️ (好感度+5)'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="email-seal-outline" size={20} color="#EC4899" />
              </View>
              <View>
                <Text style={styles.title}>賽後暗線私信小紙條</Text>
                <Text style={styles.subtitle}>審查團成員私密一對一悄悄話 · 純本地沙盒</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Notes List */}
          {notes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="email-open-outline" size={44} color="#475569" />
              <Text style={styles.emptyTitle}>暫無私密悄悄話</Text>
              <Text style={styles.emptyDesc}>
                每次完成訓練結算或每日打卡後，有 30% 機率收到特定成員偷偷留給你的專屬私信喔！
              </Text>
            </View>
          ) : (
            <FlatList
              data={notes}
              keyExtractor={(item) => item.id}
              renderItem={renderNoteItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 36,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  closeBtn: {
    padding: 6,
  },
  listContent: {
    gap: 12,
    paddingBottom: 16,
  },
  noteCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noteCardUnread: {
    borderColor: '#EC4899',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  senderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '700',
  },
  senderTitleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  senderTitleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  timestampText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EC4899',
  },
  unreadText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EC4899',
  },
  messageBubble: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  messageText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
  replyActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  replyActionBtnClaimed: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  reactionAnimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  replyActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reactionAnimText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EC4899',
  },
  claimedText: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
