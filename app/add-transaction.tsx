import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
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

import { useAddTransaction } from '@/src/features/transactions/use-add-transaction';
import { darkThemeTokens } from '@/src/shared/theme/tokens';

const paymentMethods: ('cash' | 'card' | 'bank')[] = ['cash', 'card', 'bank'];
const types: ('expense' | 'income')[] = ['expense', 'income'];

export default function AddTransactionModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { form, categories, saving, error, update, save } = useAddTransaction();

  const sheetMotion = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

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
      router.back();
    });
  }, [dragY, router, sheetMotion]);

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

  return (
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
            <Text style={styles.title}>Add transaction</Text>
            <Pressable hitSlop={10} onPress={dismissSheet}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}>
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
                  dismissSheet();
                }
              }}>
              {saving ? (
                <ActivityIndicator color={darkThemeTokens.background} />
              ) : (
                <Text style={styles.primaryText}>Save</Text>
              )}
            </Pressable>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
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
    marginBottom: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: darkThemeTokens.background,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: darkThemeTokens.danger,
    fontSize: 14,
  },
});
