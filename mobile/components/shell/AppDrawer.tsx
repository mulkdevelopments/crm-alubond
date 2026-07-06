import { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { LogOut, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLogo } from "@/components/BrandLogo";
import { useAppShell } from "@/components/shell/AppShellContext";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import { useAuth } from "@/lib/auth/AuthContext";
import { getDrawerNavItems, isDrawerItemVisible, isRouteActive } from "@/lib/shell/navigation";

export function AppDrawer() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { menuOpen, closeMenu } = useAppShell();
  const { user, logout } = useAuth();

  const items = getDrawerNavItems(user?.role === "ADMIN");

  async function onPressItem(item: (typeof items)[number]) {
    closeMenu();
    if (item.externalUrl) {
      if (item.externalKind === "whatsapp") {
        await Linking.openURL(item.externalUrl);
        return;
      }
      await WebBrowser.openBrowserAsync(item.externalUrl);
      return;
    }
    if (item.href) {
      router.push(item.href as never);
    }
  }

  return (
    <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeMenu}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
        <View style={[styles.panel, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <BrandLogo markSize="sm" />
            <Pressable
              onPress={closeMenu}
              style={styles.iconButton}
              accessibilityLabel="Close menu"
            >
              <X size={16} color={colors.text} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.navContent} showsVerticalScrollIndicator={false}>
            {items
              .filter((item) => isDrawerItemVisible(item, user?.role))
              .map((item) => {
                const Icon = item.icon;
                const active = item.href ? isRouteActive(pathname, item.href) : false;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => void onPressItem(item)}
                    style={[styles.navItem, active && styles.navItemActive]}
                  >
                    <Icon
                      size={16}
                      color={active ? colors.text : colors.text2}
                      strokeWidth={2.2}
                    />
                    <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Pressable
              onPress={() => {
                closeMenu();
                void logout();
              }}
              style={styles.logoutButton}
            >
              <LogOut size={16} color="#e11d48" strokeWidth={2.2} />
              <Text style={styles.logoutLabel}>Logout</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    panel: {
      width: 280,
      maxWidth: "85%",
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 4, height: 0 },
      elevation: 8,
    },
    header: {
      height: 64,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    iconButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    navContent: {
      padding: 12,
      gap: 6,
    },
    navItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
    },
    navItemActive: {
      backgroundColor: colors.surface2,
    },
    navLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text2,
    },
    navLabelActive: {
      color: colors.text,
    },
    footer: {
      marginTop: "auto",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 12,
      paddingTop: 12,
    },
    logoutButton: {
      height: 36,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    logoutLabel: {
      fontSize: 14,
      color: "#e11d48",
      fontWeight: "500",
    },
  });
}
