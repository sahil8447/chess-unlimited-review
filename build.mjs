
import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";

const dist = "dist";

fs.mkdirSync(dist, { recursive: true });
fs.cpSync("pieces", "dist/pieces", {
  recursive: true
});
fs.mkdirSync(path.join(dist, "engine"), {
  recursive: true
});

await esbuild.build({
  entryPoints: ["src/content.js"],
  bundle: true,
  outfile: "dist/content.js",
  format: "iife",
  platform: "browser",
  target: "chrome120"
});



const filesToCopy = [
  ["manifest.json", "manifest.json"],
  ["src/content.css", "content.css"],
  ["background.js", "background.js"],
  ["offscreen.html", "offscreen.html"],
  ["offscreen.js", "offscreen.js"]
];


for (const [source, destination] of filesToCopy) {
  fs.copyFileSync(
    source,
    path.join(dist, destination)
  );
}


for (const file of [
  "stockfish-19-lite-single.js",
  "stockfish-19-lite-single.wasm"
]) {
  fs.copyFileSync(
    path.join("engine", file),
    path.join(dist, "engine", file)
  );
}

console.log("Extension built successfully!");
