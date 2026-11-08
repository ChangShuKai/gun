import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { useUserProfile } from '../services/userProfile';
import { LeakedVCRPlayer } from '../components/LeakedVCRPlayer';
import { listDailyCheckInPhotos, listSandboxSnapshots } from '../services/mediaStorage';

interface BreakingNewsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BreakingNewsModal: React.FC<BreakingNewsModalProps> = ({
  visible,
  onClose,
}) => {
  const { userName, partnerName, userLength } = useUserProfile();
  const [vcrPlayerVisible, setVcrPlayerVisible] = useState<boolean>(false);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);

  // Load latest photo from vault as preview thumbnail
  useEffect(() => {
    let isMounted = true;
    async function loadThumb() {
      try {
        const checkins = await listDailyCheckInPhotos();
        if (checkins.length > 0 && isMounted) {
          setPreviewThumbnail(checkins[0].uri);
          return;
        }
        const snaps = await listSandboxSnapshots();
        if (snaps.length > 0 && isMounted) {
          setPreviewThumbnail(snaps[0]);
        }
      } catch {}
    }

    if (visible) {
      void loadThumb();
    }

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const handleLaunchVCR = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setVcrPlayerVisible(true);
  };

  const currentDateStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 獨家即時`;
  })();

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <View style={styles.newsPaperContainer}>
            {/* Top Red Breaking Ticker */}
            <View style={styles.tickerHeader}>
              <View style={styles.tickerBadge}>
                <Text style={styles.tickerBadgeText}>🚨 BREAKING NEWS</Text>
              </View>
              <Text style={styles.tickerScrollText}>
                【八卦狗仔特報】今日最速熱搜第一名 • 伺服器超載癱瘓中
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
              {/* Media Title Header */}
              <View style={styles.paperHeader}>
                <Text style={styles.paperName}>壹週私密八卦特刊</Text>
                <Text style={styles.publishDate}>{currentDateStr} • 記者 鏡頭狗仔 深入報導</Text>
              </View>

              {/* Main Shocking Headline */}
              <View style={styles.headlineBox}>
                <View style={styles.exclusivePill}>
                  <Text style={styles.exclusivePillText}>【獨家震撼彈】</Text>
                </View>
                <Text style={styles.headlineTitle}>
                  驚爆！知名頂流【{userName}】私密大尺度畫面全面外流！
                </Text>
              </View>

              {/* Video Preview Teaser Box */}
              <TouchableOpacity
                style={styles.previewBox}
                onPress={handleLaunchVCR}
                activeOpacity={0.88}
              >
                {previewThumbnail ? (
                  <Image source={{ uri: previewThumbnail }} style={styles.previewImage} blurRadius={18} />
                ) : (
                  <View style={styles.fallbackPreviewBg} />
                )}

                {/* Surveillance Overlay Details */}
                <View style={styles.previewSurveillanceOverlay}>
                  <View style={styles.previewRecTag}>
                    <View style={styles.recDot} />
                    <Text style={styles.previewRecText}>LIVE ARCHIVE</Text>
                  </View>
                  <Text style={styles.previewSecretTag}>CONFIDENTIAL 18+</Text>
                </View>

                {/* Big Giant Play Button */}
                <View style={styles.playButtonCircle}>
                  <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 4 }} />
                </View>

                {/* Bottom Callout Banner */}
                <View style={styles.previewBottomCallout}>
                  <Text style={styles.previewCalloutText}>▶ 點擊立即觀看 60 秒完整外流 VCR</Text>
                  <Text style={styles.previewCalloutSub}>未經剪輯完整原檔 • 建議配戴耳機觀看</Text>
                </View>
              </TouchableOpacity>

              {/* Article Lead Story */}
              <View style={styles.articleBody}>
                <Text style={styles.leadParagraph}>
                  據知情人士與親密伴侶【{partnerName}】私下透露，其真實尺寸高達驚人的【{userLength} 公分】！
                  該私密影像日前意外自內部機密沙盒流出，畫面曝光後立刻引發全網瘋傳，
                  網友紛紛直呼「這尺寸太頂了」、「青筋與飽滿度簡直是天菜神作」！
                </Text>

                <View style={styles.quoteCard}>
                  <Feather name="message-circle" size={16} color="#EF4444" />
                  <Text style={styles.quoteText}>
                    伴侶【{partnerName}】私下回應：「每一次看都讓人臉紅心跳，這完全是不可外洩的極品畫面...」
                  </Text>
                </View>

                {/* Buzz comments section */}
                <View style={styles.commentsBox}>
                  <Text style={styles.commentsTitle}>🔥 網友即時暴動留言 (9,999+ 則)</Text>
                  <View style={styles.commentItem}>
                    <Text style={styles.commentUser}>匿名酸民 A：</Text>
                    <Text style={styles.commentText}>
                      天啊居然有【{userLength} cm】！這身材比例太不講武德了吧！
                    </Text>
                  </View>
                  <View style={styles.commentItem}>
                    <Text style={styles.commentUser}>吃瓜群眾 B：</Text>
                    <Text style={styles.commentText}>
                      看完 60 秒 VCR 整個人都沒了...【{userName}】完全是頂流無誤！
                    </Text>
                  </View>
                  <View style={styles.commentItem}>
                    <Text style={styles.commentUser}>死忠粉絲 C：</Text>
                    <Text style={styles.commentText}>
                      支持原片永久珍藏！這根本是藝術品等級的生理狀態！
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bottom Big CTA */}
              <TouchableOpacity
                style={styles.mainCtaBtn}
                onPress={handleLaunchVCR}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="movie-play" size={22} color="#FFFFFF" />
                <Text style={styles.mainCtaBtnText}>點擊觀看外流 VCR (60s 全紀錄)</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 60-Second Leaked VCR Player */}
      <LeakedVCRPlayer
        visible={vcrPlayerVisible}
        onClose={() => setVcrPlayerVisible(false)}
        userName={userName}
        partnerName={partnerName}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  newsPaperContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 2,
    borderColor: '#EF4444',
    maxHeight: '92%',
    overflow: 'hidden',
  },
  tickerHeader: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  tickerBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tickerBadgeText: {
    color: '#FDE047',
    fontSize: 10,
    fontWeight: '900',
  },
  tickerScrollText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 40,
  },
  paperHeader: {
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    paddingBottom: 8,
    marginBottom: 12,
  },
  paperName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  publishDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  headlineBox: {
    marginBottom: 14,
  },
  exclusivePill: {
    backgroundColor: '#EF4444',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  exclusivePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  headlineTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FDE047',
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  previewBox: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#050811',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  fallbackPreviewBg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
    position: 'absolute',
  },
  previewSurveillanceOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewRecTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  previewRecText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  previewSecretTag: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playButtonCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  previewBottomCallout: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewCalloutText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  previewCalloutSub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
  articleBody: {
    marginBottom: 16,
  },
  leadParagraph: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  quoteCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    marginBottom: 14,
  },
  quoteText: {
    flex: 1,
    fontSize: 11,
    color: '#FCA5A5',
    lineHeight: 18,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  commentsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  commentsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 4,
  },
  commentItem: {
    paddingVertical: 2,
  },
  commentUser: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
  },
  commentText: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  mainCtaBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 24,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  mainCtaBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
