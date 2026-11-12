<template>
  <div class="target-fields">
    <VcSelect
      :model-value="target.kind"
      :label="label"
      :options="kindOptions"
      :clearable="false"
      @update:model-value="setKind"
    />
    <p
      v-if="target.kind === 'other'"
      class="target-fields__note"
    >
      {{ $t("GUIDED_TOURS.EDITOR.TARGET_OTHER_NOTE") }}
    </p>
    <template v-else-if="target.kind !== 'none'">
      <VcInput
        v-model="target.value"
        :label="target.kind === 'css' ? $t('GUIDED_TOURS.EDITOR.CSS') : $t('GUIDED_TOURS.EDITOR.ANCHOR')"
        required
      />
      <VcInput
        v-model="target.label"
        :label="$t('GUIDED_TOURS.EDITOR.LABEL')"
        :hint="$t('GUIDED_TOURS.EDITOR.LABEL_HINT')"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { VcInput, VcSelect } from "@vc-shell/framework/ui";
import type { TargetForm, TargetKind } from "../logic/form";

export interface TargetFieldsProps {
  label: string;
  allowNone?: boolean;
}

const props = defineProps<TargetFieldsProps>();
const target = defineModel<TargetForm>({ required: true });

const { t } = useI18n({ useScope: "global" });

const kindOptions = computed(() => {
  const kinds: TargetKind[] = [
    ...(props.allowNone ? (["none"] as const) : []),
    "anchor",
    "css",
    ...(target.value.kind === "other" ? (["other"] as const) : []),
  ];
  return kinds.map((kind) => ({ id: kind, title: t(`GUIDED_TOURS.EDITOR.TARGET_KINDS.${kind.toUpperCase()}`) }));
});

function setKind(kind: unknown) {
  if (kind === "none" || kind === "anchor" || kind === "css") {
    target.value.kind = kind;
  }
}
</script>

<style lang="scss">
.target-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  &__note {
    margin: 0;
    color: var(--neutrals-500);
  }
}
</style>
