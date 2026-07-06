import { ReactNode, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
} from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import type { ApiFollowUp } from "@/lib/api/followups-api";
import { parseFollowUpNote, relativeDueTime, toWhatsAppPhone } from "@/lib/followups";

type ListTone = "danger" | "warning" | "success";

const dotColors: Record<ListTone, string> = {
  danger: "#F43F5E",
  warning: "#F59E0B",
  success: "#10B981",
};

export function FollowUpListCard({
  title,
  items,
  tone,
  onDone,
  doneMode = false,
  onRecover,
}: {
  title: string;
  items: ApiFollowUp[];
  tone: ListTone;
  onDone?: (followUpId: string) => void;
  doneMode?: boolean;
  onRecover?: (followUpId: string, dueAt: string) => void;
}) {
  const colors = useThemeColors();
  if (items.length === 0) return null;

  return (
    <Card>
      <View style={stylesStatic.header}>
        <View style={[stylesStatic.headerDot, { backgroundColor: dotColors[tone] }]} />
        <Text style={[stylesStatic.headerTitle, { color: colors.text }]}>
          {title} <Text style={{ color: colors.text3, fontWeight: "400" }}>({items.length})</Text>
        </Text>
      </View>
      <View style={stylesStatic.list}>
        {items.map((item) => (
          <FollowUpItem
            key={item.id}
            item={item}
            doneMode={doneMode}
            onDone={onDone}
            onRecover={onRecover}
          />
        ))}
      </View>
    </Card>
  );
}

