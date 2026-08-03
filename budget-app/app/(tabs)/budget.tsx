import { ScrollView, Text, View } from "react-native";

import { Card, CardRow } from "../../components/Card";
import { CategoryCard } from "../../components/CategoryCard";
import { ProgressRing } from "../../components/Progress";
import { ReadyToAssignPill } from "../../components/ReadyToAssignPill";
import { colors, spacing, typography } from "../../constants/theme";
import { MOCK_GROUPS, type MockCategory, formatMoney } from "../../lib/mock-data";
import { useStore } from "../../lib/store";

/**
 * Fixed-категория: слева потрачено из плана, справа остаток. Перерасход
 * помечается только точкой — полоса и сумма остаются нейтральными.
 */
function FixedRow({ category, extraSpent }: { category: MockCategory; extraSpent: number }) {
  const spent = (category.spent ?? 0) + extraSpent;
  const remaining = category.assigned - spent;
  const overspent = remaining < 0;

  return (
    <CategoryCard
      name={category.name}
      icon={category.icon}
      value={`${formatMoney(remaining)} left`}
      overspent={overspent}
      progress={category.assigned === 0 ? 0 : spent / category.assigned}
      caption={`${formatMoney(spent)} of ${formatMoney(category.assigned)}`}
    />
  );
}

/** Savings-категория: накопленное с кольцом прогресса справа. */
function SavingsRow({ category }: { category: MockCategory }) {
  const hasTarget = typeof category.target === "number" && category.target > 0;
  const ratio = hasTarget ? category.assigned / (category.target as number) : 0;

  return (
    <CategoryCard
      name={category.name}
      icon={category.icon}
      value={hasTarget ? `${Math.round(ratio * 100)}%` : "No goal"}
      caption={
        hasTarget
          ? `${formatMoney(category.assigned)} of ${formatMoney(category.target as number)}`
          : `${formatMoney(category.assigned)} saved`
      }
      accessory={hasTarget ? <ProgressRing value={ratio} /> : undefined}
    />
  );
}

export default function BudgetScreen() {
  const { readyToAssign, extraSpentByCategory } = useStore();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
    >
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}>
        <ReadyToAssignPill amount={formatMoney(readyToAssign)} />
      </View>

      {MOCK_GROUPS.map((group) => (
        <View key={group.id} style={{ marginTop: 22 }}>
          <Text
            style={[
              typography.overline,
              { color: colors.textTertiary, paddingHorizontal: 34, paddingBottom: spacing.sm },
            ]}
          >
            {group.name}
          </Text>
          <Card list style={{ marginHorizontal: spacing.lg }}>
            {group.categories.map((category, index) => (
              <CardRow key={category.id} first={index === 0}>
                {category.kind === "savings" ? (
                  <SavingsRow category={category} />
                ) : (
                  <FixedRow
                    category={category}
                    extraSpent={extraSpentByCategory[category.name] ?? 0}
                  />
                )}
              </CardRow>
            ))}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}
