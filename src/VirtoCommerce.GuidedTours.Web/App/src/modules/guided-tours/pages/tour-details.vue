<template>
  <VcBlade
    :title="title"
    :toolbar-items="toolbar"
    :loading="loading"
    width="60%"
  >
    <VcContainer>
      <VcHint
        v-if="notFound"
        class="tour-details__missing"
      >
        {{ $t("GUIDED_TOURS.DETAILS.NOT_FOUND", { id: param }) }}
      </VcHint>

      <div
        v-else-if="ready"
        class="tour-details"
      >
        <TourFacts
          :tour="shownTour"
          :source="info?.source ?? 'custom'"
          :module-id="info?.moduleId"
          :is-conflicting="info?.isConflicting"
          :is-enabled="info?.isEnabled"
          :can-switch="canManage"
          :modified-date="info?.modifiedDate"
          :modified-by="info?.modifiedBy"
          @update:is-enabled="onEnabled"
        />

        <ProblemList :problems="shownProblems" />

        <div class="tour-details__bar">
          <div
            class="tour-details__tabs"
            role="tablist"
          >
            <VcButton
              variant="ghost"
              role="tab"
              :selected="tab === 'steps'"
              :aria-selected="tab === 'steps'"
              @click="showTab('steps')"
            >
              {{ $t("GUIDED_TOURS.DETAILS.TABS.STEPS") }}
            </VcButton>
            <VcButton
              variant="ghost"
              role="tab"
              :selected="tab === 'json'"
              :aria-selected="tab === 'json'"
              @click="showTab('json')"
            >
              {{ $t("GUIDED_TOURS.DETAILS.TABS.JSON") }}
            </VcButton>
          </div>
          <VcLanguageSelector
            v-model="language"
            :options="languages"
          />
        </div>

        <template v-if="tab === 'steps'">
          <TourEditor
            v-if="editable && form"
            v-model="form"
            :language="language"
          />
          <StepList
            v-else
            :steps="shownTour.steps"
            :language="language"
          />
        </template>

        <VcTextarea
          v-else
          v-model="jsonText"
          class="tour-details__json"
          :label="editable ? $t('GUIDED_TOURS.EDITOR.JSON') : $t('GUIDED_TOURS.DETAILS.JSON_READ_ONLY')"
          :disabled="!editable"
          maxlength="1000000"
        />
      </div>
    </VcContainer>
  </VcBlade>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  notification,
  useAsync,
  useBlade,
  useBladeForm,
  useLoading,
  usePopup,
  type IBladeToolbar,
} from "@vc-shell/framework";
import { VcBlade, VcButton, VcContainer, VcHint, VcLanguageSelector, VcTextarea } from "@vc-shell/framework/ui";
import TourFacts from "../components/TourFacts.vue";
import ProblemList from "../components/ProblemList.vue";
import StepList from "../components/StepList.vue";
import TourEditor from "../components/TourEditor.vue";
import { ProblemsError } from "../api/client";
import type { Problem, Tour, TourInfo, TourSource } from "../api/types";
import { useGuidedToursApi } from "../composables/useGuidedToursApi";
import { useToursPermissions } from "../composables/useToursPermissions";
import { useContentLanguage } from "../composables/useContentLanguage";
import { useBladeNote } from "../composables/useBladeNote";
import { emptyTour, parseJson, toJson, tourFromForm, tourToForm, type TourForm } from "../logic/form";
import { resolveText, textLanguages } from "../logic/text";
import { launchUrl } from "../logic/launch";

export interface TourDetailsOptions {
  source?: TourSource;
  draft?: unknown;
}

type Tab = "steps" | "json";

defineBlade({
  url: "/tour",
  name: "GuidedTourDetails",
});

const { t } = useI18n({ useScope: "global" });
const { param, options, callParent, closeSelf, replaceWith } = useBlade<TourDetailsOptions>();
const { showConfirmation } = usePopup();
const api = useGuidedToursApi();
const { canManage } = useToursPermissions();
const { languages, current: language, load: loadLanguages, add: addLanguages } = useContentLanguage();

