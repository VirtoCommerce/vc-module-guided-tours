<template>
  <dl class="tour-facts">
    <dt>{{ $t("GUIDED_TOURS.DETAILS.FACTS.ID_VERSION") }}</dt>
    <dd>{{ $t("GUIDED_TOURS.ID_VERSION", { id: tour.id || "—", version: tour.version ?? "—" }) }}</dd>

    <dt>{{ $t("GUIDED_TOURS.DETAILS.FACTS.SOURCE") }}</dt>
    <dd class="tour-facts__inline">
      <span>{{ sourceText }}</span>
      <VcStatus
        v-if="isConflicting"
        variant="danger"
      >
        {{ $t("GUIDED_TOURS.LIST.CONFLICT") }}
      </VcStatus>
    </dd>

    <dt>{{ $t("GUIDED_TOURS.DETAILS.FACTS.STARTS_WHEN") }}</dt>
    <dd>{{ describeTrigger(tour.trigger, t) }}</dd>

    <dt>{{ $t("GUIDED_TOURS.DETAILS.FACTS.SHOWN_TO") }}</dt>
    <dd>{{ describeAudience(tour.permissions, t) }}</dd>

    <template v-if="notShownTo">
      <dt>{{ $t("GUIDED_TOURS.DETAILS.FACTS.NOT_SHOWN_TO") }}</dt>
      <dd>{{ notShownTo }}</dd>
    </template>

    <template v-if="isEnabled !== undefined">
      <dt>{{ $t("GUIDED_TOURS.DETAILS.FACTS.STATUS") }}</dt>
      <dd>
        <VcSwitch
          :model-value="isEnabled"
          :label="isEnabled ? $t('GUIDED_TOURS.DETAILS.ON_FOR_USERS') : $t('GUIDED_TOURS.DETAILS.OFF_FOR_USERS')"
          :disabled="!canSwitch"
          @update:model-value="(value) => emit('update:isEnabled', !!value)"
        />
      </dd>
    </template>

    <template v-if="modified">
      <dt>{{ $t("GUIDED_TOURS.DETAILS.FACTS.MODIFIED") }}</dt>
      <dd>{{ modified }}</dd>
    </template>
  </dl>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { VcStatus, VcSwitch } from "@vc-shell/framework/ui";
import type { Tour, TourSource } from "../api/types";
import { describeAudience, describePublishedAt, describeTrigger } from "../logic/describe";

export interface TourFactsProps {
  tour: Partial<Tour>;
  source: TourSource;
  moduleId?: string | null;
  isConflicting?: boolean;
  isEnabled?: boolean;
  canSwitch?: boolean;
  modifiedDate?: string | null;
  modifiedBy?: string | null;
}

export interface TourFactsEmits {
  (event: "update:isEnabled", value: boolean): void;
}

const props = defineProps<TourFactsProps>();
const emit = defineEmits<TourFactsEmits>();

const { t, locale } = useI18n({ useScope: "global" });

const sourceText = computed(() =>
  props.source === "module"
    ? t("GUIDED_TOURS.DETAILS.MODULE_SOURCE", { module: props.moduleId ?? "" })
    : t("GUIDED_TOURS.DETAILS.CUSTOM_SOURCE"),
);

const notShownTo = computed(() => describePublishedAt(props.tour.publishedAt, t));

const modified = computed(() => {
  if (!props.modifiedDate) {
    return undefined;
  }
  const date = new Date(props.modifiedDate);
  const when = Number.isNaN(date.getTime()) ? props.modifiedDate : date.toLocaleString(locale.value);
  return props.modifiedBy ? t("GUIDED_TOURS.DETAILS.MODIFIED_BY", { date: when, user: props.modifiedBy }) : when;
});
</script>

<style lang="scss">
.tour-facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.5rem 1rem;
  margin: 0;
  align-items: center;

  dt {
    color: var(--neutrals-500);
  }

  dd {
    margin: 0;
    word-break: break-word;
  }

  &__inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}
</style>
