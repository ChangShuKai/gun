import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import {
  copyImageToSandbox,
  listSandboxImages,
  deleteSandboxMedia,
} from '../services/mediaStorage';
import { useApp } from '../context/AppContext';

interface PhotoWidgetProps {
  photoUri?: string | null;
  onPhotoSelected: (uri: string) => void;
  onClearPhoto?: () => void;
}

export const PhotoWidget: React.FC<PhotoWidgetProps> = ({
  photoUri,
  onPhotoSelected,
  onClearPhoto,
}) => {
  const { refreshSandboxStats } = useApp();
  const [galleryModalVisible, setGalleryModalVisible] = useState<boolean>(false);
  const [sandboxImages, setSandboxImages] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const loadSandboxImages = async () => {
    const list = await listSandboxImages();
    setSandboxImages(list);
  };

  const handleOpenGallery = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await loadSandboxImages();
    setGalleryModalVisible(true);
  };

  const handlePickFromDeviceAndImport = async () => {
    try {
      setIsImporting(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const sourceUri = result.assets[0].uri;
        // Copy directly into sandboxed DocumentDirectory and verify
        const sandboxedUri = await copyImageToSandbox(sourceUri);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        await refreshSandboxStats();
        onPhotoSelected(sandboxedUri);
        setGalleryModalVisible(false);
      }
    } catch (error: any) {
      Alert.alert('導入失敗', '無法將圖片複製至本地沙盒：' + error?.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectExisting = async (uri: string) => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    onPhotoSelected(uri);
    setGalleryModalVisible(false);
  };

  const handleDeleteSandboxImage = (uri: string) => {
    Alert.alert(
      '刪除沙盒圖片',
      '確定自本地沙盒永久刪除此素材？此動作無法復原。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確認刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSandboxMedia(uri);
              await loadSandboxImages();
              await refreshSandboxStats();
              if (photoUri === uri && onClearPhoto) {
                onClearPhoto();
              }
              try {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch {}
            } catch (err: any) {
              Alert.alert('刪除失敗', err?.message || '無法刪除檔案');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {photoUri ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: photoUri }}
            style={styles.image}
            resizeMode="contain"
            onError={() => {
              console.warn('[PhotoWidget] Failed to load image from URI:', photoUri);
              if (onClearPhoto) onClearPhoto();
            }}
          />
          {/* Quick action bar overlay on top right */}
          <View style={styles.overlayButtons}>
            <TouchableOpacity
              style={styles.miniBtn}
              onPress={handleOpenGallery}
              activeOpacity={0.8}
            >
              <Ionicons name="images" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            {onClearPhoto && (
              <TouchableOpacity
                style={[styles.miniBtn, styles.deleteBtn]}
                onPress={onClearPhoto}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="image-outline" size={32} color={THEME.colors.primaryLight} />
          </View>
          <Text style={styles.emptyTitle}>本地私密相片</Text>
          <Text style={styles.emptySubtitle}>
            存入私有沙盒・不進入系統相簿
          </Text>

          <View style={styles.emptyButtonsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={handleOpenGallery}
            >
              <Ionicons name="folder-open-outline" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>沙盒庫存</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.importBtn]}
              activeOpacity={0.8}
              onPress={handlePickFromDeviceAndImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>導入新圖</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Gallery Selector Modal */}
      <Modal
        visible={galleryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGalleryModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>沙盒私密圖片庫</Text>
                <Text style={styles.modalSubtitle}>
                  共 {sandboxImages.length} 張存於本地私有 DocumentDirectory
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setGalleryModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Import Button */}
            <TouchableOpacity
              style={styles.modalImportBtn}
              onPress={handlePickFromDeviceAndImport}
              activeOpacity={0.8}
              disabled={isImporting}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.modalImportBtnText}>從裝置相簿導入並隔離至沙盒</Text>
                </>
              )}
            </TouchableOpacity>

            {sandboxImages.length === 0 ? (
              <View style={styles.emptyGallery}>
                <Ionicons name="images-outline" size={44} color={THEME.colors.textMuted} />
                <Text style={styles.emptyGalleryText}>沙盒內尚無圖片</Text>
                <Text style={styles.emptyGallerySub}>點擊上方按鈕導入第一張素材</Text>
              </View>
            ) : (
              <FlatList
                data={sandboxImages}
                keyExtractor={(item) => item}
                numColumns={3}
                renderItem={({ item }) => (
                  <View style={styles.thumbWrapper}>
                    <TouchableOpacity
                      style={styles.galleryThumb}
                      activeOpacity={0.8}
                      onPress={() => handleSelectExisting(item)}
                    >
                      <Image source={{ uri: item }} style={styles.thumbImage} />
                    </TouchableOpacity>
                    {/* Delete button on top right of thumbnail */}
                    <TouchableOpacity
                      style={styles.thumbDeleteBtn}
                      onPress={() => handleDeleteSandboxImage(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
                contentContainerStyle={styles.galleryList}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
  },
  imageWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayButtons: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  miniBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.75)',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  importBtn: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primaryLight,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: THEME.radius.xl,
    borderTopRightRadius: THEME.radius.xl,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    marginBottom: 16,
  },
  modalImportBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyGallery: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyGalleryText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  emptyGallerySub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  galleryList: {
    paddingBottom: 24,
  },
  thumbWrapper: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 4,
    position: 'relative',
  },
  galleryThumb: {
    flex: 1,
    borderRadius: THEME.radius.sm,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
