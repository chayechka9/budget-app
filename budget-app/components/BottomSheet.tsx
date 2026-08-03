import { useEffect, useRef, type PropsWithChildren } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { colors, iconSize, radius, spacing, typography } from "../constants/theme";
import { Icon } from "./Icon";

/** За пределами любого разумного шита — стартовая позиция до анимации входа. */
const OFFSCREEN = 900;
/** Насколько нужно утянуть вниз, чтобы шит закрылся. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.8;

type BottomSheetProps = PropsWithChildren<{
  title: string;
  onClose: () => void;
}>;

/**
 * Модальный шит снизу: затемнение, скруглённый верх, полоска-индикатор,
 * свайп вниз и крестик для закрытия.
 *
 * Экран под ним остаётся смонтированным — маршрут объявлен как
 * `presentation: "transparentModal"` в app/_layout.tsx.
 */
export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(OFFSCREEN)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 26,
        stiffness: 260,
      }),
      Animated.timing(scrimOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [translateY, scrimOpacity]);

  const close = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: OFFSCREEN, duration: 220, useNativeDriver: true }),
      Animated.timing(scrimOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  // Жест висит только на шапке шита, иначе он перехватывал бы нажатия
  // на клавиатуру и чипсы категорий.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
          close();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  return (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Animated.View
        style={{
          ...StyleSheetAbsoluteFill,
          backgroundColor: colors.scrim,
          opacity: scrimOpacity,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={close}
          style={StyleSheetAbsoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={{
          backgroundColor: colors.surfaceSheet,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          paddingHorizontal: spacing.xl,
          paddingBottom: 30,
          paddingTop: 10,
          // Шит не должен перерастать экран: иначе клавиатура и Save
          // уезжают за нижнюю границу.
          maxHeight: windowHeight * 0.92,
          transform: [{ translateY }],
        }}
      >
        {/* Шапка: полоска-индикатор, заголовок, крестик */}
        <View {...pan.panHandlers}>
          <View
            style={{
              width: 36,
              height: 5,
              borderRadius: radius.pill,
              backgroundColor: colors.handle,
              alignSelf: "center",
            }}
          />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: spacing.md,
            }}
          >
            <Text style={[typography.button, { color: colors.text }]}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={close}
              style={{
                width: 30,
                height: 30,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radius.pill,
                backgroundColor: colors.surfaceControl,
              }}
            >
              <Icon name="close" size={iconSize.sm} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {children}
      </Animated.View>
    </View>
  );
}

const StyleSheetAbsoluteFill = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;
