<template>
  <VcBlade
    :title="$t('GUIDED_TOURS.LIST.TITLE')"
    :toolbar-items="toolbar"
    width="50%"
  >
    <div class="tours-list">
      <div class="tours-list__bar">
        <VcSwitch
          :model-value="showToUsers"
          :label="$t('GUIDED_TOURS.LIST.SHOW_TO_USERS')"
          :disabled="!canManage || showToUsers === undefined || switchLoading"
          @update:model-value="onShowToUsers"
        />
        <VcLanguageSelector
          v-model="language"
          :options="languages"
        />
      </div>

      <VcDataTable
        v-model:search-value="searchValue"
        class="tours-list__table"
        :items="visibleRows"
        :loading="loading"
        data-key="key"
        :active-item-id="activeChildParam"
        searchable
        :search-placeholder="$t('GUIDED_TOURS.LIST.SEARCH')"
        :column-switcher="false"
        :empty-state="{ icon: 'lucide-route', title: $t('GUIDED_TOURS.LIST.EMPTY') }"
        :not-found-state="{ icon: 'lucide-search', title: $t('GUIDED_TOURS.LIST.NOT_FOUND') }"
        @row-click="onRowClick"
      >
        <VcColumn
          id="title"
          :title="$t('GUIDED_TOURS.LIST.COLUMNS.TOUR')"
          mobile-role="title"
          always-visible
        >
          <template #body="{ data }">
            <div class="tours-list__tour">
              <span class="tours-list__tour-title">{{ data.title || data.info.tour.id }}</span>
              <span class="tours-list__muted">
                {{ $t("GUIDED_TOURS.ID_VERSION", { id: data.info.tour.id, version: data.info.tour.version }) }}
              </span>
            </div>
          </template>
        </VcColumn>

        <VcColumn
          id="source"
          :title="$t('GUIDED_TOURS.LIST.COLUMNS.SOURCE')"
        >
          <template #body="{ data }">
            <div class="tours-list__source">
              <VcStatus
                v-if="data.info.source === 'custom'"
                variant="warning"
              >
                {{ $t("GUIDED_TOURS.LIST.CUSTOM") }}
              </VcStatus>
              <VcStatus
                v-else
                variant="info"
              >
                {{ data.info.moduleId }}
              </VcStatus>
              <VcStatus
                v-if="data.info.isConflicting"
                variant="danger"
              >
                {{ $t("GUIDED_TOURS.LIST.CONFLICT") }}
              </VcStatus>
            </div>
          </template>
        </VcColumn>

        <VcColumn
          id="app"
          field="info.tour.appId"
          :title="$t('GUIDED_TOURS.LIST.COLUMNS.APP')"
        />

        <VcColumn
          id="stepCount"
          :title="$t('GUIDED_TOURS.LIST.COLUMNS.STEPS')"
          type="number"
          width="80px"
        />

        <VcColumn
          id="isEnabled"
          :title="$t('GUIDED_TOURS.LIST.COLUMNS.ON')"
          width="80px"
          mobile-role="status"
        >
          <template #body="{ data }">
            <div @click.stop>
              <VcSwitch
                :model-value="data.info.isEnabled"
                :aria-label="$t('GUIDED_TOURS.LIST.TOUR_SWITCH', { id: data.info.tour.id })"
                :disabled="!canManage"
                @update:model-value="(value) => onTourEnabled(data, !!value)"
              />
            </div>
          </template>
        </VcColumn>
      </VcDataTable>
    </div>
  </VcBlade>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useBlade, type IBladeToolbar } from "@vc-shell/framework";
import { VcBlade, VcColumn, VcDataTable, VcLanguageSelector, VcStatus, VcSwitch } from "@vc-shell/framework/ui";
import { useTourList } from "../composables/useTourList";
import { useToursPermissions } from "../composables/useToursPermissions";
import { useContentLanguage } from "../composables/useContentLanguage";
import { filterRows, toRows, type TourRow } from "../logic/rows";
import { textLanguages } from "../logic/text";

defineBlade({
  url: "/tours",
  name: "GuidedToursList",
  isWorkspace: true,
  menuItem: {
    title: "GUIDED_TOURS.MENU.TITLE",
    icon: "lucide-route",
    priority: 10,
  },
});

const { t } = useI18n({ useScope: "global" });
const { openBlade, exposeToChildren, activeChildParam } = useBlade();
const { canManage } = useToursPermissions();
const { languages, current: language, load: loadLanguages, add: addLanguages } = useContentLanguage();
const { tours, showToUsers, loading, switchLoading, load, setShowToUsers, setTourEnabled } = useTourList();

const searchValue = ref("");

const rows = computed(() => toRows(tours.value, language.value));
const visibleRows = computed(() => filterRows(rows.value, searchValue.value));

async function reload() {
  await load();
  addLanguages(tours.value.flatMap((info) => textLanguages(info.tour)));
}

function onRowClick(event: { data: TourRow }) {
  const { info } = event.data;
  openBlade({ name: "GuidedTourDetails", param: info.tour.id, options: { source: info.source } });
}

async function onShowToUsers(value: boolean | undefined) {
  await setShowToUsers(!!value);
}

async function onTourEnabled(row: TourRow, value: boolean) {
  await setTourEnabled({ info: row.info, isEnabled: value });
}

const toolbar = computed((): IBladeToolbar[] => [
  {
    id: "add",
    title: t("GUIDED_TOURS.LIST.TOOLBAR.ADD"),
    icon: "lucide-plus",
    isVisible: canManage.value,
    clickHandler: () => openBlade({ name: "GuidedTourAdd" }),
  },
  {
    id: "refresh",
    title: t("GUIDED_TOURS.LIST.TOOLBAR.REFRESH"),
    icon: "lucide-refresh-cw",
    clickHandler: () => reload(),
  },
]);

exposeToChildren({ reload });

onMounted(async () => {
  await Promise.all([loadLanguages(), reload()]);
});
</script>

<style lang="scss">
.tours-list {
  display: flex;
  flex-direction: column;
  height: 100%;

  &__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--neutrals-200);
  }

  &__table {
    flex: 1;
    min-height: 0;
  }

  &__tour {
    display: flex;
    flex-direction: column;
  }

  &__tour-title {
    font-weight: 600;
  }

  &__muted {
    color: var(--neutrals-500);
    font-size: 0.75rem;
  }

  &__source {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>
