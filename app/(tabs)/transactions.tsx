import React, { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Alert,
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { TransactionSheet } from '@/src/features/transactions/transaction-sheet';
import { useTransactionsData } from '@/src/features/transactions/use-transactions-data';
import { darkThemeTokens } from '@/src/shared/theme/tokens';
import { AddExpenseFab } from '@/src/shared/ui/add-expense-fab';

export default function TransactionsScreen() {
  const [query, setQuery] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { items, loading, error, refresh, deleteTransaction, formatCurrency } = useTransactionsData(query);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
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
          <Swipeable
            key={item.id}
            friction={1.7}
            rightThreshold={36}
            overshootRight={false}
            renderRightActions={(progress, dragX) => (
              <Animated.View
                style={[
                  styles.rightActionWrap,
                  {
                    opacity: progress.interpolate({
                      inputRange: [0, 0.2, 1],
                      outputRange: [0, 0.7, 1],
                      extrapolate: 'clamp',
                    }),
                    transform: [
                      {
                        translateX: dragX.interpolate({
                          inputRange: [-120, -56, 0],
                          outputRange: [0, 10, 24],
                          extrapolate: 'clamp',
                        }),
                      },
                      {
                        scale: progress.interpolate({
                          inputRange: [0, 0.6, 1],
                          outputRange: [0.92, 0.98, 1],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}>
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Edit transaction"
                    style={styles.editAction}
                    onPress={() => {
                      setActiveTransactionId(item.id);
                      setSheetVisible(true);
                    }}>
                    <MaterialIcons name="edit" size={20} color={darkThemeTokens.background} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete transaction"
                    style={styles.deleteAction}
                    onPress={() => {
                      Alert.alert(
                        'Delete transaction?',
                        'This transaction will be removed from your list and synced as deleted.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => {
                              void deleteTransaction(item.id);
                            },
                          },
                        ]
                      );
                    }}>
                    <MaterialIcons name="delete-outline" size={22} color={darkThemeTokens.textPrimary} />
                  </Pressable>
                </View>
              </Animated.View>
            )}>
            <View style={styles.row}>
              <View>
                <Text style={styles.rowTitle}>{item.categoryName}</Text>
                <Text style={styles.rowMeta}>{new Date(item.occurredAt).toLocaleDateString('en-AU')}</Text>
              </View>
              <Text style={[styles.rowAmount, item.type === 'expense' ? styles.expense : styles.income]}>
                {item.type === 'expense' ? '-' : '+'}
                {formatCurrency(item.amountCents)}
              </Text>
            </View>
          </Swipeable>
        ))}
      </View>

        {loading ? <ActivityIndicator color={darkThemeTokens.accent} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
      <AddExpenseFab
        onPress={() => {
          setActiveTransactionId(null);
          setSheetVisible(true);
        }}
      />
      {sheetVisible ? (
        <TransactionSheet
          transactionId={activeTransactionId ?? undefined}
          presentation="modal"
          onClose={() => {
            setSheetVisible(false);
            setActiveTransactionId(null);
          }}
        />
      ) : null}
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
    paddingHorizontal: 2,
    borderBottomColor: darkThemeTokens.surfaceAlt,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rightActionWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 136,
    paddingLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editAction: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: darkThemeTokens.accent,
    borderWidth: 1,
    borderColor: '#7AB5FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F7ED8',
    shadowOpacity: 0.26,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  deleteAction: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#2A1116',
    borderWidth: 1,
    borderColor: '#5B232F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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
