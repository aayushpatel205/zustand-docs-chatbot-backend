import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const MAX_CHUNK_SIZE = 1000;   // chars — fallback split threshold
const CHUNK_OVERLAP = 150;     // chars — preserves context across split boundaries

/**
 * Splits cleaned markdown body into heading-aware sections.
 * Each section = one heading + all content until the next heading
 * of the same or higher level.
 */
function splitByHeadings(body) {
  const lines = body.split("\n");
  const sections = [];
  let current = { heading: null, level: 0, content: [] };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      // Flush the previous section before starting a new one
      if (current.content.length > 0 || current.heading) {
        sections.push(current);
      }
      current = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        content: [],
      };
    } else {
      current.content.push(line);
    }
  }
  if (current.content.length > 0 || current.heading) {
    sections.push(current);
  }

  return sections;
}

/**
 * Produces final chunks ready for embedding.
 * Sections under MAX_CHUNK_SIZE stay whole.
 * Oversized sections get a second pass of character-based splitting,
 * with the heading prepended to each sub-chunk so context isn't lost.
 */
export async function chunkMarkdown(body, { title } = {}) {
  const sections = splitByHeadings(body);
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: MAX_CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    separators: ["\n\n", "\n", ". ", " "],
  });

  const chunks = [];

  for (const section of sections) {
    const sectionText = section.content.join("\n").trim();
    if (!sectionText) continue;

    // Prepend page title + heading so every chunk is self-describing
    // even when read in isolation (important once it's retrieved later).
    const contextPrefix = [title, section.heading]
      .filter(Boolean)
      .join(" — ");
    const fullText = contextPrefix
      ? `${contextPrefix}\n\n${sectionText}`
      : sectionText;

    if (fullText.length <= MAX_CHUNK_SIZE) {
      chunks.push({ text: fullText, heading: section.heading });
    } else {
      // Oversized section: fall back to character splitting
      const subChunks = await splitter.splitText(sectionText);
      for (const sub of subChunks) {
        const subWithPrefix = contextPrefix
          ? `${contextPrefix}\n\n${sub}`
          : sub;
        chunks.push({ text: subWithPrefix, heading: section.heading });
      }
    }
  }

  return chunks;
}