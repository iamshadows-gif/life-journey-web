import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// Run after `npm run build`. No extra bundler or runtime library needed.
// The resulting HTML has no network dependencies, including fonts and audio.
const root = resolve(import.meta.dirname, "..");
const assets = await readdir(resolve(root, "dist/assets"));
const js = await readFile(
  resolve(
    root,
    "dist/assets",
    assets.find((f) => f.endsWith(".js")),
  ),
  "utf8",
);
let css = await readFile(
  resolve(
    root,
    "dist/assets",
    assets.find((f) => f.endsWith(".css")),
  ),
  "utf8",
);
let html = await readFile(resolve(root, "dist/index.html"), "utf8");
for (const file of [
  "cormorant-regular.ttf",
  "cormorant-italic.ttf",
  "dm-sans.ttf",
]) {
  const encoded = (
    await readFile(resolve(root, "public/fonts", file))
  ).toString("base64");
  css = css.replaceAll(`/fonts/${file}`, `data:font/ttf;base64,${encoded}`);
}
const ambient = (
  await readFile(resolve(root, "public/audio/ambient.wav"))
).toString("base64");
const licenses = await Promise.all(
  ["Cormorant-Garamond-OFL.txt", "DM-Sans-OFL.txt"].map((file) =>
    readFile(resolve(root, "public/fonts/licenses", file), "utf8"),
  ),
);
html = html.replace(/\s*<link[^>]*rel="preload"[^>]*>/g, "");
html = html.replace(/\s*<link[^>]*rel="stylesheet"[^>]*>/g, "");
html = html.replace(/\s*<script[^>]*src="[^\"]*"[^>]*><\/script>/g, "");
html = html.replace("/audio/ambient.wav", `data:audio/wav;base64,${ambient}`);
html = html.replace(
  "</head>",
  `<style>${css}</style>\n<!-- Local fonts: SIL Open Font License\n${licenses.join("\n\n")}\n-->\n</head>`,
);
html = html.replace(
  "</body>",
  `<script type="module">${js.replaceAll("</script", "<\\/script")}</script>\n</body>`,
);
await mkdir(resolve(root, "deliverables"), { recursive: true });
await writeFile(resolve(root, "deliverables/interwoven.html"), html);
console.log(
  `Standalone: deliverables/interwoven.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`,
);
