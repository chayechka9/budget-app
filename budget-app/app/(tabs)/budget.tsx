import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, CardRow } from "../../components/Card";
import { CategoryCard } from "../../components/CategoryCard";
import { ProgressRing } from "../../components/Progress";
import { ReadyToAssignPill } from "../../components/ReadyToAssignPill";
import { colors, spacing, typography } from "../../constants/theme";
import { formatMoney } from "../../lib/mock-data";
import { useStore, type ResolvedCategory } from "../../lib/store";

/**
 * Fixed-категория: слева потрачено из плана, справа остаток. Перерасход
 * помечается только точкой — полоса и сумма остаются нейтральными.
 */
function FixedRow({ category }: { category: ResolvedCategory }) {
  const spent = category.spent ?? 0;
  const remaining = category.assigned - spent;

  return (
    <CategoryCard
      name={category.name}
      icon={category.icon}
      value={`${formatMoney(remaining)} left`}
      overspent={remaining < 0}
      progress={category.assigned === 0 ? 0 : spent / category.assigned}
      caption={`${formatMoney(spent)} of ${formatMoney(category.assigned)}`}
    />
  );
}

/** Savings-категория: накопленное с кольцом прогресса справа. */
function SavingsRow({ category }: { category: ResolvedCategory }) {
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groups, readyToAssign } = useStore();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 19, paddingBottom: spacing.xxxl }}
    >
      <View style={{ paddingHorizontal: spacing.xl, flexDirection: "row" }}>
        <ReadyToAssignPill
          amount={formatMoney(readyToAssign)}
          onPress={() => router.push("/assign")}
        />
      </View>

      {groups.map((group) => (
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
              <CardRow
                key={category.id}
                first={index === 0}
                onPress={() => router.push(`/category/${category.id}`)}
              >
                {category.kind === "savings" ? (
                  <SavingsRow category={category} />
                ) : (
                  <FixedRow category={category} />
                )}
              </CardRow>
            ))}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}
