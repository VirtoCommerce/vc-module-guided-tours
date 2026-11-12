<template>
  <VcBlade
    :title="$t('GUIDED_TOURS.ADD.TITLE')"
    :toolbar-items="toolbar"
    :loading="loading"
    width="50%"
  >
    <VcContainer>
      <div class="tour-add">
        <p class="tour-add__note">{{ $t("GUIDED_TOURS.ADD.NOTE") }}</p>
        <ProblemList :problems="problems" />
        <VcTextarea
          v-model="jsonText"
          class="tour-add__json"
          :label="$t('GUIDED_TOURS.ADD.JSON')"
          :placeholder="$t('GUIDED_TOURS.ADD.JSON_PLACEHOLDER')"
          maxlength="1000000"
        />
      </div>
    </VcContainer>
  </VcBlade>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { notification, useAsync, useBlade, type IBladeToolbar } from "@vc-shell/framework";
import { VcBlade, VcContainer, VcTextarea } from "@vc-shell/framework/ui";
import ProblemList from "../components/ProblemList.vue";
import { ProblemsError } from "../api/client";
import type { Problem } from "../api/types";
import { useGuidedToursApi } from "../composables/useGuidedToursApi";
import { emptyTour, parseJson } from "../logic/form";

defineBlade({
  url: "/add-tour",
  name: "GuidedTourAdd",
  routable: false,
});

const { t } = useI18n({ useScope: "global" });
const { callParent, replaceWith } = useBlade();
const api = useGuidedToursApi();

const jsonText = ref("");
const problems = ref<Problem[]>([]);

const { loading, action: create } = useAsync(async () => {
  const parsed = parseJson(jsonText.value);
  if (!parsed.ok) {
    problems.value = [{ path: "", message: t("GUIDED_TOURS.PROBLEMS.INVALID_JSON", { error: parsed.error }) }];
    return;
  }
  try {
    const created = await api.createTour(parsed.value);
    problems.value = [];
    notification.success(t("GUIDED_TOURS.ALERTS.CREATED"));
    await callParent("reload");
    await replaceWith({ name: "GuidedTourDetails", param: created.tour.id, options: { source: "custom" } });
  } catch (error) {
    if (error instanceof ProblemsError) {
      problems.value = error.problems;
      return;
    }
    throw error;
  }
});

const toolbar = computed((): IBladeToolbar[] => [
  {
    id: "create",
    title: t("GUIDED_TOURS.ADD.TOOLBAR.CREATE"),
    icon: "lucide-file-json",
    disabled: !jsonText.value.trim() || loading.value,
    clickHandler: () => create(),
  },
  {
    id: "empty",
    title: t("GUIDED_TOURS.ADD.TOOLBAR.EMPTY"),
    icon: "lucide-file-plus",
    clickHandler: () => replaceWith({ name: "GuidedTourDetails", options: { draft: emptyTour() } }),
  },
]);
</script>

<style lang="scss">
.tour-add {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;

  &__note {
    margin: 0;
    color: var(--neutrals-500);
  }

  &__json {
    textarea {
      min-height: 480px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.8125rem;
    }
  }
}
</style>
