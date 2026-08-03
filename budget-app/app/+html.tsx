import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

import { colors } from "../constants/theme";

/**
 * Веб-шелл: обёртка вокруг всех страниц при рендере через react-native-web.
 * На нативе не используется. Язык интерфейса — английский.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        {/* <title> задаётся через <Head> в app/_layout.tsx — здесь его дублировать нельзя. */}

        {/* Отключает скролл body, чтобы скроллились только ScrollView внутри приложения. */}
        <ScrollViewStyleReset />

        {/* Фон под приложением — из темы, чтобы не было вспышки при загрузке. */}
        <style dangerouslySetInnerHTML={{ __html: backgroundStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const backgroundStyle = `
body {
  background-color: ${colors.background};
}`;
