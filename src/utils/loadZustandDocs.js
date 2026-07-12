import { readdir, readFile } from "fs/promises";
import { join } from "path";

/**
 * Recursively walks a directory tree and collects all .md files.
 * Skips non-markdown files (images, icons, etc.)
 */
async function walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkDir(fullPath);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const content = await readFile(fullPath, "utf-8");
      results.push({ path: fullPath, content });
    }
    // Silently skips bear.jpg, favicon.ico, etc.
  }

  return results;
}

/**
 * Loads all Zustand docs from disk into the same { path, content } shape
 * that cleanPage already expects — no changes needed downstream.
 *
 * @param {string} rootDir  path to zustand_docs_raw folder
 * @returns {Promise<Array<{ path: string, content: string }>>}
 */
export async function loadZustandDocs(rootDir) {
  const pages = await walkDir(rootDir);
  console.log(`[loader] Found ${pages.length} .md files in ${rootDir}`);
  return pages;
}