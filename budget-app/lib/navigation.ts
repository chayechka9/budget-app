import { useRouter } from "expo-router";

/**
 * Закрытие экрана, которое срабатывает всегда.
 *
 * `router.back()` молча ничего не делает, когда возвращаться некуда — а так
 * бывает не только в отладке: по deep link (`budgetapp://category/c-rent`,
 * `budgetapp://add-transaction`) экран открывается первым в стеке. Тогда
 * крестик и кнопка «назад» переставали работать, и выйти было нельзя.
 * В этом случае уходим на Home.
 */
export function useCloseScreen(): () => void {
  const router = useRouter();

  return () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };
}
