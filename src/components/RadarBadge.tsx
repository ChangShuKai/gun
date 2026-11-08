import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { arpRadar, SentryStatusResponse, ThreatLevel } from '../services/arpRadarService';

interface RadarBadgeProps {
  inline?: boolean;
}

export const RadarBadge: React.FC<RadarBadgeProps> = ({ inline = false }) => {
  const [status, setStatus] = useState<SentryStatusResponse>(arpRadar.getStatus());
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [editConfigVisible, setEditConfigVisible] = useState<boolean>(false);
  const [serverUrlInput, setServerUrlInput] = useState<string>(arpRadar.getServerUrl());
  const [targetIpInput, setTargetIpInput] = useState<string>(status.target.ip);

  useEffect(() => {
    // Start 2.5-second polling
    arpRadar.startPolling(2500);

    const unsubscribe = arpRadar.subscribe((latest) => {
      setStatus(latest);
    });

    return () => {
      unsubscribe();
      arpRadar.stopPolling();
    };
  }, []);

  const handleOpenDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setServerUrlInput(arpRadar.getServerUrl());
    setTargetIpInput(status.target.ip);
    setDrawerVisible(true);
  };

  const handleSaveConfig = async () => {
    if (serverUrlInput.trim()) {
      await arpRadar.setServerUrl(serverUrlInput.trim());
    }
    if (targetIpInput.trim() && targetIpInput.trim() !== status.target.ip) {
      await arpRadar.setTargetIp(targetIpInput.trim());
    }
    setEditConfigVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert('哨兵配置已更新', `伺服器: ${arpRadar.getServerUrl()}\n目標 IP: ${targetIpInput.trim()}`);
  };

  const getThreatVisuals = (level: ThreatLevel) => {
    switch (level) {
      case 'RED':
        return {
          color: THEME.colors.danger,
          label: '🚨 樓梯間逼近',
          subLabel: '天井直通 (<6ms)',
          bannerBg: 'rgba(239, 68, 68, 0.25)',
          borderColor: THEME.colors.danger,
        };
      case 'YELLOW':
        return {
          color: THEME.colors.warning,
          label: '📶 遠端使用中',
          subLabel: 'RC阻隔 (>15ms)',
          bannerBg: 'rgba(245, 158, 11, 0.15)',
          borderColor: THEME.colors.warning,
        };
      case 'GREEN':
        return {
          color: THEME.colors.success,
          label: '🛡️ 深度休眠',
          subLabel: '無封包轉發',
          bannerBg: 'rgba(16, 185, 129, 0.15)',
          borderColor: THEME.colors.success,
        };
      default:
        return {
          color: THEME.colors.textMuted,
          label: '哨兵離線',
          subLabel: '未連線後端',
          bannerBg: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
        };
    }
  };

  const visuals = getThreatVisuals(status.threat_level);

  return (
    <>
      {/* Floating Corner Indicator Badge */}
      <TouchableOpacity
        style={[
          styles.badgeContainer,
          !inline && styles.badgeFloating,
          { borderColor: visuals.borderColor },
          status.threat_level === 'RED' && styles.badgeRedGlow,
        ]}
        onPress={handleOpenDrawer}
        activeOpacity={0.8}
      >
        <View style={[styles.statusDot, { backgroundColor: visuals.color }]} />
        <MaterialCommunityIcons
          name="radar"
          size={16}
          color={visuals.color}
        />
        <View>
          <Text style={[styles.badgeText, { color: visuals.color }]}>
            {visuals.label}
          </Text>
        </View>
        {status.target.rtt_ms > 0 && (
          <View style={[styles.rttPill, { backgroundColor: `${visuals.color}20` }]}>
            <Text style={[styles.rttText, { color: visuals.color }]}>
              {status.target.rtt_ms}ms
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Slide-up Status Drawer */}
      <Modal
        visible={drawerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropDismiss}
            activeOpacity={1}
            onPress={() => setDrawerVisible(false)}
          />

          <BlurView intensity={80} tint="dark" style={styles.drawerCard}>
            {/* Drawer Handle */}
            <View style={styles.drawerHandle} />

            {/* Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerTitleGroup}>
                <MaterialCommunityIcons
                  name="radar"
                  size={24}
                  color={visuals.color}
                />
                <View>
                  <Text style={styles.drawerTitle}>Deco X50 樓梯天井 RTT 雷達</Text>
                  <Text style={styles.drawerSub}>三樓監聽站・純 L2 物理延遲階躍判定</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setDrawerVisible(false)}
              >
                <Ionicons name="close" size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Main Threat Status Banner */}
            <View style={[styles.threatBanner, { backgroundColor: visuals.bannerBg, borderColor: visuals.borderColor }]}>
              <View style={styles.threatBannerTop}>
                <View style={styles.threatTag}>
                  <View style={[styles.statusDot, { backgroundColor: visuals.color }]} />
                  <Text style={[styles.threatTagText, { color: visuals.color }]}>
                    {status.threat_level === 'RED'
                      ? '致命警報 (RED)'
                      : status.threat_level === 'YELLOW'
                      ? '遠端警戒 (YELLOW)'
                      : status.threat_level === 'GREEN'
                      ? '安全休眠 (GREEN)'
                      : '哨兵離線 (OFFLINE)'}
                  </Text>
                </View>
                {status.target.rtt_ms > 0 && (
                  <Text style={[styles.threatRttBig, { color: visuals.color }]}>
                    {status.target.rtt_ms} ms
                  </Text>
                )}
              </View>
              <Text style={styles.threatDescText}>{status.target.status_desc}</Text>
            </View>

            {/* Target Details Card */}
            <View style={styles.targetCard}>
              <View style={styles.targetRow}>
                <Text style={styles.targetLabel}>目標家人 IP：</Text>
                <Text style={styles.targetValue}>{status.target.ip}</Text>
              </View>
              <View style={styles.targetRow}>
                <Text style={styles.targetLabel}>空間動線推估：</Text>
                <Text style={[styles.targetValue, { color: visuals.color, fontWeight: '800' }]}>
                  {status.target.location_estimate === 'STAIRWELL_APPROACHING_3F'
                    ? '⚠️ 樓梯間直通（正朝三樓前進）'
                    : status.target.location_estimate === 'REMOTE_ROOM_1F_2F'
                    ? '1F / 2F 遠端房間（水泥阻隔中）'
                    : status.target.location_estimate === 'SLEEPING'
                    ? '深度休眠態（螢幕熄滅無封包）'
                    : '待探測'}
                </Text>
              </View>
              <View style={styles.targetRow}>
                <Text style={styles.targetLabel}>哨兵伺服器：</Text>
                <Text style={styles.targetValueSmall}>{arpRadar.getServerUrl()}</Text>
              </View>
            </View>

            {/* Physical Principle Card */}
            <View style={styles.topologyCard}>
              <View style={styles.topologyHeader}>
                <Ionicons name="home-outline" size={14} color={THEME.colors.primaryLight} />
                <Text style={styles.topologyTitle}>透天厝 Deco X50 物理延遲模型</Text>
              </View>
              <Text style={styles.topologyDesc}>
                • RTT &lt; 6ms：中空樓梯天井直通，強直射波打通 ➔ 目標逼近三樓{'\n'}
                • RTT &gt; 15ms：跨樓層 RC 水泥板吸收衰減 ➔ 目標仍在 1F/2F 房間{'\n'}
                • 超時無回應：目標手機深度休眠 ➔ 安全
              </Text>
            </View>

            {/* Edit Target & Server Config Toggle */}
            <TouchableOpacity
              style={styles.configToggleBtn}
              onPress={() => setEditConfigVisible((v) => !v)}
            >
              <Ionicons name="options-outline" size={15} color={THEME.colors.primaryLight} />
              <Text style={styles.configToggleText}>
                {editConfigVisible ? '收起配置設定' : '修改目標 IP 與哨兵位址'}
              </Text>
            </TouchableOpacity>

            {/* Config Form */}
            {editConfigVisible && (
              <ScrollView style={styles.configForm} nestedScrollEnabled>
                <Text style={styles.inputLabel}>目標家人手機 IP：</Text>
                <TextInput
                  style={styles.configInput}
                  value={targetIpInput}
                  onChangeText={setTargetIpInput}
                  placeholder="192.168.68.105"
                  placeholderTextColor={THEME.colors.textMuted}
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>三樓哨兵服務 API 位址：</Text>
                <TextInput
                  style={styles.configInput}
                  value={serverUrlInput}
                  onChangeText={setServerUrlInput}
                  placeholder="http://192.168.68.XXX:8888"
                  placeholderTextColor={THEME.colors.textMuted}
                  autoCapitalize="none"
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveConfig}>
                  <Text style={styles.saveBtnText}>保存並重新探測</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Bottom Actions */}
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => arpRadar.fetchStatus()}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.refreshBtnText}>手動發送 L2 ARP 探測</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
    borderWidth: 1.5,
  },
  badgeFloating: {
    position: 'absolute',
    top: 14,
    left: 16,
    zIndex: 900,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeRedGlow: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    shadowColor: THEME.colors.danger,
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  rttPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  rttText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  drawerCard: {
    backgroundColor: 'rgba(19, 27, 46, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    maxHeight: '85%',
  },
  drawerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  drawerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  drawerSub: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  threatBanner: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  threatBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  threatTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  threatTagText: {
    fontSize: 14,
    fontWeight: '800',
  },
  threatRttBig: {
    fontSize: 20,
    fontWeight: '900',
  },
  threatDescText: {
    fontSize: 12,
    color: THEME.colors.text,
    lineHeight: 18,
    fontWeight: '600',
  },
  targetCard: {
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 12,
    borderRadius: 12,
    gap: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  targetValue: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  targetValueSmall: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  topologyCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginBottom: 12,
  },
  topologyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  topologyTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
  },
  topologyDesc: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    lineHeight: 15,
  },
  configToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 8,
  },
  configToggleText: {
    fontSize: 12,
    color: THEME.colors.primaryLight,
    fontWeight: '600',
  },
  configForm: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    maxHeight: 140,
  },
  inputLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  configInput: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  saveBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
