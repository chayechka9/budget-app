import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Card, CardRow } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { ModalScreen } from "../../components/ModalScreen";
import { ProgressBar, ProgressRing, spendProgress } from "../../components/Progress";
import {
  OVERSPEND_DOT_SIZE,
  colors,
  progressHeight,
  radius,
  shadows,
  spacing,
  typography,
} from "../../constants/theme";
import { currentMonthKey, formatDayLabel, monthKeyOf } from "../../lib/dates";
import { formatMoney, formatSignedMoney } from "../../lib/money";
import { useStore, type ResolvedCategory } from "../../lib/store";

/** Сводка по fixed-категории: сколько осталось из плана. */
function SpendSummary({ category }: { category: ResolvedCategory }) {
  const spent = category.spent ?? 0;
  const available = category.assigned - spent;
  const overspent = available < 0;

  return (
    <Card style={{ marginTop: 18 }}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        {overspent ? "Over planned" : "Left this month"}
      </Text>
      <Text style={[typography.amountLarge, { color: colors.text, marginTop: 2 }]}>
        {formatMoney(available)}
      </Text>

      <ProgressBar
        {...spendProgress(spent, category.assigned)}
        height={progressHeight.card}
        style={{ marginTop: spacing.md }}
      />

      <View style={{ flexDirection: "row", gap: 18, marginTop: 10 }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Spent{" "}
          <Text style={[typography.amountCaption, { color: colors.text }]}>
            {formatMoney(spent)}
          </Text>
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Planned{" "}
          <Text style={[typography.amountCaption, { color: colors.text }]}>
            {formatMoney(category.assigned)}
          </Text>
        </Text>
      </View>

      {overspent ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginTop: spacing.md,
            paddingVertical: 10,
            paddingHorizontal: spacing.md,
            borderRadius: radius.tile,
            backgroundColor: colors.surfaceNote,
          }}
        >
          <View
            style={{
              width: OVERSPEND_DOT_SIZE,
              height: OVERSPEND_DOT_SIZE,
              borderRadius: radius.pill,
              backgroundColor: colors.overspend,
            }}
          />
          <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
            A little over. You can cover it from another category when you assign next.
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

/** Сводка по savings-категории: кольцо и прогресс к цели. */
function SavingSummary({ category }: { category: ResolvedCategory }) {
  const hasTarget = typeof category.target === "number" && category.target > 0;
  const ratio = hasTarget ? category.assigned / (category.target as number) : 0;

  return (
    <Card style={{ marginTop: 18, alignItems: "center", paddingVertical: 26 }}>
      <ProgressRing value={ratio} size={132} thickness={10} />

      <Text style={[typography.amountLarge, { color: colors.text, marginTop: spacing.lg }]}>
        {formatMoney(category.assigned)}
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>
        {hasTarget
          ? `of ${formatMoney(category.target as number)} · ${Math.round(ratio * 100)}%`
          : "saved so far"}
      </Text>

      <View
        style={{
          marginTop: 14,
          paddingVertical: 7,
          paddingHorizontal: 13,
          borderRadius: radius.pill,
          backgroundColor: colors.positiveSurface,
        }}
      >
        <Text style={[typography.amountCaption, { color: colors.positiveTextStrong }]}>
          {hasTarget ? `${formatMoney((category.target as number) - category.assigned)} to go` : "No goal yet"}
        </Text>
      </View>
    </Card>
  );
}

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { categories, transactions } = useStore();

  const category = categories.find((item) => item.id === id);

  if (!category) {
    return (
      <ModalScreen>
        <Text style={[typography.screenTitle, { color: colors.text, marginTop: spacing.lg }]}>
          Category not found
        </Text>
      </ModalScreen>
    );
  }

  // Транзакции связаны с категорией по названию — id у них появится вместе
  // с настоящим хранилищем.
  const matching = transactions
    .filter((transaction) => category.matchNames.includes(transaction.category))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  const saving = category.kind === "savings";

  // У накопления история — это пополнения, и вопрос к ней всегда «сколько
  // отложили в этом месяце»: цель живёт дольше месяца, и прошлогодний взнос
  // не отвечает на него. У обычной категории окно не сужаем — там история
  // трат осмысленна целиком.
  const history = saving
    ? matching.filter(
        (transaction) => monthKeyOf(transaction.date) === currentMonthKey(),
      )
    : matching;

  // «Цель есть, но в этом месяце в неё не клали» — а не «тут вообще пусто».
  const emptyNote = saving
    ? "No contributions this month."
    : "Nothing here yet this month.";

  return (
    <ModalScreen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          marginTop: spacing.lg,
        }}
      >
        <View
          style={[
            {
              width: 52,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 17,
              backgroundColor: colors.surface,
            },
            shadows.pill,
          ]}
        >
          <Icon name={category.icon} size={24} color={colors.text} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.detailTitle, { color: colors.text }]}>
            {category.name}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            {category.groupName}
          </Text>
        </View>

        <Button
          label="Edit"
          variant="secondary"
          block={false}
          onPress={() => router.push(`/category-form?id=${category.id}`)}
          style={{ height: 38, paddingHorizontal: spacing.lg }}
        />
      </View>

      {category.kind === "savings" ? (
        <SavingSummary category={category} />
      ) : (
        <SpendSummary category={category} />
      )}

      <Text
        style={[
          typography.overline,
          {
            color: colors.textTertiary,
            marginTop: 22,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.sm,
          },
        ]}
      >
        History
      </Text>

      <Card list>
        {history.length === 0 ? (
          <View style={{ paddingVertical: 18, paddingHorizontal: spacing.lg }}>
            <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 13.5 }]}>
              {emptyNote}
            </Text>
          </View>
        ) : (
          history.map((transaction, index) => (
            <CardRow
              key={transaction.id}
              first={index === 0}
              onPress={() => router.push(`/transaction/${transaction.id}`)}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={[typography.rowTitle, { color: colors.text }]}
                  >
                    {transaction.payee}
                  </Text>
                  <Text
                    style={[
                      typography.captionSmall,
                      { color: colors.textTertiary, marginTop: 1 },
                    ]}
                  >
                    {formatDayLabel(transaction.date)}
                  </Text>
                </View>

                <Text
                  style={[
                    typography.amountRow,
                    {
                      color: transaction.amount < 0 ? colors.text : colors.positiveText,
                    },
                  ]}
                >
                  {formatSignedMoney(transaction.amount)}
                </Text>
              </View>
            </CardRow>
          ))
        )}
      </Card>
    </ModalScreen>
  );
}
