import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { darkThemeTokens } from '@/src/shared/theme/tokens';

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Categories</Text>
        <Text style={styles.muted}>Create, edit, merge, and archive categories.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Export CSV</Text>
        <Text style={styles.muted}>Export all local transactions for current user.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Currency</Text>
        <Text style={styles.value}>AUD</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkThemeTokens.background,
  },
  content: {
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 36,
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
    gap: 6,
  },
  label: {
    color: darkThemeTokens.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  muted: {
    color: darkThemeTokens.textSecondary,
    fontSize: 15,
  },
  value: {
    color: darkThemeTokens.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
});
