import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTransactionsData } from '@/src/features/transactions/use-transactions-data';
import { darkThemeTokens } from '@/src/shared/theme/tokens';
import { AddExpenseFab } from '@/src/shared/ui/add-expense-fab';

export default function TransactionsScreen() {
  const [query, setQuery] = useState('');
  const { items, loading, error, formatCurrency } = useTransactionsData(query);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Transactions</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Search</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by category or note"
          placeholderTextColor={darkThemeTokens.textSecondary}
          style={styles.input}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Recent</Text>
        {items.length === 0 ? <Text style={styles.muted}>No transactions yet.</Text> : null}
        {items.map((item) => (
          <View key={item.id} style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>{item.categoryName}</Text>
              <Text style={styles.rowMeta}>{new Date(item.occurredAt).toLocaleDateString('en-AU')}</Text>
            </View>
            <Text style={[styles.rowAmount, item.type === 'expense' ? styles.expense : styles.income]}>
              {item.type === 'expense' ? '-' : '+'}
              {formatCurrency(item.amountCents)}
            </Text>
          </View>
        ))}
      </View>

        {loading ? <ActivityIndicator color={darkThemeTokens.accent} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
      <AddExpenseFab />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkThemeTokens.background },
  content: {
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 14,
  },
  title: {
    color: darkThemeTokens.textPrimary,
    fontSize: 32,
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
    paddingHorizontal: 12,
    minHeight: 42,
    color: darkThemeTokens.textPrimary,
  },
  muted: {
    color: darkThemeTokens.textSecondary,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomColor: darkThemeTokens.surfaceAlt,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: {
    color: darkThemeTokens.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  rowMeta: {
    color: darkThemeTokens.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  expense: {
    color: darkThemeTokens.danger,
  },
  income: {
    color: darkThemeTokens.success,
  },
  errorText: {
    color: darkThemeTokens.danger,
    fontSize: 14,
  },
});
