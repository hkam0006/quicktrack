import React, { useEffect, useMemo, useRef } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { darkThemeTokens } from '@/src/shared/theme/tokens';

import { useAddBudget } from './use-add-budget';

const periods: ('monthly' | 'yearly')[] = ['monthly', 'yearly'];
const monthFormatter = new Intl.DateTimeFormat('en-AU', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

interface BudgetSheetProps {
  budgetId?: string;
  onClose: () => void;
  presentation?: 'inline' | 'modal';
}

export function BudgetSheet({ budgetId, onClose, presentation = 'inline' }: BudgetSheetProps) {
  const insets = useSafeAreaInsets();
  const { form, categories, saving, error, isEditing, update, updatePeriod, save } = useAddBudget({
    budgetId,
  });
  const sheetMotion = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const monthLabel = useMemo(() => {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(form.monthKey);
    if (!match) {
      return 'Select month';
    }

    const parsedYear = Number.parseInt(match[1], 10);
    const parsedMonth = Number.parseInt(match[2], 10) - 1;
    const date = new Date(Date.UTC(parsedYear, parsedMonth, 1, 0, 0, 0, 0));
    return monthFormatter.format(date);
  }, [form.monthKey]);

  const changeMonth = React.useCallback(
    (delta: number) => {
      const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(form.monthKey);
      if (!match) {
        return;
      }
      const parsedYear = Number.parseInt(match[1], 10);
      const parsedMonth = Number.parseInt(match[2], 10) - 1;
      const next = new Date(Date.UTC(parsedYear, parsedMonth + delta, 1, 0, 0, 0, 0));
      const nextKey = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
      update({ monthKey: nextKey, yearKey: String(next.getUTCFullYear()) });
    },
    [form.monthKey, update]
  );

  const changeYear = React.useCallback(
    (delta: number) => {
      const year = Number.parseInt(form.yearKey, 10);
      if (!Number.isFinite(year)) {
        return;
      }
      const nextYear = String(year + delta);
      update({ yearKey: nextYear });
    },
    [form.yearKey, update]
  );

  const yearLabel = useMemo(() => {
    const year = Number.parseInt(form.yearKey, 10);
    if (!Number.isFinite(year)) {
      return 'Select year';
    }
    return String(year);
  }, [form.yearKey]);

  const dismissSheet = React.useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetMotion, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(dragY, {
        toValue: 360,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [dragY, onClose, sheetMotion]);

  useEffect(() => {
    Animated.spring(sheetMotion, {
      toValue: 1,
      useNativeDriver: true,
      damping: 24,
      mass: 0.9,
      stiffness: 240,
    }).start();
  }, [sheetMotion]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gestureState) =>
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 4,
      onPanResponderMove: (_event, gestureState) => {
        if (gestureState.dy <= 0) {
          dragY.setValue(0);
          return;
        }

        dragY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_event, gestureState) => {
        const shouldDismiss = gestureState.dy > 120 || gestureState.vy > 1.1;
        if (shouldDismiss) {
          dismissSheet();
          return;
        }

        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 260,
          mass: 0.8,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 260,
          mass: 0.8,
        }).start();
      },
    })
  ).current;

  const sheetContent = (
    <View style={styles.modalRoot}>
      <Pressable style={styles.backdrop} onPress={dismissSheet} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardLayer}>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 14),
              transform: [
                {
                  translateY: sheetMotion.interpolate({
                    inputRange: [0, 1],
                    outputRange: [420, 0],
                  }),
                },
                { translateY: dragY },
              ],
            },
          ]}
          {...panResponder.panHandlers}>
          <View style={styles.handleWrap} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          <View style={styles.headerRow}>
            <Text style={styles.title}>{isEditing ? 'Edit budget' : 'Add budget'}</Text>
            <Pressable hitSlop={10} onPress={dismissSheet}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <Text style={styles.label}>Period</Text>
              <View style={styles.segmentRow}>
                {periods.map((period) => (
                  <Pressable
                    key={period}
                    style={[styles.segment, form.period === period ? styles.segmentActive : null]}
                    onPress={() => updatePeriod(period)}>
                    <Text style={[styles.segmentText, form.period === period ? styles.segmentTextActive : null]}>
                      {period}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Budget amount (AUD)</Text>
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
              <Text style={styles.label}>Scope</Text>
              <View style={styles.wrapRow}>
                <Pressable
                  onPress={() => update({ categoryId: null })}
                  style={[styles.chip, form.categoryId === null ? styles.chipActive : null]}>
                  <Text style={[styles.chipText, form.categoryId === null ? styles.chipTextActive : null]}>
                    Overall
                  </Text>
                </Pressable>
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

            {form.period === 'monthly' ? (
              <View style={styles.card}>
                <Text style={styles.label}>Month</Text>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    hitSlop={10}
                    onPress={() => changeMonth(-1)}
                    style={styles.stepperArrow}>
                    <MaterialIcons name="keyboard-arrow-left" size={24} color={darkThemeTokens.textPrimary} />
                  </Pressable>
                  <Text style={styles.stepperValue}>{monthLabel}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    hitSlop={10}
                    onPress={() => changeMonth(1)}
                    style={styles.stepperArrow}>
                    <MaterialIcons name="keyboard-arrow-right" size={24} color={darkThemeTokens.textPrimary} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.label}>Year</Text>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous year"
                    hitSlop={10}
                    onPress={() => changeYear(-1)}
                    style={styles.stepperArrow}>
                    <MaterialIcons name="keyboard-arrow-left" size={24} color={darkThemeTokens.textPrimary} />
                  </Pressable>
                  <Text style={styles.stepperValue}>{yearLabel}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next year"
                    hitSlop={10}
                    onPress={() => changeYear(1)}
                    style={styles.stepperArrow}>
                    <MaterialIcons name="keyboard-arrow-right" size={24} color={darkThemeTokens.textPrimary} />
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.label}>Alerts</Text>
              <View style={styles.segmentRow}>
                <Pressable
                  style={[styles.segment, form.alertAt80Percent ? styles.segmentActive : null]}
                  onPress={() => update({ alertAt80Percent: !form.alertAt80Percent })}>
                  <Text
                    style={[styles.segmentText, form.alertAt80Percent ? styles.segmentTextActive : null]}>
                    80%
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.segment, form.alertAt100Percent ? styles.segmentActive : null]}
                  onPress={() => update({ alertAt100Percent: !form.alertAt100Percent })}>
                  <Text
                    style={[styles.segmentText, form.alertAt100Percent ? styles.segmentTextActive : null]}>
                    100%
                  </Text>
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryButton, saving ? styles.primaryButtonDisabled : null]}
              disabled={saving}
              onPress={async () => {
                const ok = await save();
                if (ok) {
                  dismissSheet();
                }
              }}>
              {saving ? (
                <ActivityIndicator color={darkThemeTokens.background} />
              ) : (
                <Text style={styles.primaryText}>{isEditing ? 'Save changes' : 'Save budget'}</Text>
              )}
            </Pressable>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );

  if (presentation === 'modal') {
    return (
      <Modal transparent animationType="none" visible statusBarTranslucent onRequestClose={dismissSheet}>
        {sheetContent}
      </Modal>
    );
  }

  return sheetContent;
}

