import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { YuYiStoreProvider, useYuYiStore } from '../src/context/YuYiStore';

function AuthGate() {
  const { hydrated, authUser } = useYuYiStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    const inAuthRoute = segments[0] === 'auth';
    if (!authUser && !inAuthRoute) {
      router.replace('/auth');
    }
  }, [hydrated, authUser, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <YuYiStoreProvider>
      <StatusBar style="dark" />
      <AuthGate />
    </YuYiStoreProvider>
  );
}
