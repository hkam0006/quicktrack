import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { darkThemeTokens } from '@/src/shared/theme/tokens';

export function AuthLoadingView() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={darkThemeTokens.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkThemeTokens.background,
  },
});
