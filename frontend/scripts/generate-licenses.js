// Builds src/data/licenses.json from the direct dependencies in
// package.json by reading each package's own node_modules/<name>/package.json.
// Re-run after changing dependencies: node scripts/generate-licenses.js
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const names = Object.keys(pkg.dependencies ?? {}).sort((a, b) => a.localeCompare(b));

const entries = names.map((name) => {
  const pkgJsonPath = path.join(root, "node_modules", name, "package.json");
  try {
    const depPkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    return {
      name,
      version: depPkg.version ?? "unknown",
      license: depPkg.license ?? (depPkg.licenses ? depPkg.licenses.map((l) => l.type).join(", ") : "unknown"),
    };
  } catch {
    return { name, version: "unknown", license: "unknown" };
  }
});

const outPath = path.join(root, "src", "data", "licenses.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(entries, null, 2) + "\n");
console.log(`Wrote ${entries.length} entries to ${outPath}`);
