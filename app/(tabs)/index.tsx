import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "react-native";
import { LineChart, PieChart } from "react-native-gifted-charts";

import { formatCurrency, formatShortDay } from "@/src/data/local/database";
import { useHomeData } from "@/src/features/home/use-home-data";
import { TransactionSheet } from "@/src/features/transactions/transaction-sheet";
import { darkThemeTokens } from "@/src/shared/theme/tokens";
import { AddExpenseFab } from "@/src/shared/ui/add-expense-fab";

export default function HomeScreen() {
  const { data, loading, error, refresh } = useHomeData();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(-1);
  const [sheetVisible, setSheetVisible] = useState(false);
  const pieMotion = useRef(new Animated.Value(0)).current;
  const trendMotion = useRef(new Animated.Value(0)).current;
  const pieSelectMotion = useRef(new Animated.Value(1)).current;
  const centerLabelMotion = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const timings = [pieMotion, trendMotion].map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: reduceMotion ? 0 : 520,
        delay: reduceMotion ? 0 : 120 + index * 110,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    Animated.parallel(timings).start();
  }, [pieMotion, reduceMotion, trendMotion]);

  useEffect(() => {
    if (data.topCategories.length === 0) {
      setSelectedCategoryIndex(0);
      return;
    }

    if (selectedCategoryIndex > data.topCategories.length - 1) {
      setSelectedCategoryIndex(0);
    }
  }, [data.topCategories.length, selectedCategoryIndex]);

  useEffect(() => {
    if (reduceMotion) {
      pieSelectMotion.setValue(1);
      centerLabelMotion.setValue(1);
      return;
    }

    pieSelectMotion.setValue(0.96);
    centerLabelMotion.setValue(0);

    Animated.parallel([
      Animated.spring(pieSelectMotion, {
        toValue: 1,
        stiffness: 260,
        damping: 20,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(centerLabelMotion, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [centerLabelMotion, pieSelectMotion, reduceMotion, selectedCategoryIndex]);

  const pieData = useMemo(
    () =>
      data.topCategories.map((category, index) => ({
        value: category.spentCents,
        color: category.color,
        text: `${Math.round(category.percentOfTotal)}%`,
        gradientCenterColor: category.color,
        focused: index === selectedCategoryIndex,
        onPress: () =>
          setSelectedCategoryIndex((currentIndex) =>
            currentIndex === index ? -1 : index,
          ),
      })),
    [data.topCategories, selectedCategoryIndex],
  );

  const trendData = useMemo(
    () =>
      data.dailyTrend.map((point) => ({
        value: Math.round(point.spentCents / 100),
        label: formatShortDay(point.date),
      })),
    [data.dailyTrend],
  );

  const budgetRemaining = data.totalBudget
    ? Math.max(data.totalBudget.budgetCents - data.totalBudget.spentCents, 0)
    : 0;
  const pieLegendItems = data.topCategories.slice(0, 6);
  const selectedCategory = data.topCategories[selectedCategoryIndex] ?? null;

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
        <Text style={styles.title}>Home</Text>

        <View style={styles.card}>
          <Text style={styles.label}>This month spent</Text>
          <Text style={styles.value}>
            {formatCurrency(data.summary.spentCents)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Budget remaining</Text>
          <Text style={styles.valueSmall}>
            {formatCurrency(budgetRemaining)}
          </Text>
          {data.totalBudget ? (
            <Text style={styles.muted}>
              Used {Math.round(data.totalBudget.progressRatio * 100)}% of
              monthly overall budget.
            </Text>
          ) : (
            <Text style={styles.muted}>
              No monthly overall budget configured yet.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Top categories</Text>
          {pieData.length > 0 ? (
            <Animated.View
              style={[
                styles.chartFrame,
                {
                  paddingBottom: 15
                },
                {
                  opacity: pieMotion,
                  transform: [
                    {
                      translateY: pieMotion.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.pieChartCenter,
                  {
                    transform: [{ scale: pieSelectMotion }],
                  },
                ]}
              >
                <PieChart
                  data={pieData}
                  donut
                  radius={100}
                  innerRadius={66}
                  innerCircleColor={darkThemeTokens.surface}
                  textColor={darkThemeTokens.textPrimary}
                  textSize={11}
                  fontWeight="700"
                  showGradient
                  focusOnPress
                  selectedIndex={selectedCategoryIndex}
                  setSelectedIndex={(index: number) =>
                    setSelectedCategoryIndex((currentIndex) =>
                      currentIndex === index ? -1 : index,
                    )
                  }
                  edgesRadius={20}
                  showTextBackground
                  textBackgroundColor={darkThemeTokens.surfaceAlt}
                  textBackgroundRadius={10}
                  centerLabelComponent={() =>
                    selectedCategory ? (
                      <Animated.View
                        style={[
                          styles.centerLabelWrap,
                          {
                            opacity: centerLabelMotion,
                            transform: [
                              {
                                translateY: centerLabelMotion.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [6, 0],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <Text style={styles.centerLabelTitle}>
                          {Math.round(selectedCategory.percentOfTotal)}%
                        </Text>
                        <Text
                          style={styles.centerLabelSubtitle}
                          numberOfLines={1}
                        >
                          {selectedCategory.categoryName}
                        </Text>
                      </Animated.View>
                    ) : (
                      <Animated.View
                        style={[
                          styles.centerLabelWrap,
                          {
                            opacity: centerLabelMotion,
                            transform: [
                              {
                                translateY: centerLabelMotion.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [6, 0],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <Text
                          style={styles.centerLabelTitle}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          {formatCurrency((data.summary.spentCents))}
                        </Text>
                        <Text style={styles.centerLabelSubtitle} numberOfLines={1}>
                          {new Date(data.summary.monthStart).toLocaleDateString('en-AU', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                      </Animated.View>
                    )
                  }
                  isAnimated={!reduceMotion}
                  animationDuration={760}
                />
              </Animated.View>
              <View style={styles.legendList}>
                {pieLegendItems.map((category) => {
                  const categoryIndex = data.topCategories.findIndex(
                    (item) => item.categoryId === category.categoryId,
                  );
                  const isSelected = categoryIndex === selectedCategoryIndex;

                  return (
                    <Pressable
                      key={category.categoryId ?? "uncategorized"}
                      style={[
                        styles.legendItem,
                        isSelected ? styles.legendItemSelected : null,
                      ]}
                      onPress={() => {
                        if (categoryIndex >= 0) {
                          setSelectedCategoryIndex((currentIndex) =>
                            currentIndex === categoryIndex ? -1 : categoryIndex,
                          );
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.legendDot,
                          {
                            backgroundColor: category.color,
                          },
                        ]}
                      />
                      <View style={styles.legendTextWrap}>
                        <Text style={styles.legendPrimary} numberOfLines={1}>
                          {category.categoryName}
                        </Text>
                        <Text style={styles.legendSecondary}>
                          {Math.round(category.percentOfTotal)}% •{" "}
                          {formatCurrency(category.spentCents)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          ) : (
            <Text style={styles.muted}>No expense data yet.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Daily spend trend (AUD)</Text>
          {trendData.length > 0 ? (
            <Animated.View
              style={[
                styles.chartFrame,
                {
                  opacity: trendMotion,
                  transform: [
                    {
                      translateY: trendMotion.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LineChart
                data={trendData}
                areaChart
                startFillColor={darkThemeTokens.accent}
                endFillColor={darkThemeTokens.accent}
                startOpacity={0.24}
                endOpacity={0.02}
                color={darkThemeTokens.accent}
                dataPointsColor={darkThemeTokens.accent}
                dataPointsRadius={3.5}
                dataPointsWidth={8}
                dataPointsHeight={8}
                yAxisColor={darkThemeTokens.surfaceAlt}
                xAxisColor={darkThemeTokens.surfaceAlt}
                rulesColor={darkThemeTokens.surfaceAlt}
                yAxisTextStyle={styles.chartAxisText}
                xAxisLabelTextStyle={styles.chartAxisText}
                hideRules={false}
                rulesType="dashed"
                dashGap={4}
                dashWidth={5}
                thickness={3}
                noOfSections={3}
                yAxisLabelWidth={42}
                xAxisTextNumberOfLines={1}
                spacing={22}
                initialSpacing={8}
                isAnimated={!reduceMotion}
                onDataChangeAnimationDuration={540}
                curved
              />
            </Animated.View>
          ) : (
            <Text style={styles.muted}>No daily trend yet.</Text>
          )}
        </View>

        {loading ? <ActivityIndicator color={darkThemeTokens.accent} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
      <AddExpenseFab onPress={() => setSheetVisible(true)} />
      {sheetVisible ? (
        <TransactionSheet
          presentation="modal"
          onClose={() => setSheetVisible(false)}
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
    fontWeight: "700",
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
    fontWeight: "600",
  },
  value: {
    color: darkThemeTokens.textPrimary,
    fontSize: 28,
    fontWeight: "700",
  },
  valueSmall: {
    color: darkThemeTokens.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  muted: {
    color: darkThemeTokens.textSecondary,
    fontSize: 15,
  },
  chartAxisText: {
    color: darkThemeTokens.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  chartFrame: {
    marginTop: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#243041",
    backgroundColor: "#111822",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 2,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pieChartCenter: {
    width: "100%",
    alignItems: "center",
  },
  legendList: {
    marginTop: 10,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  legendItemSelected: {
    backgroundColor: darkThemeTokens.surfaceAlt,
    borderWidth: 1,
    borderColor: "#2E3A4C",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendTextWrap: {
    flex: 1,
    gap: 1,
  },
  legendPrimary: {
    color: darkThemeTokens.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  legendSecondary: {
    color: darkThemeTokens.textSecondary,
    fontSize: 12,
  },
  centerLabelWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 120,
  },
  centerLabelTitle: {
    color: darkThemeTokens.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  centerLabelSubtitle: {
    color: darkThemeTokens.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  centerLabelEmptyTitle: {
    color: darkThemeTokens.textSecondary,
    fontSize: 20,
    fontWeight: "700",
  },
  centerLabelEmptySubtitle: {
    color: darkThemeTokens.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  errorText: {
    color: darkThemeTokens.danger,
    fontSize: 14,
  },
});
