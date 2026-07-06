import type { LucideIcon } from "lucide-react-native";
import {
  Bell,
  BookOpen,
  Database,
  KanbanSquare,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  UserCircle2,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react-native";

import { CRM_DOCS_URL, FEEDBACK_WHATSAPP_URL } from "@/lib/feedback";

export type DrawerNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  externalUrl?: string;
  externalKind?: "browser" | "whatsapp";
  adminOnly?: boolean;
  roles?: Array<"SALES_REP" | "MANAGER" | "REGIONAL_MANAGER" | "CEO" | "ADMIN">;
};

export const TAB_NAV_ITEMS = [
  { route: "index", label: "Home", icon: LayoutDashboard },
  { route: "pipeline", label: "Pipeline", icon: KanbanSquare },
  { route: "map", label: "Map", icon: MapPin },
  { route: "follow-ups", label: "Tasks", icon: Bell },
  { route: "profile", label: "Profile", icon: UserCircle2 },
] as const;

export function getDrawerNavItems(isAdmin: boolean): DrawerNavItem[] {
  return [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/(tabs)" },
    { key: "pipeline", label: "Pipeline", icon: KanbanSquare, href: "/(tabs)/pipeline" },
    { key: "map", label: "Geo Intel", icon: MapPin, href: "/(tabs)/map" },
    { key: "follow-ups", label: "Follow-ups", icon: Bell, href: "/(tabs)/follow-ups" },
    {
      key: "team",
      label: "Field Team",
      icon: Users,
      href: "/(tabs)/team",
      roles: ["MANAGER", "REGIONAL_MANAGER", "CEO", "ADMIN"],
    },
    {
      key: "docs",
      label: "Docs",
      icon: BookOpen,
      externalUrl: CRM_DOCS_URL,
      externalKind: "browser",
    },
    {
      key: "report-issue",
      label: "Report issue",
      icon: MessageCircle,
      externalUrl: FEEDBACK_WHATSAPP_URL,
      externalKind: "whatsapp",
    },
    ...(isAdmin
      ? [
          {
            key: "access-requests",
            label: "Access requests",
            icon: UserPlus,
            href: "/(tabs)/access-requests",
            adminOnly: true,
          },
          { key: "users", label: "Users", icon: UserCog, href: "/(tabs)/users", adminOnly: true },
          {
            key: "master-data",
            label: "Master Data",
            icon: Database,
            href: "/(tabs)/master-data",
            adminOnly: true,
          },
        ]
      : []),
    { key: "profile", label: "Profile", icon: UserCircle2, href: "/(tabs)/profile" },
  ];
}

export function isDrawerItemVisible(
  item: DrawerNavItem,
  role: "SALES_REP" | "MANAGER" | "REGIONAL_MANAGER" | "CEO" | "ADMIN" | undefined
) {
  if (item.roles && role && !item.roles.includes(role)) return false;
  return true;
}

export function isRouteActive(pathname: string, href: string) {
  const normalized = href.replace("/(tabs)/", "").replace("/(tabs)", "index");
  if (normalized === "index") {
    return (
      pathname === "/" ||
      pathname.endsWith("/index") ||
      pathname === "/(tabs)" ||
      pathname.endsWith("/(tabs)")
    );
  }
  return pathname.includes(`/${normalized}`) || pathname.endsWith(normalized);
}
