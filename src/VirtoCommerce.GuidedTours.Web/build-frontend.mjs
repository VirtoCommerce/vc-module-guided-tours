// vc-build runs `npm run webpack:build` here before packaging. It builds the Guided Tours app
// itself (BuildCustomApp), but neither tests it nor builds VC-Shell plugins, so this script does both.
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webDir = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(webDir, "../../artifacts/VirtoCommerce.GuidedTours");

function run(command, folder, env = {}) {
  console.log(`> ${command} (${folder})`);
  execSync(command, { cwd: path.join(webDir, folder), stdio: "inherit", env: { ...process.env, ...env } });
}

run("yarn install --immutable", "ShellPlugin");
run("yarn test run", "ShellPlugin");
run("yarn type-check", "ShellPlugin");
run("yarn build:admin-shell", "ShellPlugin", { GUIDED_TOURS_MODULE_ROOT: moduleRoot });

run("yarn install --immutable", "App");
run("yarn test", "App");
run("yarn type-check", "App");
