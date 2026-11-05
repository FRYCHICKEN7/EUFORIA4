import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthSessionProvider } from "@/lib/auth-session";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = { anchor: "(tabs)" };

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={styles.errorScreen} accessibilityRole="alert">
      <Text style={styles.errorBrand}>EUFORIA</Text>
      <Text style={styles.errorTitle}>Algo no salió como esperábamos</Text>
      <Text style={styles.errorMessage}>
        La pantalla encontró un problema. Puedes intentar cargarla de nuevo sin cerrar tu sesión.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reintentar pantalla"
        onPress={retry}
        style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
      >
        <Text style={styles.retryButtonText}>Reintentar</Text>
      </Pressable>
      {__DEV__ ? <Text style={styles.errorDetails}>{error.message}</Text> : null}
    </View>
  );
}

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;
  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  useEffect(() => { initManusRuntime(); }, []);
  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    return subscribeSafeAreaInsets(handleSafeAreaUpdate);
  }, [handleSafeAreaUpdate]);

  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }));
  const [trpcClient] = useState(() => createTRPCClient());
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return { ...metrics, insets: { ...metrics.insets, top: Math.max(metrics.insets.top, 16), bottom: Math.max(metrics.insets.bottom, 12) } };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthSessionProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="client/catalog" />
              <Stack.Screen name="employee/schedule" />
              <Stack.Screen name="employee/availability" />
              <Stack.Screen name="admin/services" />
              <Stack.Screen name="change-password" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="oauth/callback" />
            </Stack>
            <StatusBar style="auto" />
          </QueryClientProvider>
        </trpc.Provider>
      </AuthSessionProvider>
    </GestureHandlerRootView>
  );

  if (Platform.OS === "web") {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>{content}</SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }
  return <ThemeProvider><SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider></ThemeProvider>;
}

const styles = StyleSheet.create({
  errorScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: "#FFF5F7" },
  errorBrand: { color: "#5C1A2E", fontSize: 16, fontWeight: "800", letterSpacing: 3, marginBottom: 22 },
  errorTitle: { color: "#5C1A2E", fontSize: 24, fontWeight: "800", textAlign: "center" },
  errorMessage: { color: "#6D5960", fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 360, textAlign: "center" },
  retryButton: { backgroundColor: "#D85C7A", borderRadius: 14, marginTop: 24, minHeight: 48, paddingHorizontal: 26, justifyContent: "center" },
  retryButtonPressed: { opacity: 0.82 },
  retryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  errorDetails: { color: "#9A7B84", fontSize: 11, marginTop: 20, maxWidth: 360, textAlign: "center" },
});
