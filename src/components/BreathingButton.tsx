import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface BreathingButtonProps {
  onPress: () => void;
  label?: string;
  sublabel?: string;
}

export const BreathingButton: React.FC<BreathingButtonProps> = ({
  onPress,
  label = '開始',
  sublabel = '點擊展開佈局',
}) => {
  const pulseScale1 = useSharedValue(1);
  const pulseOpacity1 = useSharedValue(0.6);

  const pulseScale2 = useSharedValue(1);
  const pulseOpacity2 = useSharedValue(0.4);

  useEffect(() => {
    // Ring 1 pulse loop
    pulseScale1.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 2200, easing: Easing.out(Easing.ease) }),
        withTiming(1.0, { duration: 2200, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    pulseOpacity1.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: 2200, easing: Easing.out(Easing.ease) }),
        withTiming(0.6, { duration: 2200, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    // Ring 2 delayed pulse loop
    pulseScale2.value = withRepeat(
      withSequence(
        withTiming(1.55, { duration: 2600, easing: Easing.out(Easing.ease) }),
        withTiming(1.0, { duration: 2600, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    pulseOpacity2.value = withRepeat(
      withSequence(
        withTiming(0.05, { duration: 2600, easing: Easing.out(Easing.ease) }),
        withTiming(0.35, { duration: 2600, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulseOpacity1, pulseOpacity2, pulseScale1, pulseScale2]);

  const animatedRingStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale1.value }],
    opacity: pulseOpacity1.value,
  }));

  const animatedRingStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale2.value }],
    opacity: pulseOpacity2.value,
  }));

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    onPress();
  };

  return (
    <View style={styles.container}>
      {/* Outer Pulse Ring 2 */}
      <Animated.View style={[styles.pulseRing, styles.ring2, animatedRingStyle2]} />

      {/* Outer Pulse Ring 1 */}
      <Animated.View style={[styles.pulseRing, styles.ring1, animatedRingStyle1]} />

      {/* Core Glowing Button */}
      <TouchableOpacity
        style={styles.coreButton}
        activeOpacity={0.88}
        onPress={handlePress}
      >
        <View style={styles.buttonInner}>
          <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 4 }} />
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.sublabel}>{sublabel}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const BUTTON_SIZE = 170;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BUTTON_SIZE * 1.8,
    height: BUTTON_SIZE * 1.8,
  },
  pulseRing: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 2,
  },
  ring1: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  ring2: {
    borderColor: 'rgba(139, 92, 246, 0.5)',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  coreButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 25,
    elevation: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  buttonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginTop: 4,
  },
  sublabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
