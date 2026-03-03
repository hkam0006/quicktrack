import React, { useEffect, useMemo, useRef, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { BudgetSheet } from '@/src/features/budgets/budget-sheet';
import { useBudgetsData } from '@/src/features/budgets/use-budgets-data';
import { darkThemeTokens } from '@/src/shared/theme/tokens';

const monthYearFormatter = new Intl.DateTimeFormat('en-AU', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export default function BudgetsScreen() {
  const { data, monthlyOverall, loading, error, refresh, formatCurrency } = useBudgetsData();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const chartMotion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(chartMotion, {
      toValue: 1,
      duration: reduceMotion ? 0 : 560,
      delay: reduceMotion ? 0 : 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [chartMotion, reduceMotion]);

  const formatThresholdState = (state: 'safe' | 'warning80' | 'warning100') => {
    if (state === 'warning100') {
      return 'Over budget';
    }
    if (state === 'warning80') {
      return 'Near limit';
    }
    return 'On track';
  };

  const formatBudgetPeriodLabel = (period: 'monthly' | 'yearly', startDate: string) => {
    const parsed = new Date(startDate);
    if (Number.isNaN(parsed.getTime())) {
      return period === 'monthly' ? 'Monthly' : 'Yearly';
    }

    if (period === 'monthly') {
      return monthYearFormatter.format(parsed);
    }

    return String(parsed.getUTCFullYear());
  };

  const monthlyCategoryBars = useMemo(
    () =>
      data.monthly
        .filter((item) => item.categoryId !== null)
        .slice(0, 6)
        .map((item, index) => ({
          value: Math.round(item.progressRatio * 100),
          label: `${index + 1}`,
          frontColor:
            item.thresholdState === 'warning100'
              ? darkThemeTokens.danger
              : item.thresholdState === 'warning80'
                ? darkThemeTokens.warning
                : darkThemeTokens.success,
        })),
    [data.monthly]
  );

  const monthlyCategorySummary = data.monthly.filter((item) => item.categoryId !== null).slice(0, 6);
  const yearlyOverall = data.yearly.find((item) => item.categoryId === null) ?? null;
  const editableBudgets = useMemo(
    () =>
      [...data.monthly, ...data.yearly].sort((a, b) => {
        if (a.period !== b.period) {
          return a.period === 'monthly' ? -1 : 1;
        }
        if (a.categoryId === null && b.categoryId !== null) {
          return -1;
        }
        if (a.categoryId !== null && b.categoryId === null) {
          return 1;
        }
        return b.spentCents - a.spentCents;
      }),
    [data.monthly, data.yearly]
  );

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
        <View style={styles.titleRow}>
          <Text style={styles.title}>Budgets</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add budget"
            hitSlop={10}
            onPress={() => {
              setActiveBudgetId(null);
              setSheetVisible(true);
            }}>
            <MaterialIcons name="add-circle-outline" size={29} color={darkThemeTokens.accent} />
          </Pressable>
        </View>

        <Pressable
          disabled={!monthlyOverall}
          style={[styles.card, !monthlyOverall ? styles.cardDisabled : null]}
          onPress={() => {
            if (!monthlyOverall) return;
            setActiveBudgetId(monthlyOverall.budgetId);
            setSheetVisible(true);
          }}>
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
        </Pressable>

        <Pressable
          disabled={!yearlyOverall}
          style={[styles.card, !yearlyOverall ? styles.cardDisabled : null]}
          onPress={() => {
            if (!yearlyOverall) return;
            setActiveBudgetId(yearlyOverall.budgetId);
            setSheetVisible(true);
          }}>
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
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.label}>Category utilization (%)</Text>
          {monthlyCategoryBars.length > 0 ? (
            <Animated.View
              style={[
                styles.chartFrame,
                {
                  opacity: chartMotion,
                  transform: [
                    {
                      translateY: chartMotion.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                  ],
                },
              ]}>
              <View style={styles.barChartCenter}>
                <BarChart
                  data={monthlyCategoryBars}
                  barWidth={19}
                  spacing={18}
                  initialSpacing={12}
                  barBorderRadius={9}
                  roundedTop
                  showGradient
                  gradientColor={darkThemeTokens.surfaceAlt}
                  hideRules={false}
                  rulesColor={darkThemeTokens.surfaceAlt}
                  rulesType="dashed"
                  dashWidth={5}
                  dashGap={4}
                  xAxisColor={darkThemeTokens.surfaceAlt}
                  yAxisColor={darkThemeTokens.surfaceAlt}
                  yAxisTextStyle={styles.chartAxisText}
                  xAxisLabelTextStyle={styles.chartAxisText}
                  yAxisLabelSuffix="%"
                  maxValue={120}
                  stepValue={30}
                  noOfSections={4}
                  isAnimated={!reduceMotion}
                  animationDuration={860}
                  focusBarOnPress
                  disableScroll
                />
              </View>
              <View style={styles.summaryList}>
                {monthlyCategorySummary.map((item, index) => (
                  <Pressable
                    key={item.budgetId}
                    onPress={() => {
                      setActiveBudgetId(item.budgetId);
                      setSheetVisible(true);
                    }}>
                    <Text style={styles.summaryItem}>
                      {index + 1}. {formatCurrency(item.spentCents)} / {formatCurrency(item.budgetCents)} (
                      {Math.round(item.progressRatio * 100)}%) - {formatThresholdState(item.thresholdState)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          ) : (
            <Text style={styles.muted}>No category budgets available.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Manage budgets</Text>
          {editableBudgets.length === 0 ? <Text style={styles.muted}>No budgets yet.</Text> : null}
          {editableBudgets.map((budget) => (
            <Pressable
              key={budget.budgetId}
              style={styles.row}
              onPress={() => {
                setActiveBudgetId(budget.budgetId);
                setSheetVisible(true);
              }}>
              <View>
                <Text style={styles.rowTitle}>
                  {formatBudgetPeriodLabel(budget.period, budget.startDate)} - {budget.categoryName}
                </Text>
                <Text style={styles.rowMeta}>
                  {budget.period} - {Math.round(budget.progressRatio * 100)}% used
                </Text>
              </View>
              <Text style={styles.rowAmount}>{formatCurrency(budget.budgetCents)}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? <ActivityIndicator color={darkThemeTokens.accent} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {sheetVisible ? (
        <BudgetSheet
          budgetId={activeBudgetId ?? undefined}
          presentation="modal"
          onClose={() => {
            setSheetVisible(false);
            setActiveBudgetId(null);
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  cardDisabled: {
    opacity: 0.95,
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
  chartAxisText: {
    color: darkThemeTokens.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  chartFrame: {
    marginTop: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#243041',
    backgroundColor: '#111822',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 2,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  barChartCenter: {
    width: '100%',
    alignItems: 'center',
  },
  summaryList: {
    marginTop: 6,
    gap: 4,
  },
  summaryItem: {
    color: darkThemeTokens.textSecondary,
    fontSize: 12,
    lineHeight: 18,
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
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    color: darkThemeTokens.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  rowAmount: {
    color: darkThemeTokens.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: darkThemeTokens.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});
