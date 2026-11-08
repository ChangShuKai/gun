import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';

interface LiquidGlassDockProps {
  activeTab: 'action' | 'analytics';
  onTabChange: (tab: 'action' | 'analytics') => void;
}

export const LiquidGlassDock: React.FC<LiquidGlassDockProps> = ({
  activeTab,
  onTabChange,
}) => {
  const handlePress = async (tab: 'action' | 'analytics') => {
    if (tab !== activeTab) {
      try {
        await Haptics.selectionAsync();
      } catch {}
      onTabChange(tab);
    }
  };

  return (
    <View style={styles.dockWrapper} pointerEvents="box-none">
      <View style={styles.glassContainer}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 65 : 85}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.innerRow}>
          {/* Action Tab (尻尻) */}
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'action' && styles.activeTabButton,
            ]}
            activeOpacity={0.7}
            onPress={() => handlePress('action')}
          >
            <View style={styles.iconBox}>
              <Ionicons
                name={activeTab === 'action' ? 'flame' : 'flame-outline'}
                size={22}
                color={activeTab === 'action' ? THEME.colors.primaryLight : THEME.colors.textMuted}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'action' ? styles.activeTabLabel : styles.inactiveTabLabel,
              ]}
            >
              尻尻
            </Text>
          </TouchableOpacity>

          {/* Analytics Tab (分析) */}
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'analytics' && styles.activeTabButton,
            ]}
            activeOpacity={0.7}
            onPress={() => handlePress('analytics')}
          >
            <View style={styles.iconBox}>
              <Ionicons
                name={activeTab === 'analytics' ? 'stats-chart' : 'stats-chart-outline'}
                size={20}
                color={activeTab === 'analytics' ? THEME.colors.primaryLight : THEME.colors.textMuted}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'analytics' ? styles.activeTabLabel : styles.inactiveTabLabel,
              ]}
            >
              分析
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  glassContainer: {
    width: 240,
    height: 64,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: 'rgba(19, 27, 46, 0.72)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  innerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  activeTabLabel: {
    fontWeight: '800',
    color: THEME.colors.text,
  },
  inactiveTabLabel: {
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
});
