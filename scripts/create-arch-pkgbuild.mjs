import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2)
  args.set(process.argv[index], process.argv[index + 1]);
const assetsDir = resolve(args.get("--assets-dir") ?? "release-assets");
const version = args.get("--version");
const tag = args.get("--tag");
const output = resolve(args.get("--output") ?? "PKGBUILD");
if (!version || !tag) throw new Error("Usage: node create-arch-pkgbuild.mjs --version VERSION --tag TAG");

const files = await (await import("node:fs/promises")).readdir(assetsDir, { recursive: true });
const relative = files.find((file) => /linux-x86_64\.AppImage$/i.test(file));
if (!relative) throw new Error("Linux AppImage is required to create the Arch package recipe.");
const appImage = resolve(assetsDir, relative);
const digest = createHash("sha256")
  .update(await readFile(appImage))
  .digest("hex");
const fileName = basename(appImage);
const url = `https://github.com/Tony0380/Computability/releases/download/${tag}/${encodeURIComponent(fileName)}`;
const template = await readFile(new URL("../packaging/arch/PKGBUILD.template", import.meta.url), "utf8");
await writeFile(
  output,
  template
    .replaceAll("__VERSION__", version)
    .replaceAll("__APPIMAGE_URL__", url)
    .replaceAll("__SHA256__", digest),
);
console.log(`Created ${output} for ${fileName} (${digest}).`);
