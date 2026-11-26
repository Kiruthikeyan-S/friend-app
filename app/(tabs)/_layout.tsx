import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppStore } from '@/services/appStore';

export default function TabsLayout() {
  const { userProfile, authHydrated } = useAppStore();

  if (authHydrated && userProfile.authStatus !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          borderTopColor: 'rgba(255, 255, 255, 0.96)',
          borderTopWidth: 1.2,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
          elevation: 4,
          shadowColor: '#9D7BB0',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => (
            <Feather name="message-circle" size={21} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: 'Voice',
          tabBarIcon: ({ color }) => (
            <Feather name="mic" size={21} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: 'Memory',
          tabBarIcon: ({ color }) => (
            <Feather name="bookmark" size={21} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <Feather name="sliders" size={21} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
