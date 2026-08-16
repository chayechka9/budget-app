import { Text, View } from "react-native";

import { Card, CardRow } from "../components/Card";
import { IconTile } from "../components/IconTile";
import { ModalScreen } from "../components/ModalScreen";
import { colors, radius, spacing, typography } from "../constants/theme";
import { useStore } from "../lib/store";

/**
 * Архив категорий.
 *
 * Архивная категория исчезает из Budget и из новых транзакций, поэтому без
 * отдельного экрана до неё нельзя было добраться, а восстановление оставалось
 * недостижимым. Здесь она видна целиком и возвращается одним нажатием — старые
 * транзакции всё это время продолжают на неё ссылаться.
 */
export default function ArchivedCategoriesScreen() {
  const { archivedCategories, restoreCategory } = useStore();

  return (
    <ModalScreen>
      <Text style={[typography.screenTitle, { color: colors.text, marginTop: spacing.md }]}>
        Archived categories
      </Text>

      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 6 }]}>
        Archived categories stay out of your budget and out of new transactions.
        Past transactions keep them.
      </Text>

      {archivedCategories.length === 0 ? (
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
            Nothing is archived. Categories you archive show up here, ready to be
            brought back.
          </Text>
        </View>
      ) : (
        <Card list style={{ marginTop: spacing.xl }}>
          {archivedCategories.map((category, index) => (
            <CardRow
              key={category.id}
              first={index === 0}
              onPress={() => restoreCategory(category.id)}
              accessibilityLabel={`Restore ${category.name}`}
              accessibilityHint="Brings the category back to your budget."
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingHorizontal: spacing.lg,
                paddingVertical: 14,
              }}
            >
              <IconTile name={category.icon} />

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={[typography.rowTitle, { color: colors.text }]}
                >
                  {category.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    typography.captionSmall,
                    { color: colors.textSecondary, marginTop: 1 },
                  ]}
                >
                  {category.groupName}
                </Text>
              </View>

              {/* Кнопки внутри строки не рисуем: нажатие на саму строку и есть
                  восстановление, подпись справа только называет действие. */}
              <Text style={[typography.amountCaption, { color: colors.positiveText }]}>
                Restore
              </Text>
            </CardRow>
          ))}
        </Card>
      )}
    </ModalScreen>
  );
}
