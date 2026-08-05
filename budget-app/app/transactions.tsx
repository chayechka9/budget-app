import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, CardRow } from "../components/Card";
import { Icon } from "../components/Icon";
import { TransactionRow } from "../components/TransactionRow";
import { colors, radius, shadows, spacing } from "../constants/theme";
import { useStore } from "../lib/store";

/** Круглая кнопка «назад» из макета: 38px, белая, тонкая тень. */
function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      style={[
        {
          width: 38,
          height: 38,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
        },
        shadows.pill,
      ]}
    >
      <Icon name="chevronLeft" size={17} color={colors.icon} />
    </Pressable>
  );
}

export default function TransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { transactions } = useStore();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 11,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl,
      }}
    >
      <View style={{ flexDirection: "row" }}>
        <BackButton onPress={() => router.back()} />
      </View>

      <Card list style={{ marginTop: spacing.lg }}>
        {transactions.map((transaction, index) => (
          <CardRow key={transaction.id} first={index === 0}>
            <TransactionRow
              icon={transaction.icon}
              title={transaction.payee}
              subtitle={`${transaction.category} · ${transaction.date}`}
              amount={transaction.amount}
            />
          </CardRow>
        ))}
      </Card>
    </ScrollView>
  );
}
