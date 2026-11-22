import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useYuYiStore } from '../../src/context/YuYiStore';
import { PARTNERS } from '../../src/services/nlpAndAiEngine';

export default function TabLayout() {
  const { currentUserId, spaceInfo } = useYuYiStore();
  const activeColor = PARTNERS[currentUserId].themeColor;
  const isSoloMode = spaceInfo?.usage_mode === 'solo';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F1F5F9',
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '雨仪清单',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-create"
        options={{
          title: 'AI 拆解',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="supervise"
        options={{
          title: isSoloMode ? '习惯自律' : '监督搭子',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isSoloMode ? 'flame-outline' : 'people-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '雨仪空间',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
