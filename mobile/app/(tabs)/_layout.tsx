import { Tabs } from "expo-router";

import { AppDrawer } from "@/components/shell/AppDrawer";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { MobileTabBar, type MobileTabBarProps } from "@/components/shell/MobileTabBar";
import { useThemeColors } from "@/constants/theme";

export default function TabLayout() {
  const colors = useThemeColors();

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <MobileTabBar
            state={props.state}
            navigation={props.navigation as MobileTabBarProps["navigation"]}
          />
        )}
        screenOptions={{
          header: () => <AppTopBar />,
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="pipeline" options={{ title: "Pipeline" }} />
        <Tabs.Screen name="map" options={{ title: "Map" }} />
        <Tabs.Screen name="follow-ups" options={{ title: "Tasks" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        <Tabs.Screen name="trash" options={{ href: null, title: "Trash" }} />
        <Tabs.Screen name="team" options={{ href: null, title: "Field Team" }} />
        <Tabs.Screen name="users" options={{ href: null, title: "Users" }} />
        <Tabs.Screen name="master-data" options={{ href: null, title: "Master Data" }} />
        <Tabs.Screen name="access-requests" options={{ href: null, title: "Access requests" }} />
      </Tabs>
      <AppDrawer />
    </>
  );
}
