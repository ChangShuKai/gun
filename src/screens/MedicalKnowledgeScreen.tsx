import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { MedicalCategory } from '../types';
import { medicalKnowledgeService } from '../services/medicalKnowledgeService';

interface MedicalKnowledgeScreenProps {
  visible: boolean;
  onClose: () => void;
  initialArticleId?: string;
}

export const MedicalKnowledgeScreen: React.FC<MedicalKnowledgeScreenProps> = ({
  visible,
  onClose,
  initialArticleId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<MedicalCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(
    initialArticleId || null
  );

  const filteredArticles = useMemo(() => {
    const cat = selectedCategory === 'ALL' ? undefined : selectedCategory;
    return medicalKnowledgeService.getArticles(cat, searchQuery);
  }, [selectedCategory, searchQuery]);

  const toggleExpand = (articleId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setExpandedArticleId((prev) => (prev === articleId ? null : articleId));
  };

  const categories: { key: MedicalCategory | 'ALL'; label: string; icon: string }[] = [
    { key: 'ALL', label: '全部醫學文獻', icon: 'book-open-outline' },
    { key: 'ANATOMY_GROWTH', label: '海綿體解剖學', icon: 'dna' },
    { key: 'PELVIC_NEUROPATHY', label: '控射神經學', icon: 'pulse' },
    { key: 'CARE_AND_WARNINGS', label: '日常保養避坑', icon: 'shield-alert-outline' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="medical-bag" size={20} color="#38BDF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>男性泌尿專科醫學科普庫</Text>
              <Text style={styles.headerSub}>
                權威文獻摘要・解剖生理・控射神經學・醫師避坑指南
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="搜尋白膜、伸縮比、交感神經、PC肌、睪丸溫度..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.catChip,
                    isSelected && styles.catChipSelected,
                  ]}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    setSelectedCategory(cat.key);
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={cat.icon as any}
                    size={14}
                    color={isSelected ? '#0F172A' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.catChipText,
                      isSelected && styles.catChipTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Article List */}
        <ScrollView style={styles.articleList} showsVerticalScrollIndicator={false}>
          {filteredArticles.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={42} color="#334155" />
              <Text style={styles.emptyTitle}>未找到符合的醫學文獻</Text>
              <Text style={styles.emptySub}>請嘗試更換關鍵字或選擇全部分類</Text>
            </View>
          ) : (
            filteredArticles.map((article) => {
              const isExpanded = expandedArticleId === article.id;

              return (
                <TouchableOpacity
                  key={article.id}
                  style={[
                    styles.articleCard,
                    isExpanded && styles.articleCardExpanded,
                  ]}
                  onPress={() => toggleExpand(article.id)}
                  activeOpacity={0.9}
                >
                  {/* Top Badges */}
                  <View style={styles.articleTopRow}>
                    <View style={styles.badgeGroup}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {article.categoryLabel}
                        </Text>
                      </View>
                      <View style={styles.evidenceBadge}>
                        <Ionicons name="shield-checkmark" size={10} color="#10B981" />
                        <Text style={styles.evidenceBadgeText}>{article.badge}</Text>
                      </View>
                    </View>
                    <Text style={styles.readTimeText}>{article.readTimeMin} 分鐘閱讀</Text>
                  </View>

                  {/* Title & Subtitle */}
                  <Text style={styles.articleTitle}>{article.title}</Text>
                  <Text style={styles.articleSubtitle}>{article.subtitle}</Text>

                  {/* Summary */}
                  <Text style={styles.articleSummary}>{article.summary}</Text>

                  {/* Expand / Collapse Indicator */}
                  <View style={styles.expandRow}>
                    <Text style={styles.expandText}>
                      {isExpanded ? '收合文獻詳情' : '點擊展開權威解析與醫師總結'}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color="#38BDF8"
                    />
                  </View>

                  {/* Expanded Detailed Sections */}
                  {isExpanded && (
                    <View style={styles.expandedBody}>
                      {/* Bullet Highlights */}
                      <Text style={styles.sectionHeading}>📋 臨床實證關鍵要點</Text>
                      <View style={styles.bulletsContainer}>
                        {article.bulletPoints.map((bp, i) => (
                          <View key={i} style={styles.bulletRow}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>{bp}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Full Content */}
                      <Text style={styles.sectionHeading}>📖 解剖生理深度解析</Text>
                      <Text style={styles.fullContentText}>{article.fullContent}</Text>

                      {/* Doctor Takeaway Card */}
                      <View style={styles.takeawayCard}>
                        <View style={styles.takeawayHeader}>
                          <MaterialCommunityIcons name="lightbulb-on" size={16} color="#F59E0B" />
                          <Text style={styles.takeawayTitle}>💡 臨床醫師重點劃線</Text>
                        </View>
                        <Text style={styles.takeawayContent}>{article.doctorTakeaway}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  header: {
    backgroundColor: '#0F172A',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#1E293B',
    borderRadius: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#F8FAFC',
    padding: 0,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catChipSelected: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  catChipTextSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },
  articleList: {
    flex: 1,
    padding: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
  },
  articleCard: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  articleCardExpanded: {
    borderColor: 'rgba(56, 189, 248, 0.4)',
    backgroundColor: '#111827',
  },
  articleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  evidenceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },
  readTimeText: {
    fontSize: 9,
    color: '#64748B',
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 20,
    marginBottom: 4,
  },
  articleSubtitle: {
    fontSize: 11,
    color: '#38BDF8',
    marginBottom: 8,
  },
  articleSummary: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 8,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  expandText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  expandedBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E2E8F0',
    marginBottom: 6,
    marginTop: 6,
  },
  bulletsContainer: {
    backgroundColor: '#030712',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  fullContentText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 20,
    marginBottom: 12,
  },
  takeawayCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: 10,
  },
  takeawayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  takeawayTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  takeawayContent: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FEF3C7',
    lineHeight: 16,
  },
});
