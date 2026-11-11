import { getDynamicModuleConfiguration } from "@vc-shell/mf-module";

export default getDynamicModuleConfiguration({
  remoteName: "guided_tours",
  build: {
    rollupOptions: { input: "./src/modules/index.ts" },
  },
});
