import path from "node:path";
import { getDynamicModuleConfiguration } from "@vc-shell/mf-module";

// Builds the tour engine as the admin-shell plugin into <module root>/plugins/admin-shell/.
// vc-build packs the artifacts folder, so the CI build points GUIDED_TOURS_MODULE_ROOT there.
process.env.APP_BASE_PATH ??= "/modules/$(VirtoCommerce.GuidedTours)/plugins/admin-shell/";

export default getDynamicModuleConfiguration({
  appId: "admin-shell",
  moduleRoot: process.env.GUIDED_TOURS_MODULE_ROOT ?? path.resolve(__dirname, ".."),
  entry: "./src/modules/index.ts",
  remoteName: "guided_tours_admin",
  build: { rollupOptions: { input: "./src/modules/index.ts" } },
});
