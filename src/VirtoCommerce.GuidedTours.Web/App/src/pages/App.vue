<template>
  <VcApp
    :is-ready="isReady"
    :logo="logoImage"
    :title="$t('GUIDED_TOURS.TITLE')"
    :version="version"
  >
  </VcApp>
</template>

<script lang="ts" setup>
import { useUser } from "@vc-shell/framework";
import { VcApp } from "@vc-shell/framework/ui";
import { onMounted, ref } from "vue";
import logoImage from "/assets/logo.svg";

const isReady = ref(false);
const version = import.meta.env.PACKAGE_VERSION;

const { isAuthenticated } = useUser();

onMounted(() => {
  if (isAuthenticated.value) {
    isReady.value = true;
  }
});
</script>

<style lang="scss">
@use "./../styles/index.scss";
</style>
