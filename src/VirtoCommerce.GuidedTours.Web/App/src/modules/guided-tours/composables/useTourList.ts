import { computed, ref } from "vue";
import { useAsync, useLoading } from "@vc-shell/framework";
import type { TourInfo } from "../api/types";
import { useGuidedToursApi } from "./useGuidedToursApi";

export function useTourList() {
  const api = useGuidedToursApi();

  const tours = ref<TourInfo[]>([]);
  const showToUsers = ref<boolean>();

  const { loading: listLoading, action: load } = useAsync(async () => {
    const [list, settings] = await Promise.all([api.listTours(), api.getSettings()]);
    tours.value = list;
    showToUsers.value = settings.isEnabled;
  });

  const { loading: switchLoading, action: setShowToUsers } = useAsync<boolean>(async (isEnabled) => {
    await api.setSettings({ isEnabled: !!isEnabled });
    showToUsers.value = !!isEnabled;
  });

  const { action: setTourEnabled } = useAsync<{ info: TourInfo; isEnabled: boolean }>(async (payload) => {
    if (!payload) {
      return;
    }
    await api.setTourEnabled(payload.info.tour.id, payload.isEnabled);
    payload.info.isEnabled = payload.isEnabled;
  });

  return {
    tours: computed(() => tours.value),
    showToUsers: computed(() => showToUsers.value),
    loading: useLoading(listLoading),
    switchLoading,
    load,
    setShowToUsers,
    setTourEnabled,
  };
}
