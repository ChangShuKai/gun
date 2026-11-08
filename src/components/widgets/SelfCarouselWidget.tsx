import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../../constants/theme';
import {
  getAllSelfCarouselImages,
  SelfCarouselImageItem,
} from '../../services/mediaStorage';

interface SelfCarouselWidgetProps {
  onOpenCheckIn?: () => void;
  autoPlayIntervalSec?: number;
}

export const SelfCarouselWidget: React.FC<SelfCarouselWidgetProps> = ({
  onOpenCheckIn,
  autoPlayIntervalSec = 6,
}) => {
  const [images, setImages] = useState<SelfCarouselImageItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBlurred, setIsBlurred] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [intervalSec, setIntervalSec] = useState<number>(autoPlayIntervalSec);

  // Standard React Native Animated Values via useState initializer
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let isMounted = true;
    getAllSelfCarouselImages().then((list) => {
      if (isMounted) {
        setImages(list);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleReload = () => {
    setIsLoading(true);
    getAllSelfCarouselImages().then((list) => {
      setImages(list);
      setIsLoading(false);
    });
  };

  const changeSlide = (newIndex: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(newIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    if (images.length <= 1) return;
    Haptics.selectionAsync().catch(() => {});
    const nextIdx = (currentIndex + 1) % images.length;
    changeSlide(nextIdx);
  };

  const handlePrev = () => {
    if (images.length <= 1) return;
    Haptics.selectionAsync().catch(() => {});
    const prevIdx = (currentIndex - 1 + images.length) % images.length;
    changeSlide(prevIdx);
  };

  // Auto-play timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (!isPaused && images.length > 1) {
      timerRef.current = setInterval(() => {
        if (images.length <= 1) return;
        setCurrentIndex((prev) => {
          const nextIdx = (prev + 1) % images.length;
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          });
          return nextIdx;
        });
      }, intervalSec * 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, images.length, intervalSec, fadeAnim]);

  // Double tap to toggle zoom (1x vs 1.75x)
  const toggleZoom = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const targetScale = isZoomed ? 1 : 1.75;
    setIsZoomed(!isZoomed);
    Animated.timing(scaleAnim, {
      toValue: targetScale,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      toggleZoom();
    });

  // Swipe gesture for single hand navigation
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-25, 25])
    .onEnd((e) => {
      if (e.translationX < -40) {
        handleNext();
      } else if (e.translationX > 40) {
        handlePrev();
      }
    });

  const composedGestures = Gesture.Exclusive(doubleTapGesture, swipeGesture);

  const currentItem = images[currentIndex];

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primaryLight} />
        <Text style={styles.loadingText}>載入私密沙盒圖庫中...</Text>
      </View>
    );
  }

  if (images.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <MaterialCommunityIcons name="image-multiple-outline" size={36} color="#A78BFA" />
        </View>
        <Text style={styles.emptyTitle}>沙盒內尚無「自己」的紀錄</Text>
        <Text style={styles.emptySubtitle}>
          進行每日生理打卡（尺寸、睪丸、今日最色）或在錄影時截取高光快照，將自動在此流暢輪播！
        </Text>
        {onOpenCheckIn && (
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={onOpenCheckIn}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={16} color="#FFFFFF" />
            <Text style={styles.emptyActionText}>立即每日打卡拍攝</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Interactive Image Container with gestures */}
      <GestureDetector gesture={composedGestures}>
        <View style={styles.imageWrapper}>
          <Animated.Image
            source={{ uri: currentItem.uri }}
            style={[
              styles.image,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
            resizeMode="cover"
          />

          {/* Privacy Blur Overlay */}
          {isBlurred && (
            <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill}>
              <View style={styles.blurNotice}>
                <Ionicons name="eye-off" size={28} color="#FFFFFF" />
                <Text style={styles.blurNoticeText}>隱私模糊保護中</Text>
                <Text style={styles.blurNoticeSub}>點擊右上角眼睛圖示展開</Text>
              </View>
            </BlurView>
          )}
        </View>
      </GestureDetector>

      {/* Top Floating Controls */}
      <View style={styles.topControlRow}>
        {/* Info Tag */}
        <View style={styles.metaPill}>
          <Text style={styles.metaTag}>{currentItem.typeLabel}</Text>
          <Text style={styles.metaDate}>• {currentItem.dateLabel}</Text>
        </View>

        {/* Action Buttons: Pause/Play + Blur Toggle + Refresh */}
        <View style={styles.topBtnGroup}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setIsPaused((p) => !p);
            }}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={14}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, isBlurred && styles.iconBtnActive]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setIsBlurred((b) => !b);
            }}
          >
            <Ionicons
              name={isBlurred ? 'eye-off' : 'eye'}
              size={14}
              color={isBlurred ? THEME.colors.primaryLight : '#FFFFFF'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleReload}
          >
            <Ionicons name="refresh" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Left/Right Click Nav Arrows for convenience */}
      <TouchableOpacity
        style={[styles.navArrow, styles.navArrowLeft]}
        onPress={handlePrev}
      >
        <Ionicons name="chevron-back" size={20} color="rgba(255, 255, 255, 0.75)" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navArrow, styles.navArrowRight]}
        onPress={handleNext}
      >
        <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.75)" />
      </TouchableOpacity>

      {/* Bottom Counter & Indicator Strip */}
      <View style={styles.bottomBar}>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>

        {/* Small speed indicator */}
        <TouchableOpacity
          style={styles.speedBtn}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setIntervalSec((prev) => (prev === 4 ? 6 : prev === 6 ? 10 : 4));
          }}
        >
          <MaterialCommunityIcons name="timer-sand" size={12} color="#CBD5E1" />
          <Text style={styles.speedText}>{intervalSec}s 輪播</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050811',
    position: 'relative',
    overflow: 'hidden',
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#050811',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F1F5F9',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radius.full,
    marginTop: 8,
  },
  emptyActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  topControlRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'box-none',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  metaTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FDE047',
  },
  metaDate: {
    fontSize: 10,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  topBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  iconBtnActive: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  navArrow: {
    position: 'absolute',
    top: '45%',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  navArrowLeft: {
    left: 8,
  },
  navArrowRight: {
    right: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  counterBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  counterText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  speedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  speedText: {
    fontSize: 10,
    color: '#CBD5E1',
    fontWeight: '700',
  },
  blurNotice: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  blurNoticeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  blurNoticeSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
