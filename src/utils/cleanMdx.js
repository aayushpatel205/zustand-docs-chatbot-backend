import matter from "gray-matter";

/**
 * Strips noisy syntax while preserving meaningful content.
 *
 * isMdx = true  (Expo .mdx):  strips imports, JSX tags, links, blockquotes
 * isMdx = false (Zustand .md): strips only links and blockquotes —
 *   import lines inside code fences are preserved as actual content
 */
function stripMdxSyntax(body, { isMdx = true } = {}) {
  let text = body;

  // Normalize Windows line endings first — prevents \r leaking into chunks
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (isMdx) {
    // MDX-only: top-level component imports
    text = text.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, "");

    // Self-closing PascalCase JSX: extract alt text, otherwise drop
    text = text.replace(/<[A-Z][A-Za-z]*\s+([^>]*?)\/>/g, (match, attrs) => {
      const altMatch = attrs.match(/alt=["']([^"']*)["']/);
      return altMatch ? `(Image: ${altMatch[1]})` : "";
    });

    // Opening/closing PascalCase JSX tags: strip tags, keep inner content
    text = text.replace(/<\/?[A-Z][A-Za-z]*(\s+[^>]*)?>/g, "");
  }

  // Lowercase HTML tags — present in both .md and .mdx (Zustand uses raw HTML)
  // <img>: extract alt text if present, otherwise drop
  text = text.replace(/<img\s+([^>]*?)\/?>/gi, (match, attrs) => {
    const altMatch = attrs.match(/alt=["']([^"']*)["']/);
    return altMatch ? `(Image: ${altMatch[1]})` : "";
  });
  // All other lowercase HTML tags: strip tags, keep inner text
  text = text.replace(/<\/?[a-z][a-zA-Z]*(\s+[^>]*)?>/g, "");

  // Reference-style link definitions: [label]: https://... → remove entirely
  text = text.replace(/^\[[^\]]+\]:\s*https?:\/\/\S+\s*$/gm, "");

  // Inline markdown links [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Bare reference links [zombie child problem] → zombie child problem
  // Skips empty [], checkboxes [ ]/[x], and single-char brackets
  text = text.replace(/\[([^\]]{2,})\]/g, "$1");

  // Blockquote markers "> content" → "content"
  text = text.replace(/^>\s?/gm, "");

  // Collapse 3+ blank lines to 2
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/**
 * Zustand docs have no frontmatter — fall back to the first # heading
 * so chunks still get a meaningful title context prefix in chunkMarkdown.
 */
function extractFirstHeading(body) {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

/**
 * Parses a raw page { path, content } into clean structured data.
 *
 * @param {{ path: string, content: string }} page
 * @param {{ sourceRoot?: string }} options
 *   sourceRoot: folder name to strip from path for normalization.
 *   "expo-pages" for Expo, "zustand_docs_raw" for Zustand.
 * @returns {{ title: string, description: string, sourcePath: string, body: string }}
 */
export const cleanPage = (page, { sourceRoot = "expo-pages" } = {}) => {
  const { data: frontmatter, content: rawBody } = matter(page.content);

  // Detect file type — gates JSX stripping in stripMdxSyntax
  const isMdx = page.path.replace(/\\/g, "/").endsWith(".mdx");
  const body = stripMdxSyntax(rawBody, { isMdx });

  // Normalize path: strip everything up to and including sourceRoot/
  const normalizedPath = page.path
    .replace(/\\/g, "/")
    .split(`${sourceRoot}/`)
    .pop();

  // Zustand docs don't use frontmatter — fall back to first heading
  const title = frontmatter.title || extractFirstHeading(body) || "";

  return {
    title,
    description: frontmatter.description || "",
    sourcePath: normalizedPath,
    body,
  };
};
