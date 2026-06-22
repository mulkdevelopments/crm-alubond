import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { BrandLogo } from "@/components/BrandLogo";
import { colors } from "@/constants/theme";
import { useAuth, canAccessTeam } from "@/lib/auth/AuthContext";

export default function TabLayout() {
  const { user } = useAuth();
  const showTeam = canAccessTeam(user?.role);
  const showUsers = user?.role === "ADMIN";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitle: () => <BrandLogo markSize="sm" />,
        headerTitleAlign: "left",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pipeline"
        options={{
          title: "Pipeline",
          tabBarIcon: ({ color, size }) => <Ionicons name="layers-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="follow-ups"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: "Team",
          href: showTeam ? "/team" : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          href: showUsers ? "/users" : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