function FollowUpItem({
  item,
  doneMode,
  onDone,
  onRecover,
}: {
  item: ApiFollowUp;
  doneMode?: boolean;
  onDone?: (followUpId: string) => void;
  onRecover?: (followUpId: string, dueAt: string) => void;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const details = parseFollowUpNote(item.note);
  const whatsappPhone = toWhatsAppPhone(details.phone);
  const hasExtraDetails = Boolean(
    details.location || details.meetingWith || details.meetingTime || details.otherLines.length > 0,
  );

  return (
    <View style={[styles.item, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
      <View style={styles.itemRow}>
        <Avatar name={item.contact} size="sm" />
        <View style={styles.itemCopy}>
          <View style={styles.itemTop}>
            <View style={styles.itemMain}>
              <View style={styles.contactRow}>
                <Text style={[styles.contact, { color: colors.text }]} numberOfLines={1}>
                  {item.contact}
                </Text>
                <Text style={[styles.role, { color: colors.text2 }]}>· {item.contactRole}</Text>
              </View>
              <Badge tone="neutral">{item.channel}</Badge>
              <Pressable
                style={styles.projectLink}
                onPress={() => router.push(`/project/${item.projectId}`)}
              >
                <MapPin size={10} color={colors.text3} strokeWidth={2.2} />
                <Text style={[styles.projectName, { color: colors.text3 }]} numberOfLines={1}>
                  {item.projectName}
                </Text>
              </Pressable>
            </View>
            <View style={styles.meta}>
              <Text style={[styles.relativeDue, { color: colors.text3 }]}>{relativeDueTime(item.dueAt)}</Text>
              <Text style={[styles.dueAt, { color: colors.text3 }]}>
                {new Date(item.dueAt).toLocaleString("en-AE")}
              </Text>
              <Text style={[styles.owner, { color: colors.text3 }]} numberOfLines={1}>
                {item.ownerName ?? "Unassigned"}
              </Text>
            </View>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summary, { color: colors.text2 }]}>{details.summary}</Text>
          </View>

          <View style={styles.badges}>
            {details.phone ? <Badge tone="neutral">Phone</Badge> : null}
            {details.email ? <Badge tone="neutral">Email</Badge> : null}
            {details.location ? <Badge tone="neutral">Location</Badge> : null}
            {details.meetingWith ? <Badge tone="neutral">Meeting with</Badge> : null}
            {details.meetingTime ? <Badge tone="neutral">Meeting time</Badge> : null}
          </View>

          {hasExtraDetails ? (
            <Pressable style={styles.detailsToggle} onPress={() => setExpanded((current) => !current)}>
              {expanded ? (
                <ChevronDown size={14} color={colors.brand} strokeWidth={2.2} />
              ) : (
                <ChevronRight size={14} color={colors.brand} strokeWidth={2.2} />
              )}
              <Text style={[styles.detailsToggleText, { color: colors.brand }]}>Details</Text>
            </Pressable>
          ) : null}

          {hasExtraDetails && expanded ? (
            <View style={[styles.detailsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {details.location ? (
                <Text style={[styles.detailLine, { color: colors.text2 }]}>
                  <Text style={{ color: colors.text3 }}>Location: </Text>
                  {details.location}
                </Text>
              ) : null}
              {details.meetingWith ? (
                <Text style={[styles.detailLine, { color: colors.text2 }]}>
                  <Text style={{ color: colors.text3 }}>Meeting with: </Text>
                  {details.meetingWith}
                </Text>
              ) : null}
              {details.meetingTime ? (
                <Text style={[styles.detailLine, { color: colors.text2 }]}>
                  <Text style={{ color: colors.text3 }}>Meeting time: </Text>
                  {details.meetingTime}
                </Text>
              ) : null}
              {details.otherLines.map((line, index) => (
                <Text key={`${item.id}-extra-${index}`} style={[styles.detailLine, { color: colors.text2 }]}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            {details.phone ? (
              <ActionButton onPress={() => void Linking.openURL(`tel:${details.phone}`)}>
                <Phone size={12} color={colors.text2} strokeWidth={2.2} />
              </ActionButton>
            ) : null}
            {whatsappPhone ? (
              <ActionButton
                onPress={() => void Linking.openURL(`https://wa.me/${whatsappPhone}`)}
              >
                <MessageCircle size={12} color={colors.text2} strokeWidth={2.2} />
              </ActionButton>
            ) : null}
            {details.email ? (
              <ActionButton onPress={() => void Linking.openURL(`mailto:${details.email}`)}>
                <Mail size={12} color={colors.text2} strokeWidth={2.2} />
              </ActionButton>
            ) : null}
            {doneMode ? (
              <ActionButton
                primary={false}
                onPress={() => onRecover?.(item.id, item.dueAt)}
              >
                <RotateCcw size={12} color={colors.text2} strokeWidth={2.2} />
              </ActionButton>
            ) : (
              <ActionButton primary onPress={() => onDone?.(item.id)}>
                <Check size={12} color="#fff" strokeWidth={2.4} />
              </ActionButton>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function ActionButton({
  children,
  onPress,
  primary = false,
}: {
  children: ReactNode;
  onPress: () => void;
  primary?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      style={[
        stylesStatic.actionBtn,
        primary
          ? { backgroundColor: colors.brand }
          : { backgroundColor: colors.surface2, borderColor: colors.border, borderWidth: 1 },
      ]}
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
}

const stylesStatic = StyleSheet.create({
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    item: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
    },
    itemRow: {
      flexDirection: "row",
      gap: 12,
    },
    itemCopy: {
      flex: 1,
      minWidth: 0,
    },
    itemTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    itemMain: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 4,
    },
    contact: {
      fontSize: 14,
      fontWeight: "700",
    },
    role: {
      fontSize: 11,
    },
    projectLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 2,
    },
    projectName: {
      fontSize: 12,
      flex: 1,
    },
    meta: {
      alignItems: "flex-end",
      maxWidth: 130,
    },
    relativeDue: {
      fontSize: 11,
    },
    dueAt: {
      marginTop: 2,
      fontSize: 10,
    },
    owner: {
      marginTop: 2,
      fontSize: 10,
    },
    summaryBox: {
      marginTop: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    summary: {
      fontSize: 14,
      lineHeight: 20,
    },
    badges: {
      marginTop: 8,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    detailsToggle: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    detailsToggleText: {
      fontSize: 11,
      fontWeight: "600",
    },
    detailsBox: {
      marginTop: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 6,
    },
    detailLine: {
      fontSize: 12,
      lineHeight: 16,
    },
    actions: {
      marginTop: 12,
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 6,
    },
  });
}
