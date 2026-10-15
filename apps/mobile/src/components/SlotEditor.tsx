import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { compilePrompt } from '@promptjoo/prompt-compiler';
import type { MobilePrompt } from '../types';
import type { PromptModality, SavedContextProfile } from '@promptjoo/contracts';

interface SlotEditorProps {
  prompt: MobilePrompt;
  userProfile?: SavedContextProfile;
  onBack: () => void;
  onCopy: (compiledText: string) => void;
}

export function SlotEditor({ prompt, userProfile, onBack, onCopy }: SlotEditorProps) {
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [forceFarsi, setForceFarsi] = useState(true);
  const [compiledText, setCompiledText] = useState('');

  useEffect(() => {
    // Initial compilation
    const res = compilePrompt(
      prompt.template_en,
      prompt.slots_schema_json,
      slotValues,
      userProfile,
      { forceFarsiOutput: forceFarsi, modality: prompt.modality as PromptModality }
    );
    setCompiledText(res.compiledText);
  }, [slotValues, forceFarsi, prompt, userProfile]);

  const handleSlotChange = (key: string, val: string) => {
    setSlotValues((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← بازگشت به لیست</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{prompt.title_fa}</Text>
      <Text style={styles.desc}>{prompt.short_desc_fa}</Text>

      {/* Slots Inputs */}
      {prompt.slots_schema_json && prompt.slots_schema_json.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>شخصی‌سازی متغیرها:</Text>
          {prompt.slots_schema_json.map((slot) => (
            <View key={slot.slot_key} style={styles.slotRow}>
              <Text style={styles.slotLabel}>
                {slot.label_fa} {slot.is_required && <Text style={styles.required}>*</Text>}
              </Text>
              <TextInput
                style={styles.input}
                value={slotValues[slot.slot_key] ?? (slot.default_value_en || '')}
                onChangeText={(text) => handleSlotChange(slot.slot_key, text)}
                placeholder={slot.default_value_en}
                placeholderTextColor="#64748b"
              />
            </View>
          ))}
        </View>
      )}

      {/* Compiled Result Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>پیش‌نمایش پرامپت نهایی:</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>{compiledText}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.copyButton}
        onPress={() => onCopy(compiledText)}
        activeOpacity={0.8}
      >
        <Text style={styles.copyButtonText}>کپی پرامپت در کلیپ‌بورد</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  backButtonText: {
    color: '#38bdf8',
    fontSize: 13,
    textAlign: 'right',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 8,
  },
  desc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: 16,
  },
  section: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 12,
  },
  slotRow: {
    marginBottom: 12,
  },
  slotLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 6,
  },
  required: {
    color: '#f87171',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    textAlign: 'right',
  },
  codeContainer: {
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  codeText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'left',
  },
  copyButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
