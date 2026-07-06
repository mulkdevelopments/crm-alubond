import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";

type Option = {
  value: string;
  label: string;
};

export function OptionSheet({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.list} bounces={false}>
            {options.map((option) => {
              const active = option.value === selectedValue;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.option, active && { backgroundColor: colors.surface2 }]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  <Text style={[styles.optionText, active && { color: colors.brand, fontWeight: "700" }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      maxHeight: "70%",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: colors.surface,
      paddingTop: 16,
      paddingBottom: 24,
    },
    title: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    list: {
      maxHeight: 360,
    },
    option: {
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    optionText: {
      fontSize: 15,
      color: colors.text,
    },
    cancel: {
      marginTop: 8,
      marginHorizontal: 20,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface2,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text2,
    },
  });
}
