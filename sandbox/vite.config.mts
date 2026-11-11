import { fileURLToPath } from "node:url";
import { mergeConfig, type PluginOption } from "vite";
import { getApplicationConfiguration } from "@vc-shell/config-generator";
import { mfHostConfig } from "@vc-shell/mf-host/vite";

const pluginSource = fileURLToPath(
  new URL("../src/VirtoCommerce.GuidedTours.Web/ShellPlugin/src/modules", import.meta.url),
);

const config = getApplicationConfiguration(
  mergeConfig(mfHostConfig(), {
    resolve: {
      alias: { "@guided-tours": pluginSource },
      // The plugin source sits outside this app; make its framework imports share this app's single copy.
      dedupe: ["vue", "vue-router", "vue-i18n", "@vc-shell/framework"],
    },
    server: {
      port: 3310,
      strictPort: true,
      fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] },
    },
  }),
);

// The sandbox serves plain HTTP: mkcert wants sudo to trust its CA, which a dev box may not allow.
const withoutMkcert = (plugins: PluginOption[] = []): PluginOption[] =>
  plugins.flat().filter((plugin) => !(plugin && "name" in plugin && plugin.name.includes("mkcert")));

export default { ...config, plugins: withoutMkcert(config.plugins) };
