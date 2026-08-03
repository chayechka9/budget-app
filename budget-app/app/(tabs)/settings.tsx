import { Text, View } from "react-native";

import { colors, spacing, typography } from "../../constants/theme";

export default function SettingsScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
        paddingHorizontal: spacing.xl,
      }}
    >
      <Text style={[typography.screenTitle, { color: colors.text }]}>Settings</Text>
      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, marginTop: spacing.sm, textAlign: "center" },
        ]}
      >
        Settings will show up here.
      </Text>
    </View>
  );
}
