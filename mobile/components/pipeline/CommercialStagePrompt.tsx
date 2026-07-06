import { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ProjectCommercialFields } from "@/components/projects/ProjectCommercialFields";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import { stageTitle, type Stage } from "@/lib/constants/stages";
import type { ActiveCurrencyItem } from "@/lib/api/master-data-api";
import { commercialSpecsComplete } from "@/lib/project-specs";
import { formatNumberForInput, parseFormattedNumber } from "@/lib/utils";

export type CommercialPromptState = {
  targetStage: Stage;
  value: string;
  currencyCode: string;
  itemQuantity: string;
  specThickness: string;
  specCore: string;
  specPaintType: string;
  error: string | null;
  saving: boolean;
};

export function createCommercialPromptState(
  targetStage: Stage,
  seed: {
    valueLocal: number;
    valueAed: number;
    currencyCode: string;
    itemQuantity: number;
    specThickness: string;
    specCore: string;
    specPaintType: string;
  },
): CommercialPromptState {
  const seedValue = seed.valueLocal > 0 ? seed.valueLocal : seed.valueAed > 0 ? seed.valueAed : 0;
  return {
    targetStage,
    value: formatNumberForInput(seedValue),
    currencyCode: seed.currencyCode || "AED",
    itemQuantity: formatNumberForInput(seed.itemQuantity),
    specThickness: seed.specThickness ?? "",
    specCore: seed.specCore ?? "",
    specPaintType: seed.specPaintType ?? "",
    error: null,
    saving: false,
  };
}

export function validateCommercialPrompt(input: CommercialPromptState): string | null {
  const nextValue = parseFormattedNumber(input.value);
  const nextItemQuantity = parseFormattedNumber(input.itemQuantity);
  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    return "Total project value must be greater than 0.";
  }
  if (!Number.isFinite(nextItemQuantity) || nextItemQuantity <= 0) {
    return "Total project quantity must be greater than 0.";
  }
  if (!commercialSpecsComplete(input.specThickness, input.specCore, input.specPaintType)) {
    return "Select thickness, core, and paint type.";
  }
  return null;
}

export function CommercialStagePrompt({
  visible,
  prompt,
  currencies,
  onChange,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  prompt: CommercialPromptState | null;
  currencies: ActiveCurrencyItem[];
  onChange: (next: CommercialPromptState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!prompt) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Required before moving stage</Text>
          <Text style={[styles.subtitle, { color: colors.text2 }]}>
            To move this project to{" "}
            <Text style={{ fontWeight: "700", color: colors.text }}>{stageTitle(prompt.targetStage)}</Text>, provide
            commercial details and specifications.
          </Text>

          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <ProjectCommercialFields
              value={prompt.value}
              currencyCode={prompt.currencyCode}
              currencies={currencies}
              itemQuantity={prompt.itemQuantity}
              specThickness={prompt.specThickness}
              specCore={prompt.specCore}
              specPaintType={prompt.specPaintType}
              onValueChange={(value) => onChange({ ...prompt, value, error: null })}
              onCurrencyCodeChange={(currencyCode) => onChange({ ...prompt, currencyCode, error: null })}
              onItemQuantityChange={(itemQuantity) => onChange({ ...prompt, itemQuantity, error: null })}
              onSpecThicknessChange={(specThickness) => onChange({ ...prompt, specThickness, error: null })}
              onSpecCoreChange={(specCore) => onChange({ ...prompt, specCore, error: null })}
              onSpecPaintTypeChange={(specPaintType) => onChange({ ...prompt, specPaintType, error: null })}
            />
            {prompt.error ? <Text style={[styles.error, { color: colors.danger }]}>{prompt.error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={onClose}
              disabled={prompt.saving}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.brand, opacity: prompt.saving ? 0.7 : 1 }]}
              onPress={onSubmit}
              disabled={prompt.saving}
            >
              <Text style={styles.primaryButtonText}>{prompt.saving ? "Saving..." : "Save and move"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      padding: 16,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    card: {
      width: "100%",
      maxWidth: 512,
      alignSelf: "center",
      maxHeight: "88%",
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
    },
    form: {
      marginTop: 16,
      maxHeight: 420,
    },
    error: {
      marginTop: 8,
      fontSize: 12,
    },
    actions: {
      marginTop: 16,
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },
    secondaryButton: {
      height: 32,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      fontSize: 12,
      fontWeight: "600",
    },
    primaryButton: {
      height: 32,
      borderRadius: 12,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
    },
  });
}
