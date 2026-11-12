<template>
  <div class="tour-editor">
    <div class="tour-editor__row">
      <VcInput
        v-model="form.id"
        class="tour-editor__grow"
        :label="$t('GUIDED_TOURS.EDITOR.ID')"
        required
      />
      <VcInput
        :model-value="form.version ?? null"
        type="integer"
        :label="$t('GUIDED_TOURS.EDITOR.VERSION')"
        :tooltip="$t('GUIDED_TOURS.EDITOR.VERSION_HINT')"
        required
        @update:model-value="(value) => (form.version = toOptionalNumber(value))"
      />
      <VcInput
        v-model="form.appId"
        :label="$t('GUIDED_TOURS.EDITOR.APP')"
        required
      />
    </div>

    <VcInput
      :model-value="form.title[language] ?? ''"
      :label="$t('GUIDED_TOURS.EDITOR.TITLE')"
      multilanguage
      :current-language="language"
      required
      @update:model-value="(value) => (form.title = setText(form.title, language, toText(value)))"
    />

    <div class="tour-editor__row">
      <VcSelect
        :model-value="form.triggerKind === 'none' ? undefined : form.triggerKind"
        class="tour-editor__grow"
        :label="$t('GUIDED_TOURS.EDITOR.TRIGGER')"
        :options="triggerOptions"
        :clearable="false"
        required
        @update:model-value="setTrigger"
      />
      <VcInput
        v-if="form.triggerKind === 'bladeOpened'"
        v-model="form.triggerBlade"
        class="tour-editor__grow"
        :label="$t('GUIDED_TOURS.EDITOR.BLADE')"
        required
      />
    </div>
    <p
      v-if="form.triggerKind === 'other'"
      class="tour-editor__note"
    >
      {{ $t("GUIDED_TOURS.EDITOR.TRIGGER_OTHER_NOTE") }}
    </p>

    <VcMultivalue
      :model-value="permissionItems"
      :label="$t('GUIDED_TOURS.EDITOR.PERMISSIONS')"
      :placeholder="$t('GUIDED_TOURS.EDITOR.PERMISSIONS_PLACEHOLDER')"
      option-label="title"
      option-value="title"
      @update:model-value="setPermissions"
    />

    <h3 class="tour-editor__heading">{{ $t("GUIDED_TOURS.EDITOR.STEPS") }}</h3>

    <StepCard
      v-for="(step, index) in form.steps"
      :key="step.uid"
      v-model="form.steps[index]"
      :index="index"
      :count="form.steps.length"
      :language="language"
      @move="(delta) => moveStep(form, index, delta)"
      @remove="removeStep(form, index)"
    />

    <div>
      <VcButton
        icon="lucide-plus"
        variant="secondary"
        @click="addStep(form)"
      >
        {{ $t("GUIDED_TOURS.EDITOR.ADD_STEP") }}
      </VcButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { VcButton, VcInput, VcMultivalue, VcSelect } from "@vc-shell/framework/ui";
import StepCard from "./StepCard.vue";
import { addStep, moveStep, removeStep, type TourForm } from "../logic/form";
import { setText } from "../logic/text";
import { toOptionalNumber, toText } from "../logic/values";

export interface TourEditorProps {
  language: string;
}

defineProps<TourEditorProps>();
const form = defineModel<TourForm>({ required: true });

const { t } = useI18n({ useScope: "global" });

const triggerOptions = computed(() => [
  { id: "appReady", title: t("GUIDED_TOURS.EDITOR.TRIGGER_KINDS.APP_READY") },
  { id: "bladeOpened", title: t("GUIDED_TOURS.EDITOR.TRIGGER_KINDS.BLADE_OPENED") },
  ...(form.value.triggerKind === "other" ? [{ id: "other", title: t("GUIDED_TOURS.EDITOR.TRIGGER_KINDS.OTHER") }] : []),
]);

const permissionItems = computed(() =>
  form.value.permissions.map((permission) => ({ id: permission, title: permission })),
);

function setPermissions(items: unknown) {
  form.value.permissions = (Array.isArray(items) ? items : [])
    .map((item: { title?: unknown }) => String(item?.title ?? "").trim())
    .filter((permission, index, all) => permission !== "" && all.indexOf(permission) === index);
}

function setTrigger(kind: unknown) {
  if (kind === "appReady" || kind === "bladeOpened") {
    form.value.triggerKind = kind;
  }
}
</script>

<style lang="scss">
.tour-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;

    > * {
      min-width: 10rem;
    }
  }

  &__grow {
    flex: 1;
  }

  &__heading {
    margin: 0.5rem 0 0;
    font-size: 1rem;
    font-weight: 600;
  }

  &__note {
    margin: 0;
    color: var(--neutrals-500);
  }
}
</style>
