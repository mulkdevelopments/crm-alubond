import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeColors, useThemeColors } from "@/constants/theme";
import { TAB_NAV_ITEMS } from "@/lib/shell/navigation";

type TabRoute = {
  key: string;
  name: string;
};

export type MobileTabBarProps = {
  state: {
    index: number;
    routes: TabRoute[];
  };
  navigation: {
    emit: (event: { type: string; target?: string; canPreventDefault?: boolean }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
};

export function MobileTabBar({ state, navigation }: MobileTabBarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((route) =>
    TAB_NAV_ITEMS.some((item) => item.route === route.name)
  );

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {visibleRoutes.map((route) => {
          const routeIndex = state.routes.findIndex((entry) => entry.key === route.key);
          const isFocused = state.index === routeIndex;
          const item = TAB_NAV_ITEMS.find((entry) => entry.route === route.name);
          if (!item) return null;

          const Icon = item.icon;
          const color = isFocused ? colors.brand : colors.text3;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={item.label}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={styles.tabItem}
            >
              <Icon size={20} color={color} strokeWidth={2.2} />
              <Text style={[styles.tabLabel, { color }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 0,
    },
    bar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    tabItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 12,
    },
    tabLabel: {
      fontSize: 10,
      fontWeight: "500",
    },
  });
}
