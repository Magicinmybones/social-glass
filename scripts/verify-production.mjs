import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const requiredFiles = [
  "index.html",
  "assets/css/showcase.css",
  "assets/js/live-screen.js",
  "screen 1/index.html",
  "screen 1/styles.css",
  "screen 1/glass-avatar.js",
  "screen 2/index.html",
  "screen 2/styles.css",
  "screen 3/index.html",
  "screen 3/styles.css",
  "screen 3/glass-avatar.js",
];
const forbiddenProductionNames = new Set([
  "figma.css",
  "image.png",
  "screen-3-offline.html",
  "build-offline.mjs",
  "liquid-glass-controls.js",
  "liquid-glass-controls.jsx",
]);

const failures = [];

async function assertFile(relativePath) {
  try {
    await access(resolve(root, relativePath));
  } catch {
    failures.push(`Missing required file: ${relativePath}`);
  }
}

function isExternalReference(reference) {
  return /^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(reference);
}

async function verifyReferences(relativePath) {
  const absolutePath = resolve(root, relativePath);
  const source = await readFile(absolutePath, "utf8");
  const references = [];

  if (extname(relativePath) === ".html") {
    for (const match of source.matchAll(/(?:src|href|poster|image)=["']([^"']+)["']/gi)) {
      references.push(match[1]);
    }
  } else if (extname(relativePath) === ".css") {
    for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      references.push(match[1]);
    }
  }

  for (const reference of references) {
    if (isExternalReference(reference)) continue;

    const cleanReference = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
    const target = resolve(dirname(absolutePath), cleanReference);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      failures.push(`Reference escapes project root: ${relativePath} -> ${reference}`);
      continue;
    }

    try {
      await access(target);
    } catch {
      failures.push(`Broken reference: ${relativePath} -> ${reference}`);
    }
  }
}

async function verifyCleanScreenFolders() {
  for (const screen of ["screen 1", "screen 2", "screen 3"]) {
    const entries = await readdir(resolve(root, screen), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || forbiddenProductionNames.has(entry.name)) {
        failures.push(`Development artifact remains in ${screen}: ${entry.name}`);
      }
      if (entry.name.toLowerCase().endsWith(".fig")) {
        failures.push(`Design source remains in ${screen}: ${entry.name}`);
      }
    }
  }
}

await Promise.all(requiredFiles.map(assertFile));
await Promise.all([
  verifyReferences("index.html"),
  verifyReferences("assets/css/showcase.css"),
  verifyReferences("screen 1/index.html"),
  verifyReferences("screen 1/styles.css"),
  verifyReferences("screen 2/index.html"),
  verifyReferences("screen 2/styles.css"),
  verifyReferences("screen 3/index.html"),
  verifyReferences("screen 3/styles.css"),
]);
await verifyCleanScreenFolders();

const indexMarkup = await readFile(resolve(root, "index.html"), "utf8");
if (/<iframe\b/i.test(indexMarkup)) failures.push("index.html contains an iframe.");
if (/screen%20[123]\/image\.png/i.test(indexMarkup)) {
  failures.push("index.html references a rendered screen preview.");
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Production integrity check passed.");
}
