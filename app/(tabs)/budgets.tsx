import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { useBudgetsData } from '@/src/features/budgets/use-budgets-data';
import { darkThemeTokens } from '@/src/shared/theme/tokens';
import { AddExpenseFab } from '@/src/shared/ui/add-expense-fab';

export default function BudgetsScreen() {
  const { data, monthlyOverall, loading, error, refresh, formatCurrency } = useBudgetsData();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
                rulesType='dashed'
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
                <Text key={item.budgetId} style={styles.summaryItem}>
                  {index + 1}. {formatCurrency(item.spentCents)} / {formatCurrency(item.budgetCents)} (
                  {Math.round(item.progressRatio * 100)}%) - {formatThresholdState(item.thresholdState)}
                </Text>
              ))}
            </View>
          </Animated.View>
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
    fontSize: 13,
  },
  errorText: {
    color: darkThemeTokens.danger,
    fontSize: 14,
  },
});
