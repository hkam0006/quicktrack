import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAddTransaction } from '@/src/features/transactions/use-add-transaction';
import { darkThemeTokens } from '@/src/shared/theme/tokens';

const paymentMethods: ('cash' | 'card' | 'bank')[] = ['cash', 'card', 'bank'];
const types: ('expense' | 'income')[] = ['expense', 'income'];

export default function AddTransactionModal() {
  const router = useRouter();
  const { form, categories, saving, error, update, save } = useAddTransaction();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Add transaction</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.segmentRow}>
          {types.map((type) => (
            <Pressable
              key={type}
              style={[styles.segment, form.type === type ? styles.segmentActive : null]}
              onPress={() => update({ type })}>
              <Text style={[styles.segmentText, form.type === type ? styles.segmentTextActive : null]}>
                {type}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Amount (AUD)</Text>
        <TextInput
          value={form.amount}
          onChangeText={(amount) => update({ amount })}
          placeholder="0.00"
          placeholderTextColor={darkThemeTokens.textSecondary}
          keyboardType="decimal-pad"
          style={styles.input}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          value={form.date}
          onChangeText={(date) => update({ date })}
          placeholder="2026-03-02"
          placeholderTextColor={darkThemeTokens.textSecondary}
          style={styles.input}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.wrapRow}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => update({ categoryId: category.id })}
              style={[styles.chip, form.categoryId === category.id ? styles.chipActive : null]}>
              <Text style={[styles.chipText, form.categoryId === category.id ? styles.chipTextActive : null]}>
                {category.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Payment method</Text>
        <View style={styles.segmentRow}>
          {paymentMethods.map((method) => (
            <Pressable
              key={method}
              style={[styles.segment, form.paymentMethod === method ? styles.segmentActive : null]}
              onPress={() => update({ paymentMethod: method })}>
              <Text
                style={[
                  styles.segmentText,
                  form.paymentMethod === method ? styles.segmentTextActive : null,
                ]}>
                {method}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Note</Text>
        <TextInput
          value={form.note}
          onChangeText={(note) => update({ note })}
          placeholder="Optional note"
          placeholderTextColor={darkThemeTokens.textSecondary}
          style={styles.input}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={[styles.primaryButton, saving ? styles.primaryButtonDisabled : null]}
        disabled={saving}
        onPress={async () => {
          const ok = await save();
          if (ok) {
            router.back();
          }
        }}>
        {saving ? <ActivityIndicator color={darkThemeTokens.background} /> : <Text style={styles.primaryText}>Save</Text>}
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkThemeTokens.background,
  },
  content: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  title: {
    color: darkThemeTokens.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  card: {
    backgroundColor: darkThemeTokens.surface,
    borderColor: darkThemeTokens.surfaceAlt,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  label: {
    color: darkThemeTokens.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: darkThemeTokens.surfaceAlt,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    color: darkThemeTokens.textPrimary,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: darkThemeTokens.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkThemeTokens.surfaceAlt,
  },
  segmentActive: {
    borderColor: darkThemeTokens.accent,
    backgroundColor: '#163452',
  },
  segmentText: {
    color: darkThemeTokens.textSecondary,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: darkThemeTokens.textPrimary,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: darkThemeTokens.surfaceAlt,
    backgroundColor: darkThemeTokens.surfaceAlt,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: darkThemeTokens.accent,
    backgroundColor: '#163452',
  },
  chipText: {
    color: darkThemeTokens.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: darkThemeTokens.textPrimary,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: darkThemeTokens.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: darkThemeTokens.background,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkThemeTokens.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: darkThemeTokens.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: darkThemeTokens.danger,
    fontSize: 14,
  },
});
