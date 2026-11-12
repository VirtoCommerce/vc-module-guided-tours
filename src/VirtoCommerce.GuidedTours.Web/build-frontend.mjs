// vc-build runs `npm run webpack:build` here before packaging. It builds the Guided Tours app
// itself (BuildCustomApp), but neither tests it nor builds VC-Shell plugins, so this script does both.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webDir = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(webDir, "../../artifacts/VirtoCommerce.GuidedTours");

function yarn(folder, args, env = {}) {
  console.log(`> yarn ${args.join(" ")} (${folder})`);
  execFileSync("yarn", args, { cwd: path.join(webDir, folder), stdio: "inherit", env: { ...process.env, ...env } });
}

yarn("ShellPlugin", ["install", "--immutable"]);
yarn("ShellPlugin", ["test", "run"]);
yarn("ShellPlugin", ["type-check"]);
yarn("ShellPlugin", ["build:admin-shell"], { GUIDED_TOURS_MODULE_ROOT: moduleRoot });

yarn("App", ["install", "--immutable"]);
yarn("App", ["test"]);
yarn("App", ["type-check"]);
