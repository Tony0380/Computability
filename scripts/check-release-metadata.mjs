import { readFile } from "node:fs/promises";

const [cargoToml, packageJson, tauriConfig] = await Promise.all([
  readFile(new URL("../Cargo.toml", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"),
]);

const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const packageVersion = JSON.parse(packageJson).version;
const tauriVersion = JSON.parse(tauriConfig).version;

if (!cargoVersion || !packageVersion || !tauriVersion) {
  throw new Error("Release metadata must provide a version in Cargo.toml, package.json and tauri.conf.json.");
}

if (new Set([cargoVersion, packageVersion, tauriVersion]).size !== 1) {
  throw new Error(`Release versions differ: Cargo=${cargoVersion}, npm=${packageVersion}, Tauri=${tauriVersion}.`);
}

console.log(`Release metadata verified for v${cargoVersion}.`);
