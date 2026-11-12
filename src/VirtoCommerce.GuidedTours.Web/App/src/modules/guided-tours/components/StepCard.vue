<template>
  <VcCard
    class="step-card"
    :header="header"
  >
    <template #actions>
      <div class="step-card__actions">
        <VcButton
          icon="lucide-arrow-up"
          text
          size="sm"
          :disabled="index === 0"
          :aria-label="$t('GUIDED_TOURS.EDITOR.MOVE_UP')"
          @click="emit('move', -1)"
        />
        <VcButton
          icon="lucide-arrow-down"
          text
          size="sm"
          :disabled="index === count - 1"
          :aria-label="$t('GUIDED_TOURS.EDITOR.MOVE_DOWN')"
          @click="emit('move', 1)"
        />
        <VcButton
          icon="lucide-trash-2"
          text
          size="sm"
          :aria-label="$t('GUIDED_TOURS.EDITOR.REMOVE_STEP')"
          @click="emit('remove')"
        />
      </div>
    </template>

    <div class="step-card__body">
      <VcRadioGroup
        v-model="step.kind"
        :label="$t('GUIDED_TOURS.EDITOR.STEP_KIND')"
        :options="kindOptions"
        orientation="horizontal"
      />

      <TargetFields
        v-model="step.target"
        :label="$t('GUIDED_TOURS.EDITOR.TARGET')"
        allow-none
      />

      <template v-if="step.kind === 'action'">
        <VcSelect
          :model-value="step.condition.kind"
          :label="$t('GUIDED_TOURS.EDITOR.WAITS')"
          :options="conditionOptions"
          :clearable="false"
          @update:model-value="setCondition"
        />
        <p
          v-if="step.condition.kind === 'other'"
          class="step-card__note"
        >
          {{ $t("GUIDED_TOURS.EDITOR.CONDITION_OTHER_NOTE") }}
        </p>
        <VcInput
          v-if="step.condition.kind === 'bladeOpened' || step.condition.kind === 'bladeQueryChanged'"
          v-model="step.condition.blade"
          :label="$t('GUIDED_TOURS.EDITOR.BLADE')"
          required
        />
        <template v-if="step.condition.kind === 'elementAppears'">
          <TargetFields
            v-model="step.condition.element"
            :label="$t('GUIDED_TOURS.EDITOR.ELEMENT')"
          />
          <VcInput
            :model-value="step.condition.atLeast ?? null"
            type="integer"
            :label="$t('GUIDED_TOURS.EDITOR.AT_LEAST')"
            :hint="$t('GUIDED_TOURS.EDITOR.AT_LEAST_HINT')"
            @update:model-value="(value) => (step.condition.atLeast = toOptionalNumber(value))"
          />
        </template>
      </template>

      <VcInput
        :model-value="step.title[language] ?? ''"
        :label="$t('GUIDED_TOURS.EDITOR.STEP_TITLE')"
        multilanguage
        :current-language="language"
        @update:model-value="(value) => (step.title = setText(step.title, language, toText(value)))"
      />
      <VcTextarea
        :model-value="step.text[language] ?? ''"
        :label="$t('GUIDED_TOURS.EDITOR.STEP_TEXT')"
        multilanguage
        :current-language="language"
        required
        @update:model-value="(value) => (step.text = setText(step.text, language, value))"
      />
    </div>
  </VcCard>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { VcButton, VcCard, VcInput, VcRadioGroup, VcSelect, VcTextarea } from "@vc-shell/framework/ui";
import TargetFields from "./TargetFields.vue";
import { CONDITION_TYPES, type ConditionType } from "../logic/describe";
import type { StepForm, StepKindForm } from "../logic/form";
import { setText } from "../logic/text";
import { toOptionalNumber, toText } from "../logic/values";

export interface StepCardProps {
  index: number;
  count: number;
  language: string;
}

export interface StepCardEmits {
  (event: "move", delta: -1 | 1): void;
  (event: "remove"): void;
}

const props = defineProps<StepCardProps>();
const emit = defineEmits<StepCardEmits>();
const step = defineModel<StepForm>({ required: true });

const { t } = useI18n({ useScope: "global" });

const header = computed(
  () =>
    `${t("GUIDED_TOURS.EDITOR.STEP", { number: props.index + 1 })} · ${t(
      step.value.kind === "action" ? "GUIDED_TOURS.EDITOR.KINDS.ACTION" : "GUIDED_TOURS.EDITOR.KINDS.HINT",
    )}`,
);

const conditionKeys: Record<ConditionType, string> = {
  bladeOpened: "BLADE_OPENED",
  bladeQueryChanged: "BLADE_QUERY_CHANGED",
  routeChanged: "ROUTE_CHANGED",
  elementAppears: "ELEMENT_APPEARS",
  click: "CLICK",
};

const kindOptions = computed(() =>
  (["hint", "action"] as StepKindForm[]).map((kind) => ({
    value: kind,
    label: t(`GUIDED_TOURS.EDITOR.KINDS.${kind.toUpperCase()}`),
  })),
);

const conditionOptions = computed(() => [
  ...CONDITION_TYPES.map((type) => ({ id: type, title: t(`GUIDED_TOURS.EDITOR.CONDITIONS.${conditionKeys[type]}`) })),
  ...(step.value.condition.kind === "other" ? [{ id: "other", title: t("GUIDED_TOURS.EDITOR.CONDITIONS.OTHER") }] : []),
]);

function setCondition(kind: unknown) {
  const type = CONDITION_TYPES.find((candidate) => candidate === kind);
  if (!type) {
    return;
  }
  step.value.condition.kind = type;
  if (type === "elementAppears" && step.value.condition.element.kind === "none") {
    step.value.condition.element.kind = "css";
  }
}
</script>

<style lang="scss">
.step-card {
  &__actions {
    display: flex;
    gap: 0.25rem;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
  }

  &__note {
    margin: 0;
    color: var(--neutrals-500);
  }
}
</style>
