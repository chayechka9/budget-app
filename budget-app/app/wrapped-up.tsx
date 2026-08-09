import { Text, View } from "react-native";

import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { ModalScreen } from "../components/ModalScreen";
import { HAIRLINE, colors, radius, spacing, typography } from "../constants/theme";
import { MOCK_LAST_MONTH, formatMoney, formatSignedMoney } from "../lib/mock-data";

/**
 * Итог закрытого месяца. Пока только сводка: выбор, что делать с остатком
 * (перенести по категориям / в одну / в Ready to assign), требует настоящего
 * закрытия месяца — это Stage 1.
 */
export default function WrappedUpScreen() {
  return (
    <ModalScreen>
      <View
        style={{
          width: 54,
          height: 54,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 18,
          backgroundColor: colors.positiveSurface,
          marginTop: spacing.lg,
        }}
      >
        <Icon name="calendarCheck" size={26} color={colors.positive} />
      </View>

      <Text style={[typography.overlineWide, { color: colors.textTertiary, marginTop: spacing.xl }]}>
        {MOCK_LAST_MONTH.label}, wrapped
      </Text>

      <Text style={[typography.hero, { color: colors.positiveText, marginTop: 6 }]}>
        {formatMoney(MOCK_LAST_MONTH.leftUnspent)}
      </Text>

      <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
        left unspent last month.
      </Text>

      <Card style={{ marginTop: spacing.xl, paddingVertical: 6, paddingHorizontal: 18 }}>
        {MOCK_LAST_MONTH.breakdown.map((item, index) => (
          <View
            key={item.name}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 11,
              borderTopWidth: index === 0 ? 0 : HAIRLINE,
              borderTopColor: colors.separator,
            }}
          >
            <Text style={[typography.body, { color: colors.textSecondary, fontSize: 14 }]}>
              {item.name}
            </Text>
            <Text style={[typography.amountRow, { color: colors.positiveText }]}>
              {formatSignedMoney(item.amount)}
            </Text>
          </View>
        ))}
      </Card>

      <View
        style={{
          marginTop: spacing.xl,
          paddingVertical: 14,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.dropdown,
          backgroundColor: colors.surfaceNote,
        }}
      >
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          The leftover is already part of your Ready to assign balance — put it to work
          whenever you like.
        </Text>
      </View>
    </ModalScreen>
  );
}
