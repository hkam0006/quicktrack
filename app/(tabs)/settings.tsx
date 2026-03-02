import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/src/features/auth/auth.context';
import { darkThemeTokens } from '@/src/shared/theme/tokens';

export default function SettingsScreen() {
  const { signOut, isLoading, errorMessage, clearError } = useAuth();

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
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <Pressable
        style={[styles.signOutButton, isLoading ? styles.signOutButtonDisabled : null]}
        disabled={isLoading}
        onPress={async () => {
          clearError();
          await signOut();
        }}>
        {isLoading ? <ActivityIndicator color={darkThemeTokens.textPrimary} /> : <Text style={styles.signOutText}>Sign Out</Text>}
      </Pressable>
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
  signOutButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkThemeTokens.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonDisabled: {
    opacity: 0.7,
  },
  signOutText: {
    color: darkThemeTokens.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: darkThemeTokens.danger,
    fontSize: 13,
  },
});
