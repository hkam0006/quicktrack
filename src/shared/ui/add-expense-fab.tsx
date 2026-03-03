import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';

import { darkThemeTokens } from '@/src/shared/theme/tokens';

interface AddExpenseFabProps {
  onPress?: () => void;
}

export function AddExpenseFab({ onPress }: AddExpenseFabProps) {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <Pressable
      style={[styles.fab, { bottom: tabBarHeight + 12 }]}
      onPress={onPress}>
      <Text style={styles.plus}>+</Text>
      {/*<Text style={styles.label}>Add expense</Text>*/}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: darkThemeTokens.accent,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 5,
  },
  plus: {
    color: darkThemeTokens.background,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
  },
  label: {
    color: darkThemeTokens.background,
    fontSize: 15,
    fontWeight: '700',
  },
});
