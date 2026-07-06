import { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ThemeColors } from "@/constants/theme";

export type MasterDataColumn<T> = {
  key: string;
  label: string;
  flex?: number;
  minWidth?: number;
  align?: "left" | "right";
  render: (item: T) => ReactNode;
};

export function MasterDataTable<T>({
  columns,
  data,
  keyExtractor,
  colors,
  emptyText,
}: {
  columns: MasterDataColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  colors: ThemeColors;
  emptyText?: string;
}) {
  if (data.length === 0 && emptyText) {
    return <Text style={[styles.emptyText, { color: colors.text3 }]}>{emptyText}</Text>;
  }

  return (
    <View style={[styles.tableWrap, { borderColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={[styles.headerRow, { backgroundColor: colors.surface2, borderBottomColor: colors.border }]}>
            {columns.map((column) => (
              <View
                key={column.key}
                style={[
                  styles.cell,
                  column.flex ? { flex: column.flex } : undefined,
                  column.minWidth ? { minWidth: column.minWidth } : undefined,
                  column.align === "right" ? styles.cellRight : undefined,
                ]}
              >
                <Text style={[styles.headerText, { color: colors.text3 }]}>{column.label}</Text>
              </View>
            ))}
          </View>

          {data.map((item) => (
            <View
              key={keyExtractor(item)}
              style={[styles.dataRow, { borderTopColor: colors.border }]}
            >
              {columns.map((column) => (
                <View
                  key={column.key}
                  style={[
                    styles.cell,
                    column.flex ? { flex: column.flex } : undefined,
                    column.minWidth ? { minWidth: column.minWidth } : undefined,
                    column.align === "right" ? styles.cellRight : undefined,
                  ]}
                >
                  {column.render(item)}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tableWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  table: {
    minWidth: 640,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  dataRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    alignItems: "center",
  },
  cell: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
    minWidth: 88,
  },
  cellRight: {
    alignItems: "flex-end",
  },
  headerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
