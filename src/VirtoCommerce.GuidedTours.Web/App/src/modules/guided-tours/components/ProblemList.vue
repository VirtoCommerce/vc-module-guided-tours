<template>
  <VcBanner
    v-if="problems.length > 0"
    variant="danger"
    icon="lucide-circle-alert"
    :collapsed-height="200"
  >
    <template #title>
      {{ $t("GUIDED_TOURS.PROBLEMS.TITLE", { count: problems.length }, problems.length) }}
    </template>
    <ul class="problem-list">
      <li
        v-for="(problem, index) in problems"
        :key="index"
      >
        <code>{{ problem.path || $t("GUIDED_TOURS.PROBLEMS.ROOT") }}</code>: {{ problem.message }}
      </li>
    </ul>
  </VcBanner>
</template>

<script setup lang="ts">
import { VcBanner } from "@vc-shell/framework/ui";
import type { Problem } from "../api/types";

export interface ProblemListProps {
  problems: Problem[];
}

defineProps<ProblemListProps>();
</script>

<style lang="scss">
.problem-list {
  margin: 0;
  padding-left: 1.25rem;
  list-style: disc;

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
}
</style>
