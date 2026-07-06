import { useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { FormSelect } from "@/components/ui/FormSelect";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import {
  SPEC_CORE_OPTIONS,
  SPEC_PAINT_TYPE_OPTIONS,
  SPEC_THICKNESS_OPTIONS,
} from "@/lib/project-specs";
import {
  formatNumberForInput,
  parseFormattedNumber,
  sanitizeFormattedNumberInput,
} from "@/lib/utils";

type CurrencyOption = {
  code: string;
  name: string;
};

export function ProjectCommercialFields({
  value,
  currencyCode,
  currencies,
  itemQuantity,
  specThickness,
  specCore,
  specPaintType,
  onValueChange,
  onCurrencyCodeChange,
  onItemQuantityChange,
  onSpecThicknessChange,
  onSpecCoreChange,
  onSpecPaintTypeChange,
  showSpecifications = true,
}: {
  value: string;
  currencyCode: string;
  currencies: CurrencyOption[];
  itemQuantity: string;
  specThickness: string;
  specCore: string;
  specPaintType: string;
  onValueChange: (value: string) => void;
  onCurrencyCodeChange: (currencyCode: string) => void;
  onItemQuantityChange: (value: string) => void;
  onSpecThicknessChange: (value: string) => void;
  onSpecCoreChange: (value: string) => void;
  onSpecPaintTypeChange: (value: string) => void;
  showSpecifications?: boolean;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currencyOptions =
    currencies.length > 0 ? currencies : [{ code: "AED", name: "UAE Dirham", rateToAed: 1 }];

  return (
    <View style={styles.root}>
      <View>
        <Text style={styles.label}>Total project value</Text>
        <View style={styles.valueRow}>
          <TextInput
            value={value}
            onChangeText={(next) => onValueChange(sanitizeFormattedNumberInput(next))}
            onBlur={() => {
              const parsed = parseFormattedNumber(value);
              if (Number.isFinite(parsed) && parsed > 0) {
                onValueChange(formatNumberForInput(parsed));
              }
            }}
            placeholder="Amount"
            placeholderTextColor={colors.text3}
            keyboardType="decimal-pad"
            style={[styles.input, styles.valueInput, { backgroundColor: colors.surface2, color: colors.text }]}
          />
          <FormSelect
            value={currencyCode}
            options={currencyOptions.map((entry) => ({ value: entry.code, label: entry.code }))}
            onChange={onCurrencyCodeChange}
            compact
          />
        </View>
      </View>

      <View>
        <Text style={styles.label}>Total Project Quantity (m²)</Text>
        <TextInput
          value={itemQuantity}
          onChangeText={(next) => onItemQuantityChange(sanitizeFormattedNumberInput(next))}
          onBlur={() => {
            const parsed = parseFormattedNumber(itemQuantity);
            if (Number.isFinite(parsed) && parsed > 0) {
              onItemQuantityChange(formatNumberForInput(parsed));
            }
          }}
          placeholder="Total Project Quantity (m²)"
          placeholderTextColor={colors.text3}
          keyboardType="decimal-pad"
          style={[styles.input, { backgroundColor: colors.surface2, color: colors.text }]}
        />
      </View>

      {showSpecifications ? (
        <View>
          <Text style={styles.label}>Project Specifications</Text>
          <View style={styles.specGrid}>
            <FormSelect
              value={specThickness}
              placeholder="Thickness"
              options={SPEC_THICKNESS_OPTIONS.map((entry) => ({ value: entry, label: entry }))}
              onChange={onSpecThicknessChange}
              allowEmpty
            />
            <FormSelect
              value={specCore}
              placeholder="Core"
              options={SPEC_CORE_OPTIONS.map((entry) => ({ value: entry, label: entry }))}
              onChange={onSpecCoreChange}
              allowEmpty
            />
            <FormSelect
              value={specPaintType}
              placeholder="Paint Type"
              options={SPEC_PAINT_TYPE_OPTIONS.map((entry) => ({ value: entry, label: entry }))}
              onChange={onSpecPaintTypeChange}
              allowEmpty
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      gap: 12,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text2,
      marginBottom: 4,
    },
    valueRow: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    input: {
      height: 40,
      borderRadius: 12,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    valueInput: {
      flex: 1,
    },
    specGrid: {
      gap: 8,
    },
  });
}
