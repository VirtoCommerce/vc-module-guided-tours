<template>
  <VcBlade
    :title="title"
    :toolbar-items="bladeToolbar"
    :loading="loading"
    width="70%"
  >
    <VcContainer>
      <VcForm>
        <!-- Add your form fields here -->
        <VcInput
          v-model="item.name"
          :label="$t('ORDERS.PAGES.DETAILS.FIELDS.NAME')"
          required
        />
      </VcForm>
    </VcContainer>
  </VcBlade>
</template>

<script setup lang="ts">
import { useBlade, useBladeForm, type IBladeToolbar } from "@vc-shell/framework";
import { VcBlade, VcContainer, VcForm, VcInput } from "@vc-shell/framework/ui";
import { ref, computed, onMounted } from "vue";
import useOrdersDetails from "../composables/useDetails";
import { useI18n } from "vue-i18n";

defineBlade({
  url: "/orders-details",
  name: "OrdersDetails",
});

const { t } = useI18n({ useScope: "global" });
const { param, callParent } = useBlade();

const { item, loading, getItem, saveItem } = useOrdersDetails();

const form = useBladeForm({
  data: item,
  closeConfirmMessage: computed(() => t("ORDERS.ALERTS.CLOSE_CONFIRMATION")),
});

const title = computed(() => {
  return param.value
    ? String(item.value?.name || t("ORDERS.PAGES.DETAILS.TITLE"))
    : t("ORDERS.PAGES.DETAILS.TITLE_NEW");
});

const bladeToolbar = ref<IBladeToolbar[]>([
  {
    id: "save",
    title: t("ORDERS.PAGES.DETAILS.TOOLBAR.SAVE"),
    icon: "lucide-save",
    disabled: computed(() => !form.canSave.value),
    async clickHandler() {
      await saveItem();
      form.setBaseline();
      callParent("reload");
    },
  },
]);

onMounted(async () => {
  if (param.value) {
    await getItem(param.value);
    form.setBaseline();
  }
});
</script>