const info = ref<TourInfo | null>(null);
const notFound = ref(false);
const ready = ref(false);
const tab = ref<Tab>("steps");
const form = ref<TourForm>();
const jsonText = ref("");
const draft = ref<unknown>(null);
const problems = ref<Problem[]>([]);
const parseProblem = ref<Problem>();
const shownProblems = computed(() => (parseProblem.value ? [parseProblem.value, ...problems.value] : problems.value));

const isNew = computed(() => !param.value);
const isCustom = computed(() => isNew.value || info.value?.source === "custom");
const editable = computed(() => isCustom.value && canManage.value);
const isConflicting = computed(() => info.value?.source === "custom" && info.value.isConflicting);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const shownTour = computed<Partial<Tour>>(() =>
  editable.value && isRecord(draft.value) && !("invalidJson" in draft.value)
    ? (draft.value as Partial<Tour>)
    : (info.value?.tour ?? {}),
);

const title = computed(() => {
  if (isNew.value && !shownTour.value.id) {
    return t("GUIDED_TOURS.DETAILS.TITLE_NEW");
  }
  return resolveText(shownTour.value.title, language.value) || shownTour.value.id || param.value || "";
});

const bladeForm = useBladeForm({
  data: draft,
  closeConfirmMessage: computed(() => t("GUIDED_TOURS.ALERTS.CLOSE_CONFIRMATION")),
  autoBeforeClose: computed(() => editable.value),
});

watch(
  form,
  (value) => {
    if (editable.value && tab.value === "steps" && value) {
      draft.value = tourFromForm(value);
    }
  },
  { deep: true },
);

watch(jsonText, (text) => {
  if (editable.value && tab.value === "json") {
    const parsed = parseJson(text);
    draft.value = parsed.ok ? parsed.value : { invalidJson: text };
    if (parsed.ok) {
      parseProblem.value = undefined;
    }
  }
});

function show(tour: unknown) {
  form.value = tourToForm(tour);
  draft.value = tourFromForm(form.value);
  jsonText.value = toJson(editable.value ? draft.value : tour);
  addLanguages(textLanguages(tour as Partial<Tour>));
}

async function settle() {
  await nextTick();
  bladeForm.setBaseline();
}

function parseEditedJson(): unknown {
  const parsed = parseJson(jsonText.value);
  parseProblem.value = parsed.ok
    ? undefined
    : { path: "", message: t("GUIDED_TOURS.PROBLEMS.INVALID_JSON", { error: parsed.error }) };
  return parsed.ok ? parsed.value : undefined;
}

function showTab(next: Tab) {
  if (next === tab.value) {
    return;
  }
  if (next === "json") {
    jsonText.value = toJson(editable.value ? draft.value : info.value?.tour);
    tab.value = "json";
    return;
  }
  if (editable.value) {
    const value = parseEditedJson();
    if (parseProblem.value) {
      return;
    }
    form.value = tourToForm(value);
  }
  tab.value = "steps";
}

function currentTour(): { ok: true; value: unknown } | { ok: false } {
  if (tab.value === "json") {
    const value = parseEditedJson();
    return parseProblem.value ? { ok: false } : { ok: true, value };
  }
  return { ok: true, value: form.value ? tourFromForm(form.value) : draft.value };
}

async function findTour(id: string): Promise<TourInfo | null> {
  const found = await api.getTour(id);
  if (options.value?.source === "custom" && found?.source !== "custom") {
    const all = await api.listTours();
    return all.find((item) => item.source === "custom" && item.tour.id === id) ?? found;
  }
  return found;
}

const { loading: loadLoading, action: load } = useAsync(async () => {
  problems.value = [];
  parseProblem.value = undefined;
  if (!param.value) {
    info.value = null;
    show(options.value?.draft ?? emptyTour());
  } else {
    info.value = await findTour(param.value);
    notFound.value = !info.value;
    if (info.value) {
      show(info.value.tour);
    }
  }
  ready.value = true;
  await settle();
});

