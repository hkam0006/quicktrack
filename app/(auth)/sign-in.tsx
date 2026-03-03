import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { signInSchema, type SignInFormValues } from '@/src/features/auth/auth.schemas';
import { useAuth } from '@/src/features/auth/auth.context';
import { darkThemeTokens } from '@/src/shared/theme/tokens';

export default function SignInScreen() {
  const { signIn, isLoading, errorMessage, clearError } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: SignInFormValues) {
    clearError();
    await signIn({
      email: values.email,
      password: values.password,
    });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Quick Track</Text>
        <Text style={styles.subtitle}>Sign in to sync your data across devices.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                placeholder="you@example.com"
                placeholderTextColor={darkThemeTokens.textSecondary}
                style={styles.input}
              />
            )}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email.message}</Text> : null}

          <Text style={styles.label}>Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                placeholder="••••••••"
                placeholderTextColor={darkThemeTokens.textSecondary}
                style={styles.input}
              />
            )}
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password.message}</Text> : null}
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          style={[styles.primaryButton, (isSubmitting || isLoading) ? styles.primaryButtonDisabled : null]}
          disabled={isSubmitting || isLoading}
          onPress={handleSubmit(onSubmit)}>
          {isSubmitting || isLoading ? (
            <ActivityIndicator color={darkThemeTokens.background} />
          ) : (
            <Text style={styles.primaryText}>Sign In</Text>
          )}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>No account yet?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Create one</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkThemeTokens.background,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    gap: 14,
  },
  title: {
    color: darkThemeTokens.textPrimary,
    fontSize: 34,
    fontWeight: '700',
  },
  subtitle: {
    color: darkThemeTokens.textSecondary,
    fontSize: 15,
  },
  card: {
    backgroundColor: darkThemeTokens.surface,
    borderWidth: 1,
    borderColor: darkThemeTokens.surfaceAlt,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  label: {
    color: darkThemeTokens.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  input: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: darkThemeTokens.surfaceAlt,
    color: darkThemeTokens.textPrimary,
    paddingHorizontal: 12,
  },
  errorText: {
    color: darkThemeTokens.danger,
    fontSize: 13,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: darkThemeTokens.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryText: {
    color: darkThemeTokens.background,
    fontWeight: '700',
    fontSize: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    color: darkThemeTokens.textSecondary,
  },
  footerLink: {
    color: darkThemeTokens.accent,
    fontWeight: '700',
  },
});
