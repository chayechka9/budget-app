import { Text, View } from "react-native";

import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { ModalScreen } from "../components/ModalScreen";
import { HAIRLINE, colors, radius, spacing, typography } from "../constants/theme";
import { currentMonthKey, previousMonthKey } from "../lib/dates";
import { formatMoney, formatSignedMoney } from "../lib/money";
import { useStore } from "../lib/store";

/**
 * Итог закрытого месяца: сколько осталось неистраченным и из каких категорий
 * это сложилось. Остаток не «лежит отдельно» — он перенесён в те же категории
 * следующего месяца, и разбивка показывает именно их.
 */
export default function WrappedUpScreen() {
  const { monthSummary } = useStore();
  const lastMonth = monthSummary(previousMonthKey(currentMonthKey()));

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
        {lastMonth.label}, wrapped
      </Text>

      <Text style={[typography.hero, { color: colors.positiveText, marginTop: 6 }]}>
        {formatMoney(lastMonth.leftUnspent)}
      </Text>

      <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
        left unspent last month.
      </Text>

      <Card style={{ marginTop: spacing.xl, paddingVertical: 6, paddingHorizontal: 18 }}>
        {lastMonth.breakdown.map((item, index) => (
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
          Each amount carried over into the same category this month, so it&apos;s
          already there. Anything overspent carries over the same way. Nothing went
          back to Ready to assign.
        </Text>
      </View>
    </ModalScreen>
  );
}