const styles = StyleSheet.create({
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 8, 15, 0.62)',
  },
  keyboardLayer: {
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: darkThemeTokens.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: darkThemeTokens.surfaceAlt,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: darkThemeTokens.surfaceAlt,
  },
  handleWrap: {
    alignSelf: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    width: '100%',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    color: darkThemeTokens.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  closeText: {
    color: darkThemeTokens.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 14,
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
    gap: 10,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkThemeTokens.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: 'rgba(63, 162, 246, 0.18)',
    borderColor: darkThemeTokens.accent,
  },
  segmentText: {
    color: darkThemeTokens.textSecondary,
    fontWeight: '600',
    textTransform: 'capitalize',
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: darkThemeTokens.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: darkThemeTokens.surfaceAlt,
  },
  chipActive: {
    borderColor: darkThemeTokens.accent,
    backgroundColor: 'rgba(63, 162, 246, 0.2)',
  },
  chipText: {
    color: darkThemeTokens.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: darkThemeTokens.textPrimary,
  },
  stepper: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: darkThemeTokens.surfaceAlt,
    backgroundColor: darkThemeTokens.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  stepperArrow: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A4B61',
    backgroundColor: '#162130',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    color: darkThemeTokens.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 6,
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkThemeTokens.accent,
  },
  primaryButtonDisabled: {
    opacity: 0.68,
  },
  primaryText: {
    color: darkThemeTokens.background,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: darkThemeTokens.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});
