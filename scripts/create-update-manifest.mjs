import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2)
  args.set(process.argv[index], process.argv[index + 1]);

const assetsDir = resolve(args.get("--assets-dir") ?? "release-assets");
const tag = args.get("--tag");
const version = args.get("--version");
const output = resolve(args.get("--output") ?? "latest.json");
if (!tag || !version) throw new Error("Usage: node create-update-manifest.mjs --tag TAG --version VERSION");

const files = await readdir(assetsDir, { recursive: true });
const platforms = {};
const candidates = files
  .filter((file) => /\.(exe|AppImage|app\.tar\.gz)$/i.test(file))
  .map((file) => resolve(assetsDir, file));

function platformFor(file) {
  const name = basename(file).toLowerCase();
  if (name.endsWith(".exe")) return "windows-x86_64";
  if (name.endsWith(".appimage")) return "linux-x86_64";
  if (name.endsWith(".app.tar.gz"))
    return name.includes("aarch64") || name.includes("arm64") ? "darwin-aarch64" : "darwin-x86_64";
  return undefined;
}

for (const file of candidates) {
  const platform = platformFor(file);
  if (!platform || platforms[platform]) continue;
  const signaturePath = `${file}.sig`;
  const signature = (await readFile(signaturePath, "utf8").catch(() => "")).trim();
  if (!signature) throw new Error(`Missing updater signature for ${basename(file)}`);
  const name = basename(file);
  platforms[platform] = {
    signature,
    url: `https://github.com/Tony0380/Computability/releases/download/${tag}/${encodeURIComponent(name)}`,
  };
}

for (const platform of ["windows-x86_64", "linux-x86_64", "darwin-x86_64", "darwin-aarch64"])
  if (!platforms[platform]) throw new Error(`Missing required updater platform: ${platform}`);

await writeFile(
  output,
  `${JSON.stringify({ version, notes: `Computability ${tag}`, pub_date: new Date().toISOString(), platforms }, null, 2)}\n`,
);
