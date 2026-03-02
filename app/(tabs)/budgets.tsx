import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { useBudgetsData } from '@/src/features/budgets/use-budgets-data';
import { darkThemeTokens } from '@/src/shared/theme/tokens';
import { AddExpenseFab } from '@/src/shared/ui/add-expense-fab';

export default function BudgetsScreen() {
  const { data, monthlyOverall, loading, error, formatCurrency } = useBudgetsData();

  const monthlyCategoryBars = useMemo(
    () =>
      data.monthly
        .filter((item) => item.categoryId !== null)
        .slice(0, 6)
        .map((item) => ({
          value: Math.round(item.progressRatio * 100),
          label: `${item.categoryId?.slice(0, 2) ?? ''}`,
          frontColor:
            item.thresholdState === 'warning100'
              ? darkThemeTokens.danger
              : item.thresholdState === 'warning80'
                ? darkThemeTokens.warning
                : darkThemeTokens.success,
        })),
    [data.monthly]
  );

  const yearlyOverall = data.yearly.find((item) => item.categoryId === null) ?? null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Budgets</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Overall monthly budget</Text>
        {monthlyOverall ? (
          <>
            <Text style={styles.value}>
              {formatCurrency(monthlyOverall.spentCents)} / {formatCurrency(monthlyOverall.budgetCents)}
            </Text>
            <Text style={styles.muted}>Remaining {formatCurrency(monthlyOverall.remainingCents)}</Text>
          </>
        ) : (
          <Text style={styles.muted}>No monthly budget configured.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Overall yearly budget</Text>
        {yearlyOverall ? (
          <>
            <Text style={styles.value}>
              {formatCurrency(yearlyOverall.spentCents)} / {formatCurrency(yearlyOverall.budgetCents)}
            </Text>
            <Text style={styles.muted}>Remaining {formatCurrency(yearlyOverall.remainingCents)}</Text>
          </>
        ) : (
          <Text style={styles.muted}>No yearly budget configured.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Category utilization (%)</Text>
        {monthlyCategoryBars.length > 0 ? (
          <BarChart
            data={monthlyCategoryBars}
            barWidth={24}
            spacing={22}
            roundedTop
            hideYAxisText
            hideRules
            xAxisColor={darkThemeTokens.surfaceAlt}
            yAxisColor={darkThemeTokens.surfaceAlt}
            isAnimated
          />
        ) : (
          <Text style={styles.muted}>No category budgets available.</Text>
        )}
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
    gap: 8,
  },
  label: {
    color: darkThemeTokens.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    color: darkThemeTokens.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  muted: {
    color: darkThemeTokens.textSecondary,
    fontSize: 15,
  },
  errorText: {
    color: darkThemeTokens.danger,
    fontSize: 14,
  },
});
