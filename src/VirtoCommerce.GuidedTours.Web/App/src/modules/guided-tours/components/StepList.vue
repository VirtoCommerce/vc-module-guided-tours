<template>
  <p
    v-if="items.length === 0"
    class="step-list__empty"
  >
    {{ $t("GUIDED_TOURS.DETAILS.NO_STEPS") }}
  </p>
  <ol
    v-else
    class="step-list"
  >
    <li
      v-for="item in items"
      :key="item.number"
      class="step-list__step"
    >
      <span
        class="step-list__number"
        :class="{ 'step-list__number_action': item.isAction }"
      >
        {{ item.number }}
      </span>
      <div class="step-list__body">
        <div class="step-list__heading">{{ item.heading }}</div>
        <div class="step-list__text">
          <b v-if="item.title">{{ item.title }}</b>
          <span v-if="item.title && item.text"> — </span>
          <span>{{ item.text }}</span>
          <span
            v-if="item.otherLanguage"
            class="step-list__muted"
          >
            ({{ $t("GUIDED_TOURS.DETAILS.STEP_LANGUAGE", { language: item.otherLanguage }) }})
          </span>
        </div>
        <div
          v-if="item.waits"
          class="step-list__muted"
        >
          {{ item.waits }}
        </div>
      </div>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { TourStep } from "../api/types";
import { describeCondition, describeStepHeading, describeTimeout } from "../logic/describe";
import { resolveTextEntry } from "../logic/text";

export interface StepListProps {
  steps: unknown;
  language: string;
}

const props = defineProps<StepListProps>();

const { t } = useI18n({ useScope: "global" });

const items = computed(() => {
  const steps = Array.isArray(props.steps) ? (props.steps as TourStep[]) : [];
  return steps.map((step, index) => {
    const title = resolveTextEntry(step?.title, props.language);
    const text = resolveTextEntry(step?.text, props.language);
    const shown = text ?? title;
    const timeout = step?.action ? describeTimeout(step.action.timeout, t) : undefined;
    const waits = step?.action ? describeCondition(step.action.until, step.target, t) : undefined;
    return {
      number: index + 1,
      isAction: !!step?.action,
      heading: describeStepHeading(step ?? { text: {} }, t),
      title: title?.value,
      text: text?.value,
      otherLanguage: shown && shown.language !== props.language ? shown.language : undefined,
      waits: waits && timeout ? `${waits} · ${timeout}` : waits,
    };
  });
});
</script>

<style lang="scss">
.step-list {
  list-style: none;
  margin: 0;
  padding: 0;

  &__step {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--neutrals-100);
  }

  &__number {
    flex: none;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--neutrals-200);
    text-align: center;
    line-height: 1.5rem;
    font-size: 0.75rem;
    font-weight: 600;

    &_action {
      background: var(--primary-500);
      color: var(--additional-50);
    }
  }

  &__body {
    min-width: 0;
  }

  &__heading {
    font-size: 0.75rem;
    color: var(--neutrals-500);
    word-break: break-word;
  }

  &__text {
    margin-top: 0.125rem;
  }

  &__muted,
  &__empty {
    color: var(--neutrals-500);
  }
}
</style>
