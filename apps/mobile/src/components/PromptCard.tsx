import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { MobilePrompt } from '../types';

interface PromptCardProps {
  prompt: MobilePrompt;
  onPress: (prompt: MobilePrompt) => void;
  onQuickCopy: (prompt: MobilePrompt) => void;
}

export function PromptCard({ prompt, onPress, onQuickCopy }: PromptCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(prompt)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{prompt.modality}</Text>
        </View>
        <Text style={styles.copyCount}>{prompt.copy_count.toLocaleString('fa-IR')} کپی</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {prompt.title_fa}
      </Text>

      <Text style={styles.desc} numberOfLines={3}>
        {prompt.short_desc_fa}
      </Text>

      <View style={styles.footer}>
        <View style={styles.modelsContainer}>
          {prompt.supported_models.slice(0, 3).map((m: string) => (
            <View key={m} style={styles.modelPill}>
              <Text style={styles.modelText}>{m}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => onQuickCopy(prompt)}
          activeOpacity={0.7}
        >
          <Text style={styles.copyButtonText}>کپی سریع</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  badgeText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: 'bold',
  },
  copyCount: {
    color: '#94a3b8',
    fontSize: 11,
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 6,
    lineHeight: 22,
  },
  desc: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
  },
  modelsContainer: {
    flexDirection: 'row-reverse',
    gap: 4,
  },
  modelPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modelText: {
    color: '#cbd5e1',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  copyButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
