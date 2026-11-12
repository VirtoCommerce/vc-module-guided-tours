import { onScopeDispose, watch, type Ref } from "vue";
import { useBlade } from "@vc-shell/framework";

export interface BladeNote {
  variant: "info" | "warning";
  message: string;
}

/** Keeps at most one banner on the blade, following `note`. */
export function useBladeNote(note: Ref<BladeNote | undefined>) {
  const { addBanner, removeBanner } = useBlade();
  let bannerId: string | undefined;

  function clear() {
    if (bannerId) {
      removeBanner(bannerId);
      bannerId = undefined;
    }
  }

  watch(
    () => (note.value ? `${note.value.variant}\n${note.value.message}` : ""),
    () => {
      clear();
      if (note.value) {
        bannerId = addBanner({ variant: note.value.variant, message: note.value.message });
      }
    },
    { immediate: true },
  );

  onScopeDispose(clear);
}
