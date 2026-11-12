import { effectScope, watch, type App } from "vue";
import type { Router } from "vue-router";
import {
  defineAppModule,
  getBladeConfig,
  i18n,
  useBladeStack,
  usePermissions,
  useUser,
  type IBladeStack,
} from "@vc-shell/framework";
import * as locales from "./locales";
import { createDriverRenderer } from "./guided-tours/driver-renderer";
import { launchTour, launchTourId, type Launch } from "./guided-tours/launch";
import { createPlatformSource } from "./guided-tours/platform-source";
import { startScheduler, type Scheduler } from "./guided-tours/scheduler";
import type { BladeSnapshot, TourContext, TourSource } from "./guided-tours/types";
import "./guided-tours/guided-tours.scss";

export type * from "./guided-tours/types";
export { resolveText } from "./guided-tours/texts";

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
      const bladeStack: Pick<IBladeStack, "blades" | "openWorkspace" | "openBlade"> = useBladeStack();
      const { user, isAuthenticated, getAccessToken } = useUser();
      const { hasAccess } = usePermissions();
      const translate = (key: string, params?: Record<string, unknown>) =>
        app.config.globalProperties.$t(key, params ?? {}) as string;
      const router: Router | undefined = options.router ?? app.config.globalProperties.$router;

      const context: TourContext = {
        blades: () =>
          bladeStack.blades.value.map((blade: BladeSnapshot) => ({ id: blade.id, name: blade.name, query: blade.query })),
        route: () => router?.currentRoute.value.fullPath ?? "",
        locale: () => i18n.global.locale.value,
      };
      const source = options.source ?? createPlatformSource(appId as string, getAccessToken);

      const openBlade = async (name: string) => {
        const isWorkspace = getBladeConfig(name)?.isWorkspace ?? bladeStack.blades.value.length === 0;
        await (isWorkspace ? bladeStack.openWorkspace({ name }) : bladeStack.openBlade({ name }));
      };

      const launchId = (router ? router.isReady() : Promise.resolve())
        .catch(() => undefined)
        .then(() => launchTourId(window.location.search, router?.currentRoute.value.query));
      const signedInUserId = () => (isAuthenticated.value ? user.value?.id : undefined);

      let scheduler: Scheduler | undefined;
      let launch: Launch | undefined;
      let launched = false;
      const onError = (error: unknown) => console.error("[guided-tours]", error);

      effectScope(true).run(() => {
        watch(
          signedInUserId,
          async (userId) => {
            scheduler?.stop();
            scheduler = undefined;
            launch?.stop();
            launch = undefined;
            if (!userId) {
              return;
            }

            const tourId = await launchId;
            if (userId !== signedInUserId()) {
              return;
            }

            if (tourId) {
              if (!launched) {
                launched = true;
                launch = launchTour({
                  tourId,
                  source,
                  context,
                  openBlade,
                  createRenderer: createDriverRenderer,
                  translate,
                  onError,
                });
              }
              return;
            }

            scheduler = startScheduler({
              source,
              context,
              hasAccess,
              translate,
              createRenderer: createDriverRenderer,
              onError,
            });
          },
          { immediate: true },
        );
      });
    });
  },
};