const { loading: saveLoading, action: save } = useAsync(async () => {
  const current = currentTour();
  if (!current.ok) {
    return;
  }
  try {
    const saved = info.value
      ? await api.updateTour(info.value.tour.id, current.value)
      : await api.createTour(current.value);
    problems.value = [];
    const renamed = saved.tour.id !== param.value;
    info.value = saved;
    show(saved.tour);
    await settle();
    notification.success(t(renamed && isNew.value ? "GUIDED_TOURS.ALERTS.CREATED" : "GUIDED_TOURS.ALERTS.SAVED"));
    await callParent("reload");
    if (renamed) {
      await replaceWith({ name: "GuidedTourDetails", param: saved.tour.id, options: { source: "custom" } });
    }
  } catch (error) {
    if (error instanceof ProblemsError) {
      problems.value = error.problems;
      return;
    }
    throw error;
  }
});

const { loading: removeLoading, action: remove } = useAsync(async () => {
  const id = info.value?.tour.id;
  if (!id || !(await showConfirmation(t("GUIDED_TOURS.ALERTS.DELETE_CONFIRMATION", { id })))) {
    return;
  }
  await api.deleteTour(id);
  bladeForm.setBaseline();
  notification.success(t("GUIDED_TOURS.ALERTS.DELETED"));
  await callParent("reload");
  await closeSelf();
});

const { loading: copyLoading, action: copy } = useAsync(async () => {
  const id = info.value?.tour.id;
  if (!id) {
    return;
  }
  const created = await api.copyTour(id);
  notification.success(t("GUIDED_TOURS.ALERTS.COPIED", { id: created.tour.id }));
  await callParent("reload");
  await replaceWith({ name: "GuidedTourDetails", param: created.tour.id, options: { source: "custom" } });
});

const { action: setEnabled } = useAsync<boolean>(async (isEnabled) => {
  if (!info.value) {
    return;
  }
  await api.setTourEnabled(info.value.tour.id, !!isEnabled);
  info.value.isEnabled = !!isEnabled;
  await callParent("reload");
});

async function onEnabled(value: boolean) {
  await setEnabled(value);
}

const launchTarget = computed(() =>
  info.value && !isConflicting.value ? launchUrl(window.location.origin, info.value.tour) : undefined,
);

function launch() {
  if (launchTarget.value) {
    window.open(launchTarget.value, "_blank", "noopener");
  }
}

const loading = useLoading(loadLoading, saveLoading, removeLoading, copyLoading);

const toolbar = computed((): IBladeToolbar[] => [
  {
    id: "save",
    title: t("GUIDED_TOURS.DETAILS.TOOLBAR.SAVE"),
    icon: "lucide-save",
    isVisible: editable.value,
    disabled: !bladeForm.canSave.value || saveLoading.value,
    clickHandler: () => save(),
  },
  {
    id: "launch",
    title: t("GUIDED_TOURS.DETAILS.TOOLBAR.LAUNCH"),
    icon: "lucide-play",
    isVisible: !isNew.value,
    disabled: !launchTarget.value,
    clickHandler: launch,
  },
  {
    id: "copy",
    title: t("GUIDED_TOURS.DETAILS.TOOLBAR.COPY"),
    icon: "lucide-copy",
    isVisible: canManage.value && !isNew.value && !!info.value,
    disabled: bladeForm.isModified.value || isConflicting.value,
    clickHandler: () => copy(),
  },
  {
    id: "delete",
    title: t("GUIDED_TOURS.DETAILS.TOOLBAR.DELETE"),
    icon: "lucide-trash-2",
    isVisible: editable.value && !isNew.value,
    clickHandler: () => remove(),
  },
]);

useBladeNote(
  computed(() => {
    if (isConflicting.value) {
      return { variant: "warning", message: t("GUIDED_TOURS.DETAILS.CONFLICT_NOTE", { id: info.value?.tour.id }) };
    }
    if (editable.value && isNew.value) {
      return { variant: "info", message: t("GUIDED_TOURS.DETAILS.NEW_NOTE") };
    }
    if (editable.value && info.value?.isEnabled) {
      return { variant: "info", message: t("GUIDED_TOURS.DETAILS.PUBLISH_NOTE") };
    }
    return undefined;
  }),
);

defineExpose({ title });

onMounted(async () => {
  await Promise.all([loadLanguages(), load()]);
});
</script>

<style lang="scss">
.tour-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;

  &__missing {
    padding: 1.5rem;
  }

  &__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid var(--neutrals-200);
    padding-bottom: 0.5rem;
  }

  &__tabs {
    display: flex;
    gap: 0.25rem;
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
