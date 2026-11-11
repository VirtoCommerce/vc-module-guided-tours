<template>
  <VcBlade
    :title="$t('ORDERS.PAGES.LIST.TITLE')"
    :toolbar-items="bladeToolbar"
    :loading="loading"
    width="50%"
  >
    <VcDataTable
      v-model:search-value="searchValue"
      v-model:sort-field="sortField"
      v-model:sort-order="sortOrder"
      :items="data"
      :total-count="totalCount"
      :pagination="pagination"
      :searchable="true"
      :state-key="'ORDERS'"
      @row-click="onRowClick"
      @pagination-click="pagination.goToPage"
    >
      <!-- Add your columns here -->
      <VcColumn
        id="name"
        :title="$t('ORDERS.PAGES.LIST.COLUMNS.NAME')"
        sortable
      />
      <VcColumn
        id="createdDate"
        :title="$t('ORDERS.PAGES.LIST.COLUMNS.CREATED_DATE')"
        type="datetime"
        sortable
      />
    </VcDataTable>
  </VcBlade>
</template>

<script setup lang="ts">
import {
  useBlade,
  useDataTableSort,
  useTableSearch,
  useDataTablePagination,
  useFunctions,
  type IBladeToolbar,
} from "@vc-shell/framework";
import { VcBlade, VcDataTable, VcColumn } from "@vc-shell/framework/ui";
import { ref, watch } from "vue";
import useOrdersList from "../composables/useList";
import { useI18n } from "vue-i18n";

defineBlade({
  url: "/orders",
  name: "OrdersList",
  isWorkspace: true,
  menuItem: {
    title: "ORDERS.MENU.TITLE",
    icon: "lucide-box",
    priority: 10,
  },
});

const { t } = useI18n({ useScope: "global" });
const { openBlade, exposeToChildren } = useBlade();
const { debounce } = useFunctions();

const PAGE_SIZE = 20;

const { sortField, sortOrder, sortExpression } = useDataTableSort({
  stateKey: "ORDERS",
  initialField: "createdDate",
  initialDirection: "DESC",
});

const { data, loading, totalCount, getItems } = useOrdersList();

const { searchValue } = useTableSearch({ stateKey: "ORDERS" });
const pagination = useDataTablePagination({
  stateKey: "ORDERS",
  pageSize: PAGE_SIZE,
  totalCount,
});

function load() {
  return getItems({
    sort: sortExpression.value,
    keyword: searchValue.value || undefined,
    skip: pagination.skip,
    take: PAGE_SIZE,
  });
}

// One loader for sort/search/page. Debounced so typing doesn't fetch per keystroke.
load();
watch(searchValue, () => pagination.setPage(1));
watch([sortExpression, searchValue, () => pagination.skip], debounce(load, 300));

const reload = () => load();

const bladeToolbar = ref<IBladeToolbar[]>([
  {
    id: "refresh",
    title: t("ORDERS.PAGES.LIST.TOOLBAR.REFRESH"),
    icon: "lucide-refresh-cw",
    clickHandler: () => reload(),
  },
  {
    id: "add",
    title: t("ORDERS.PAGES.LIST.TOOLBAR.ADD"),
    icon: "lucide-plus",
    clickHandler: () => openDetails(),
  },
]);

function openDetails(item?: { id?: string }) {
  openBlade({
    name: "OrdersDetails",
    param: item?.id,
    async onClose() {
      await reload();
    },
  });
}

function onRowClick(event: { data: { id?: string } }) {
  openDetails(event.data);
}

exposeToChildren({ reload });
</script>
