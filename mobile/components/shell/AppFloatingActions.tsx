import { StyleSheet, View } from "react-native";
import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AIAssistantFab } from "@/components/shell/AIAssistantFab";
import { QuickActivityFab } from "@/components/shell/QuickActivityFab";
import { useAuth } from "@/lib/auth/AuthContext";

const TAB_BAR_HEIGHT = 58;
const FAB_STACK_GAP = 64;

export function AppFloatingActions() {
  const { token } = useAuth();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const root = segments[0];
  const child = segments[1];
  const onTabs = root === "(tabs)";
  const onFormScreen = child === "form";
  const visible = Boolean(token) && root !== "(auth)" && !onFormScreen;

  if (!visible) return null;

  const aiBottom = Math.max(insets.bottom, 12) + (onTabs ? TAB_BAR_HEIGHT + 16 : 16);
  const quickBottom = aiBottom + FAB_STACK_GAP;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <QuickActivityFab bottom={quickBottom} />
      <AIAssistantFab bottom={aiBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    zIndex: 60,
  },
});
