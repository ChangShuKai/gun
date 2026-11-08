import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface VideoPlayerModalProps {
  visible: boolean;
  videoUri: string | null;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  visible,
  videoUri,
  onClose,
}) => {
  if (!visible || !videoUri) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <VideoPlayerContent videoUri={videoUri} onClose={onClose} />
    </Modal>
  );
};

const VideoPlayerContent: React.FC<{ videoUri: string; onClose: () => void }> = ({
  videoUri,
  onClose,
}) => {
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <Ionicons name="lock-open" size={16} color={THEME.colors.success} />
          <Text style={styles.titleText}>機密錄影播放中 (已通過生物驗證)</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Video View */}
      <View style={styles.videoWrapper}>
        <VideoView
          style={styles.videoView}
          player={player}
          nativeControls={true}
          contentFit="contain"
        />
      </View>

      {/* Bottom Info Banner */}
      <View style={styles.bottomBanner}>
        <Text style={styles.privacyNote}>
          🔒 該影片存於私有沙盒隔離目錄，離開此畫面後自動鎖定，絕無外洩風險。
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  videoView: {
    width: '100%',
    height: '100%',
  },
  bottomBanner: {
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  privacyNote: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
