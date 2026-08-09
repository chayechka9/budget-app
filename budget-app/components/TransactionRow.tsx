import { Text, View } from "react-native";

import { colors, spacing, typography } from "../constants/theme";
import { IconTile } from "./IconTile";
import type { IconName } from "./Icon";
import { formatSignedMoney } from "../lib/mock-data";

type TransactionRowProps = {
  icon: IconName;
  title: string;
  subtitle: string;
  amount: number;
  /** Компактный вариант для карточки Recent на Home. */
  compact?: boolean;
};

/** Строка транзакции: плашка с иконкой, название, подпись, сумма справа. */
export function TransactionRow({
  icon,
  title,
  subtitle,
  amount,
  compact = false,
}: TransactionRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingHorizontal: compact ? 0 : spacing.lg,
        paddingVertical: compact ? 11 : spacing.md,
      }}
    >
      <IconTile name={icon} size={compact ? 34 : 36} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[typography.rowTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[typography.captionSmall, { color: colors.textTertiary, marginTop: 1 }]}>
          {subtitle}
        </Text>
      </View>

      <Text
        style={[
          typography.amountRow,
          { color: amount < 0 ? colors.text : colors.positiveText },
        ]}
      >
        {formatSignedMoney(amount)}
      </Text>
    </View>
  );
}
