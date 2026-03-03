import React, { useEffect, useRef } from 'react';
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

import { useAddTransaction } from './use-add-transaction';

const paymentMethods: ('cash' | 'card' | 'bank')[] = ['cash', 'card', 'bank'];
const types: ('expense' | 'income')[] = ['expense', 'income'];

interface TransactionSheetProps {
  transactionId?: string;
  onClose: () => void;
  presentation?: 'inline' | 'modal';
}

export function TransactionSheet({
  transactionId,
  onClose,
  presentation = 'inline',
}: TransactionSheetProps) {
  const insets = useSafeAreaInsets();
  const { form, categories, saving, error, isEditing, update, save } = useAddTransaction({
    transactionId,
  });
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
            <Text style={styles.title}>{isEditing ? 'Edit transaction' : 'Add transaction'}</Text>
            <Pressable hitSlop={10} onPress={dismissSheet}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
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
                <Text style={styles.primaryText}>{isEditing ? 'Save changes' : 'Save'}</Text>
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
    gap: 8,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkThemeTokens.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    borderColor: darkThemeTokens.accent,
    backgroundColor: '#24394A',
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
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipActive: {
    borderColor: darkThemeTokens.accent,
    backgroundColor: '#24394A',
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
    opacity: 0.75,
  },
  primaryText: {
    color: darkThemeTokens.background,
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: {
    color: darkThemeTokens.danger,
    fontSize: 13,
  },
});
