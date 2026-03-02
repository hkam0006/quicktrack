import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart, PieChart } from 'react-native-gifted-charts';

import { formatCurrency, formatShortDay } from '@/src/data/local/database';
import { useHomeData } from '@/src/features/home/use-home-data';
import { darkThemeTokens } from '@/src/shared/theme/tokens';
import { AddExpenseFab } from '@/src/shared/ui/add-expense-fab';

export default function HomeScreen() {
  const { data, loading, error } = useHomeData();

  const pieData = useMemo(
    () =>
      data.topCategories.map((category) => ({
        value: category.spentCents,
        color: category.color,
        text: `${Math.round(category.percentOfTotal)}%`,
      })),
    [data.topCategories]
  );

  const trendData = useMemo(
    () =>
      data.dailyTrend.map((point) => ({
        value: Math.round(point.spentCents / 100),
        label: formatShortDay(point.date),
      })),
    [data.dailyTrend]
  );

  const budgetRemaining = data.totalBudget
    ? Math.max(data.totalBudget.budgetCents - data.totalBudget.spentCents, 0)
    : 0;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Home</Text>

      <View style={styles.card}>
        <Text style={styles.label}>This month spent</Text>
        <Text style={styles.value}>{formatCurrency(data.summary.spentCents)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Budget remaining</Text>
        <Text style={styles.valueSmall}>{formatCurrency(budgetRemaining)}</Text>
        {data.totalBudget ? (
          <Text style={styles.muted}>
            Used {Math.round(data.totalBudget.progressRatio * 100)}% of monthly overall budget.
          </Text>
        ) : (
          <Text style={styles.muted}>No monthly overall budget configured yet.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Top categories</Text>
        {pieData.length > 0 ? (
          <PieChart data={pieData} donut radius={80} innerRadius={48} showText textColor="white" />
        ) : (
          <Text style={styles.muted}>No expense data yet.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Daily spend trend (AUD)</Text>
        {trendData.length > 0 ? (
          <LineChart
            data={trendData}
            areaChart
            startFillColor={darkThemeTokens.accent}
            endFillColor={darkThemeTokens.accent}
            startOpacity={0.28}
            endOpacity={0.05}
            color={darkThemeTokens.accent}
            dataPointsColor={darkThemeTokens.accent}
            yAxisColor={darkThemeTokens.surfaceAlt}
            xAxisColor={darkThemeTokens.surfaceAlt}
            rulesColor={darkThemeTokens.surfaceAlt}
            hideRules={false}
            thickness={3}
            noOfSections={4}
            isAnimated
            curved
          />
        ) : (
          <Text style={styles.muted}>No daily trend yet.</Text>
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
    fontSize: 28,
    fontWeight: '700',
  },
  valueSmall: {
    color: darkThemeTokens.textPrimary,
    fontSize: 22,
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
