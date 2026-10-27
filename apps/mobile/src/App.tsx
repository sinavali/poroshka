import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { PromptCard } from './components/PromptCard';
import { SlotEditor } from './components/SlotEditor';
import type { AppState, MobilePrompt } from './types';

const API_BASE = 'https://core-api.poroshka.ir';

export function App() {
  const [state, setState] = useState<AppState>({
    status: 'loading',
    prompts: [],
    selectedPrompt: null,
    searchQuery: '',
    selectedModality: 'all',
    userProfile: {
      brand_name: '',
      niche_topic: '',
      target_audience: '',
      brand_tone: 'CASUAL',
      call_to_action: ''
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchPrompts = async (modality = 'all', query = '') => {
    setState((prev: AppState) => ({ ...prev, status: 'loading' }));
    try {
      let url = `${API_BASE}/api/v1/catalog/prompts?limit=25`;
      if (modality !== 'all') url += `&modality=${modality}`;
      if (query.trim()) url += `&q=${encodeURIComponent(query.trim())}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: MobilePrompt[] = data.items || [];

      setState((prev: AppState) => ({
        ...prev,
        status: items.length === 0 ? 'empty' : 'loaded',
        prompts: items
      }));
    } catch (err: unknown) {
      // Fallback offline state
      setState((prev: AppState) => ({
        ...prev,
        status: prev.prompts.length > 0 ? 'loaded' : 'failure',
        error: 'امکان اتصال به سرور وجود ندارد. لطفاً اینترنت خود را بررسی کنید.'
      }));
    }
  };

  useEffect(() => {
    fetchPrompts(state.selectedModality, state.searchQuery);
  }, [state.selectedModality]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleQuickCopy = (prompt: MobilePrompt) => {
    try {
      Clipboard.setString(prompt.template_en);
    } catch {}
    showToast(`پرامپت «${prompt.title_fa}» کپی شد!`);
  };

  // If a prompt is selected, render the SlotEditor view
  if (state.selectedPrompt) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />
        <SlotEditor
          prompt={state.selectedPrompt}
          userProfile={state.userProfile}
          onBack={() => setState((prev: AppState) => ({ ...prev, selectedPrompt: null }))}
          onCopy={(text: string) => {
            try {
              Clipboard.setString(text);
            } catch {}
            showToast('پرامپت نهایی با موفقیت کپی شد!');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandTitle}>پوروشکا</Text>
        <Text style={styles.brandSubtitle}>مرجع تخصصی پرامپت هوش مصنوعی</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="جستجو در صدها پرامپت آماده..."
          placeholderTextColor="#64748b"
          value={state.searchQuery}
          onChangeText={(text: string) => setState((prev: AppState) => ({ ...prev, searchQuery: text }))}
          onSubmitEditing={() => fetchPrompts(state.selectedModality, state.searchQuery)}
        />
      </View>

      {/* Modality Chips */}
      <View style={styles.chipsContainer}>
        {['all', 'text_writing', 'text_to_image', 'image_edit', 'data_structuring', 'code_tech'].map((m: string) => (
          <TouchableOpacity
            key={m}
            style={[styles.chip, state.selectedModality === m && styles.chipActive]}
            onPress={() => setState((prev: AppState) => ({ ...prev, selectedModality: m }))}
          >
            <Text style={[styles.chipText, state.selectedModality === m && styles.chipTextActive]}>
              {m === 'all' ? 'همه' : m === 'text_writing' ? 'محتوا' : m === 'text_to_image' ? 'تصویر' : m === 'image_edit' ? 'ادیت' : m === 'data_structuring' ? 'اکسل' : 'کد'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 4-State UI Views */}
      {state.status === 'loading' && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>در حال دریافت پرامپت‌ها...</Text>
        </View>
      )}

      {state.status === 'failure' && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{state.error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchPrompts(state.selectedModality, state.searchQuery)}
          >
            <Text style={styles.retryButtonText}>تلاش مجدد</Text>
          </TouchableOpacity>
        </View>
      )}

      {state.status === 'empty' && (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>پرامپتی با این مشخصات یافت نشد.</Text>
        </View>
      )}

      {state.status === 'loaded' && (
        <FlatList
          data={state.prompts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PromptCard
              prompt={item}
              onPress={(p: MobilePrompt) => setState((prev: AppState) => ({ ...prev, selectedPrompt: p }))}
              onQuickCopy={handleQuickCopy}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Floating Micro Toast */}
      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'black',
    textAlign: 'right',
  },
  brandSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    textAlign: 'right',
  },
  chipsContainer: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
