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
  Animated,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '../services/userProfile';
import {
  listDailyCheckInPhotos,
  listSandboxSnapshots,
  listSandboxImages,
} from '../services/mediaStorage';

interface MockStoryComposerProps {
  visible: boolean;
  onClose: () => void;
  initialPhotoUri?: string | null;
  onStoryPublished: (photoUri: string) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const MockStoryComposer: React.FC<MockStoryComposerProps> = ({
  visible,
  onClose,
  initialPhotoUri,
  onStoryPublished,
}) => {
  const { userName } = useUserProfile();

  const [availablePhotos, setAvailablePhotos] = useState<string[]>([]);
  const [selectedUri, setSelectedUri] = useState<string | null>(initialPhotoUri || null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Animated progress bar
  const [progressAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let isMounted = true;
    async function loadVaultPhotos() {
      const photos: string[] = [];
      try {
        const checkins = await listDailyCheckInPhotos();
        checkins.forEach((c) => photos.push(c.uri));
      } catch {}
      try {
        const snaps = await listSandboxSnapshots();
        snaps.forEach((s) => photos.push(s));
      } catch {}
      try {
        const media = await listSandboxImages();
        media.forEach((m) => photos.push(m));
      } catch {}

      if (isMounted) {
        setAvailablePhotos(photos);
        if (!selectedUri && photos.length > 0) {
          setSelectedUri(photos[0]);
        }
      }
    }

    if (visible) {
      void loadVaultPhotos();
    }

    return () => {
      isMounted = false;
    };
  }, [visible, selectedUri]);

  const handleModalShow = () => {
    setIsUploading(false);
    setUploadProgress(0);
    progressAnim.setValue(0);
    if (initialPhotoUri) {
      setSelectedUri(initialPhotoUri);
    }
  };

  const handlePublish = () => {
    if (!selectedUri || isUploading) return;
    setIsUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // 1.5 seconds simulated upload sequence
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setIsUploading(false);
      onStoryPublished(selectedUri);
    });

    // Tick haptics during upload
    const t1 = setTimeout(() => {
      setUploadProgress(40);
      Haptics.selectionAsync().catch(() => {});
    }, 500);

    const t2 = setTimeout(() => {
      setUploadProgress(80);
      Haptics.selectionAsync().catch(() => {});
    }, 1000);

    const t3 = setTimeout(() => {
      setUploadProgress(100);
    }, 1450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      onShow={handleModalShow}
    >
      <View style={styles.container}>
        {/* Main Background Image Preview */}
        {selectedUri ? (
          <Image source={{ uri: selectedUri }} style={styles.mainImage} resizeMode="cover" />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="image-off-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyText}>沙盒內暫無照片可發布</Text>
            <Text style={styles.emptySub}>請先至「生理打卡」或「即時相機」拍攝私密照</Text>
          </View>
        )}

        {/* Top Story Tool Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topIconBtn} onPress={onClose} disabled={isUploading}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topToolGroup}>
            <TouchableOpacity style={styles.topToolBtn}>
              <Text style={styles.textToolLabel}>Aa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.topToolBtn}>
              <MaterialCommunityIcons name="sticker-emoji" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topToolBtn}>
              <Feather name="music" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topToolBtn}>
              <Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topToolBtn}>
              <Feather name="more-horizontal" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Horizontal Photo Selector Strip */}
        {availablePhotos.length > 1 && !isUploading && (
          <View style={styles.selectorWrapper}>
            <Text style={styles.selectorTitle}>選擇要發布的私密檔案：</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripContent}>
              {availablePhotos.map((uri, idx) => (
                <TouchableOpacity
                  key={`${uri}_${idx}`}
                  style={[
                    styles.thumbCard,
                    selectedUri === uri && styles.thumbCardActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedUri(uri);
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={styles.thumbImage} />
                  {selectedUri === uri && (
                    <View style={styles.thumbCheck}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Uploading Overlay Modal */}
        {isUploading && (
          <View style={styles.uploadingOverlay}>
            <View style={styles.uploadingCard}>
              <View style={styles.uploadingSpinnerRing}>
                <Ionicons name="cloud-upload" size={32} color="#EC4899" />
              </View>
              <Text style={styles.uploadingTitle}>正在發布至公開限時動態...</Text>
              <Text style={styles.uploadingSub}>【{userName}】的大尺度私密照片即將外流</Text>

              <View style={styles.uploadProgressBarTrack}>
                <Animated.View
                  style={[
                    styles.uploadProgressBarFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.uploadingPercentText}>{uploadProgress}%</Text>
            </View>
          </View>
        )}

        {/* Bottom Action Bar */}
        {!isUploading && (
          <View style={styles.bottomBar}>
            {/* Story Button */}
            <TouchableOpacity
              style={styles.storyPublishBtn}
              onPress={handlePublish}
              activeOpacity={0.85}
              disabled={!selectedUri}
            >
              <View style={styles.storyAvatarRing}>
                <Ionicons name="person" size={12} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.storyPublishText}>你的限時動態</Text>
                <Text style={styles.storyPublishSub}>公開 • 所有人可見</Text>
              </View>
            </TouchableOpacity>

            {/* Close Friends Button */}
            <TouchableOpacity
              style={styles.closeFriendsBtn}
              onPress={handlePublish}
              activeOpacity={0.85}
              disabled={!selectedUri}
            >
              <View style={styles.greenStarBadge}>
                <Ionicons name="star" size={11} color="#FFFFFF" />
              </View>
              <Text style={styles.closeFriendsText}>摯友</Text>
            </TouchableOpacity>

            {/* Send Arrow Button */}
            <TouchableOpacity
              style={styles.sendArrowBtn}
              onPress={handlePublish}
              activeOpacity={0.85}
              disabled={!selectedUri}
            >
              <Ionicons name="chevron-forward" size={20} color="#000000" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 50,
  },
  topIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topToolGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topToolBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textToolLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  selectorWrapper: {
    position: 'absolute',
    bottom: 96,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 40,
  },
  selectorTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  stripContent: {
    gap: 8,
  },
  thumbCard: {
    width: 54,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
  },
  thumbCardActive: {
    borderColor: '#EC4899',
    borderWidth: 2.5,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbCheck: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 34,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 50,
  },
  storyPublishBtn: {
    flex: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  storyAvatarRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyPublishText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  storyPublishSub: {
    color: '#94A3B8',
    fontSize: 9,
  },
  closeFriendsBtn: {
    flex: 1.2,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  greenStarBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFriendsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sendArrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: 24,
  },
  uploadingCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EC4899',
    gap: 8,
  },
  uploadingSpinnerRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  uploadingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  uploadingSub: {
    fontSize: 11,
    color: '#F472B6',
    textAlign: 'center',
    marginBottom: 8,
  },
  uploadProgressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginTop: 6,
  },
  uploadProgressBarFill: {
    height: '100%',
    backgroundColor: '#EC4899',
  },
  uploadingPercentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
});
