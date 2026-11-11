import { effectScope, watch, type App } from "vue";
import type { Router } from "vue-router";
import { defineAppModule, useBladeStack, usePermissions, useUser } from "@vc-shell/framework";
import * as locales from "./locales";
import { createDriverRenderer } from "./guided-tours/driver-renderer";
import { createPlatformSource } from "./guided-tours/platform-source";
import { startScheduler, type Scheduler } from "./guided-tours/scheduler";
import type { BladeSnapshot, TourContext, TourSource } from "./guided-tours/types";
import "./guided-tours/guided-tours.scss";

export type * from "./guided-tours/types";

export interface GuidedToursOptions {
  router?: Router;
  /** Host app id. Defaults to the `plugins/{appId}/` folder the plugin is served from. */
  appId?: string;
  /** Where tours and progress come from. Defaults to the platform API. */
  source?: TourSource;
}

export function appIdFromUrl(url: string): string | undefined {
  return /\/plugins\/([^/]+)\//.exec(new URL(url).pathname)?.[1];
}

const LocalesModule = defineAppModule({ locales });

export default {
  install(app: App, options: GuidedToursOptions = {}) {
    app.use(LocalesModule);

    const appId = options.appId ?? appIdFromUrl(import.meta.url);
    if (!options.source && !appId) {
      console.warn("[guided-tours] Host app id is unknown, tours are off. Pass `appId` when installing the plugin.");
      return;
    }

    app.runWithContext(() => {
      const bladeStack = useBladeStack();
      const { user, isAuthenticated, getAccessToken } = useUser();
      const { hasAccess } = usePermissions();
      const translate = (key: string, params?: Record<string, unknown>) =>
        app.config.globalProperties.$t(key, params ?? {}) as string;
      const router = options.router ?? app.config.globalProperties.$router;

      const context: TourContext = {
        blades: () =>
          bladeStack.blades.value.map((blade: BladeSnapshot) => ({ id: blade.id, name: blade.name, query: blade.query })),
        route: () => router?.currentRoute.value.fullPath ?? "",
      };
      const source = options.source ?? createPlatformSource(appId as string, getAccessToken);

      let scheduler: Scheduler | undefined;
      effectScope(true).run(() => {
        watch(
          () => (isAuthenticated.value ? user.value?.id : undefined),
          (userId) => {
            scheduler?.stop();
            scheduler = userId
              ? startScheduler({
                  source,
                  context,
                  hasAccess,
                  translate,
                  createRenderer: createDriverRenderer,
                  onError: (error) => console.error("[guided-tours]", error),
                })
              : undefined;
          },
          { immediate: true },
        );
      });
    });
  },
};
