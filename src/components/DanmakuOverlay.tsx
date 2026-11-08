import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DanmakuComment } from '../types';
import { danmakuService } from '../services/danmakuService';

interface DanmakuOverlayProps {
  isActive?: boolean;
  densityMultiplier?: number;
  onToggleMute?: (muted: boolean) => void;
}

interface ActiveDanmaku {
  item: DanmakuComment;
  animX: Animated.Value;
  lane: number;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const LANES_COUNT = 4;
const LANE_HEIGHT = 32;

export const DanmakuOverlay: React.FC<DanmakuOverlayProps> = ({
  isActive = true,
  densityMultiplier = 1.0,
  onToggleMute,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const isVisible = isActive && !isMuted;
  const [activeItems, setActiveItems] = useState<ActiveDanmaku[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Spawn new Danmaku items periodically
  useEffect(() => {
    if (!isVisible) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const baseInterval = Math.max(900, Math.round(2200 / densityMultiplier));

    const spawnComment = () => {
      const intensity = densityMultiplier > 1.5 ? 'high' : 'normal';
      const [newComment] = danmakuService.getRandomDanmakuList(1, intensity);
      if (!newComment) return;

      const lane = Math.floor(Math.random() * LANES_COUNT);
      const animX = new Animated.Value(SCREEN_WIDTH + 20);

      const activeItem: ActiveDanmaku = {
        item: newComment,
        animX,
        lane,
      };

      setActiveItems((prev) => [...prev.slice(-14), activeItem]);

      const duration = Math.max(3800, Math.round((newComment.speed || 8000) / densityMultiplier));

      Animated.timing(animX, {
        toValue: -380,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => {
        // Remove item after exiting screen
        setActiveItems((prev) => prev.filter((i) => i !== activeItem));
      });
    };

    // Initial spawn
    spawnComment();

    intervalRef.current = setInterval(spawnComment, baseInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isVisible, densityMultiplier]);

  const handleToggle = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      setActiveItems([]);
    }
    if (onToggleMute) onToggleMute(!nextMuted);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Floating Danmaku Toggle Switch */}
      <TouchableOpacity
        style={[styles.toggleBtn, isVisible && styles.toggleBtnActive]}
        onPress={handleToggle}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons
          name={isVisible ? 'message-bulleted' : 'message-bulleted-off'}
          size={16}
          color={isVisible ? '#38BDF8' : '#94A3B8'}
        />
        <Text style={[styles.toggleBtnText, isVisible && styles.toggleBtnTextActive]}>
          {isVisible ? '彈幕 ON' : '彈幕 OFF'}
        </Text>
      </TouchableOpacity>

      {/* Dynamic Flying Danmaku Tracks */}
      {isVisible && (
        <View style={styles.tracksArea} pointerEvents="none">
          {activeItems.map((entry, index) => {
            const { item, animX, lane } = entry;
            const topPos = 8 + lane * LANE_HEIGHT;

            return (
              <Animated.View
                key={`${item.id}_${index}`}
                style={[
                  styles.danmakuBubble,
                  {
                    top: topPos,
                    transform: [{ translateX: animX }],
                    borderColor: item.isVIP ? '#F59E0B' : 'rgba(255, 255, 255, 0.12)',
                    backgroundColor: item.isVIP ? 'rgba(30, 20, 0, 0.82)' : 'rgba(15, 23, 42, 0.78)',
                  },
                ]}
              >
                {item.isVIP && (
                  <View style={styles.vipBadge}>
                    <Ionicons name="sparkles" size={10} color="#F59E0B" />
                    <Text style={styles.vipText}>VIP</Text>
                  </View>
                )}
                <Text style={[styles.senderName, { color: item.color }]}>
                  {item.sender}:
                </Text>
                <Text style={styles.danmakuText}>{item.text}</Text>
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  toggleBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 100,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    borderColor: '#38BDF8',
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  toggleBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  tracksArea: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: 0,
    height: LANES_COUNT * LANE_HEIGHT + 16,
    overflow: 'hidden',
  },
  danmakuBubble: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#F59E0B',
  },
  vipText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FBBF24',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '800',
  },
  danmakuText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F8FAFC',
  },
});
