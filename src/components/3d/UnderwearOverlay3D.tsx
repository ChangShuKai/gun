import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  AnatomyMorphParams,
  UnderwearItem,
} from '../../types';
import { underwearService } from '../../services/underwearService';
import { UNDERWEAR_FABRIC_COLORS } from '../../services/underwear3DService';
import { Interactive3DMesh } from './Interactive3DMesh';

interface UnderwearOverlay3DProps {
  morphParams?: AnatomyMorphParams;
  onSelectUnderwear?: (item: UnderwearItem) => void;
  onOpenWardrobeModal?: () => void;
  height?: number;
}

const DEFAULT_PRESET_ITEMS: UnderwearItem[] = [
  {
    id: 'preset_brief_1',
    name: '經典曜石黑三角',
    cutType: 'BRIEF',
    colorTag: '#1E293B',
    brand: 'Calvin Klein Style',
    createdAt: Date.now(),
  },
  {
    id: 'preset_trunk_1',
    name: '低腰無痕莫代爾平口',
    cutType: 'TRUNK',
    colorTag: '#64748B',
    brand: 'Modal Seamless',
    createdAt: Date.now(),
  },
  {
    id: 'preset_boxer_1',
    name: '深藍純棉寬鬆平口',
    cutType: 'BOXER',
    colorTag: '#1E3A8A',
    brand: 'Relaxed Fit',
    createdAt: Date.now(),
  },
  {
    id: 'preset_jockstrap_1',
    name: '紅金競速提臀戰帶',
    cutType: 'JOCKSTRAP',
    colorTag: '#DC2626',
    brand: 'Athletic Jock',
    createdAt: Date.now(),
  },
];

export const UnderwearOverlay3D: React.FC<UnderwearOverlay3DProps> = ({
  morphParams,
  onSelectUnderwear,
  onOpenWardrobeModal,
  height = 340,
}) => {
  const [items, setItems] = useState<UnderwearItem[]>(DEFAULT_PRESET_ITEMS);
  const [selectedItem, setSelectedItem] = useState<UnderwearItem>(DEFAULT_PRESET_ITEMS[0]);

  useEffect(() => {
    void underwearService.getWardrobe().then((list: UnderwearItem[]) => {
      if (list && list.length > 0) {
        setItems(list);
        setSelectedItem(list[0]);
      } else {
        setItems(DEFAULT_PRESET_ITEMS);
        setSelectedItem(DEFAULT_PRESET_ITEMS[0]);
      }
    });
  }, []);

  const handleSelectItem = (item: UnderwearItem) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedItem(item);
    if (onSelectUnderwear) onSelectUnderwear(item);
  };

  const handleSelectColor = (colorHex: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    const updated = { ...selectedItem, colorTag: colorHex };
    setSelectedItem(updated);
    if (onSelectUnderwear) onSelectUnderwear(updated);
  };

  const tensionFactor = morphParams
    ? (morphParams.lengthFactor * 0.5 + morphParams.girthFactor * 0.5).toFixed(2)
    : '1.05';

  return (
    <View style={styles.container}>
      {/* 3D Interactive Model with Underwear Layer */}
      <Interactive3DMesh
        morphParams={morphParams}
        underwearItem={selectedItem}
        height={height}
        initialMode="underwear"
      />

      {/* Dynamic Pouch Tension & Fit Specs Floating Card */}
      <View style={styles.specFloatingCard}>
        <View style={styles.specLeft}>
          <View style={styles.cutBadge}>
            <Text style={styles.cutBadgeText}>{selectedItem.cutType}</Text>
          </View>
          <Text style={styles.selectedItemTitle}>{selectedItem.name}</Text>
        </View>
        <View style={styles.tensionPill}>
          <Ionicons name="sparkles" size={11} color="#A78BFA" />
          <Text style={styles.tensionText}>囊袋張力：{tensionFactor}x</Text>
        </View>
      </View>

      {/* Fabric Color Swatches Carousel */}
      <View style={styles.colorRow}>
        <Text style={styles.rowLabel}>布料色系：</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScroll}>
          {UNDERWEAR_FABRIC_COLORS.map((c) => {
            const isSelected = selectedItem.colorTag?.toLowerCase() === c.hex.toLowerCase();
            return (
              <TouchableOpacity
                key={c.hex}
                style={[
                  styles.colorDot,
                  { backgroundColor: c.hex, borderColor: c.border },
                  isSelected && styles.colorDotSelected,
                ]}
                onPress={() => handleSelectColor(c.hex)}
                activeOpacity={0.8}
              >
                {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Wardrobe Items Carousel */}
      <View style={styles.itemsCarouselSection}>
        <View style={styles.carouselHeaderRow}>
          <Text style={styles.rowLabel}>款式庫實穿切換：</Text>
          {onOpenWardrobeModal && (
            <TouchableOpacity onPress={onOpenWardrobeModal} activeOpacity={0.8} style={styles.wardrobeLink}>
              <Text style={styles.wardrobeLinkText}>管理衣櫥</Text>
              <Ionicons name="chevron-forward" size={12} color="#60A5FA" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemsScroll}>
          {items.map((it) => {
            const isSelected = it.id === selectedItem.id;
            return (
              <TouchableOpacity
                key={it.id}
                style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                onPress={() => handleSelectItem(it)}
                activeOpacity={0.8}
              >
                <View style={styles.itemCardTop}>
                  <MaterialCommunityIcons
                    name="tshirt-v-outline"
                    size={16}
                    color={isSelected ? '#60A5FA' : '#94A3B8'}
                  />
                  <Text style={[styles.itemCutTag, isSelected && styles.itemCutTagSelected]}>
                    {it.cutType}
                  </Text>
                </View>
                <Text style={[styles.itemCardName, isSelected && styles.itemCardNameSelected]} numberOfLines={1}>
                  {it.name}
                </Text>
                {it.brand && (
                  <Text style={styles.itemCardBrand} numberOfLines={1}>
                    {it.brand}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#070C18',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.25)',
  },
  specFloatingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  specLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cutBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cutBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60A5FA',
  },
  selectedItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  tensionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tensionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C4B5FD',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  colorScroll: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotSelected: {
    transform: [{ scale: 1.15 }],
    borderColor: '#60A5FA',
    borderWidth: 2,
  },
  itemsCarouselSection: {
    marginTop: 10,
  },
  carouselHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  wardrobeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  wardrobeLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
  },
  itemsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  itemCard: {
    width: 120,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  itemCardSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  itemCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemCutTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  itemCutTagSelected: {
    color: '#60A5FA',
  },
  itemCardName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  itemCardNameSelected: {
    color: '#93C5FD',
  },
  itemCardBrand: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
});
