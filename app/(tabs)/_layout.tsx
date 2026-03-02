import {
  createNativeBottomTabNavigator,
  type NativeBottomTabNavigationEventMap,
  type NativeBottomTabNavigationOptions,
} from '@bottom-tabs/react-navigation';
import type { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { withLayoutContext } from 'expo-router';
import React from 'react';

import { darkThemeTokens } from '@/src/shared/theme/tokens';

const BottomTabs = createNativeBottomTabNavigator();

const Tabs = withLayoutContext<
  NativeBottomTabNavigationOptions,
  typeof BottomTabs.Navigator,
  TabNavigationState<ParamListBase>,
  NativeBottomTabNavigationEventMap
>(BottomTabs.Navigator);

export default function TabLayout() {
  return (
    <Tabs
      hapticFeedbackEnabled
      tabBarStyle={{
        backgroundColor: darkThemeTokens.surface,
      }}
      tabBarActiveTintColor={darkThemeTokens.accent}
      tabBarInactiveTintColor={darkThemeTokens.textSecondary}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => ({ sfSymbol: focused ? 'house.fill' : 'house' }),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ focused }) => ({
            sfSymbol: focused ? 'list.bullet.rectangle.portrait.fill' : 'list.bullet.rectangle.portrait',
          }),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ focused }) => ({ sfSymbol: focused ? 'chart.bar.fill' : 'chart.bar' }),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => ({ sfSymbol: focused ? 'gearshape.fill' : 'gearshape' }),
        }}
      />
    </Tabs>
  );
}
