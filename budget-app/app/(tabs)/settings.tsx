import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../components/Button";
import { Card, CardRow } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { IconTile } from "../../components/IconTile";
import { colors, iconSize, spacing, typography } from "../../constants/theme";

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      accessibilityRole="header"
      style={[
        typography.overline,
        {
          color: colors.textTertiary,
          marginTop: spacing.xxl,
          marginBottom: spacing.sm,
          paddingHorizontal: 14,
        },
      ]}
    >
      {children}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? "Unknown";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 19,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl,
      }}
    >
      <Text
        accessibilityRole="header"
        style={[typography.screenTitle, { color: colors.text }]}
      >
        Settings
      </Text>

      <SectionLabel>Data</SectionLabel>
      <Card list>
        <CardRow
          first
          accessible
          accessibilityRole="text"
          accessibilityLabel="Data stays on this device. This prototype keeps changes for the current app session only. Cloud backup and sync are not available yet."
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.lg,
          }}
        >
          <IconTile name="wallet" />
          <View style={{ flex: 1 }}>
            <Text style={[typography.rowTitle, { color: colors.text }]}>
              On this device
            </Text>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginTop: 2 },
              ]}
            >
              Changes are kept for this app session only. Cloud backup and sync
              aren&apos;t available yet.
            </Text>
          </View>
        </CardRow>
      </Card>

      <SectionLabel>Budget setup</SectionLabel>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <IconTile name="budget" />
          <View style={{ flex: 1 }}>
            <Text
              style={[typography.headline, { color: colors.text }]}
            >
              Categories
            </Text>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginTop: 2 },
              ]}
            >
              Add categories or edit the ones already in your budget.
            </Text>
          </View>
        </View>
        <Button
          label="Manage categories"
          variant="muted"
          accessibilityHint="Opens the Budget tab, where categories can be added or edited."
          onPress={() => router.navigate("/(tabs)/budget")}
          style={{ marginTop: spacing.lg }}
        />
        <Button
          label="Archived categories"
          variant="muted"
          accessibilityHint="Opens the archive, where archived categories can be restored."
          onPress={() => router.push("/archived-categories")}
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      <SectionLabel>About</SectionLabel>
      <Card list>
        <CardRow
          first
          accessible
          accessibilityRole="text"
          accessibilityLabel={`App version ${version}`}
          style={{
            minHeight: 56,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          }}
        >
          <Icon name="settings" size={iconSize.sm} color={colors.iconStrong} />
          <Text
            style={[typography.rowTitle, { color: colors.text, marginLeft: 14 }]}
          >
            Version
          </Text>
          <Text
            style={[
              typography.amountCaption,
              { color: colors.textSecondary, marginLeft: "auto" },
            ]}
          >
            {version}
          </Text>
        </CardRow>
      </Card>
    </ScrollView>
  );
}
