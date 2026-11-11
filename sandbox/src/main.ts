import VirtoShellFramework, { notification, useUser, useLanguages } from "@vc-shell/framework";
import { registerRemoteModules } from "@vc-shell/mf-host";
import { createApp } from "vue";
import { router } from "./router";
import * as locales from "./locales";
import { RouterView } from "vue-router";
import Orders from "./modules/orders";
import Sample from "./modules/sample";
import { bootstrap } from "./bootstrap";
import GuidedTours from "@guided-tours";
import { createSandboxSource } from "./guided-tours-sandbox";

import "@vc-shell/framework/dist/index.css";

async function startApp() {
  const { loadUser } = useUser();

  try {
    await loadUser();
  } catch (e) {
    console.log(e);
  }

  const { currentLocale, setLocale } = useLanguages();

  const app = createApp(RouterView);

  app.use(VirtoShellFramework, {
    router,
    i18n: {
      locale: import.meta.env.APP_I18N_LOCALE,
      fallbackLocale: import.meta.env.APP_I18N_FALLBACK_LOCALE,
    },
  });

  app.use(Orders);
  app.use(Sample);
  app.use(router);
  app.use(GuidedTours, { router, appId: "sandbox", source: createSandboxSource() });

  bootstrap(app);

  Object.entries(locales).forEach(([key, message]) => {
    app.config.globalProperties.$mergeLocaleMessage(key, message);
  });

  setLocale(currentLocale.value);

  app.config.errorHandler = (err: unknown) => {
    notification.error((err as Error).toString(), {
      timeout: 5000,
    });
  };

  // Register remote modules BEFORE mount so the provide/inject keys
  // (ModulesReadyKey, ModulesLoadErrorKey) are available to mounted components.
  // Fire-and-forget — sets modulesReady/modulesLoadError when complete.
  registerRemoteModules(app, { router, appName: "sandbox" });

  await router.isReady();

  app.mount("#app");
}

startApp();
