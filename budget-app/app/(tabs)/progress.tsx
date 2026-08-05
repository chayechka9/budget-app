import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing, typography } from "../../constants/theme";

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
        paddingHorizontal: spacing.xl,
        paddingTop: insets.top,
      }}
    >
      <Text style={[typography.screenTitle, { color: colors.text }]}>Progress</Text>
      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, marginTop: spacing.sm, textAlign: "center" },
        ]}
      >
        Trends and savings will show up here.
      </Text>
    </View>
  );
}
