/**
 * extract-slides.ts — PDF → lecture_slides_course pipeline
 *
 * Extracts text per page from a lecture PDF and upserts into the
 * `lecture_slides_course` table in examSupabase. Computes a content
 * hash per slide so future runs can detect changes.
 *
 * Usage:
 *   npx tsx scripts/extract-slides.ts <pdf-path> <lecture-id>
 *   npx tsx scripts/extract-slides.ts slides/02-Web.pdf 02-Web
 *   npx tsx scripts/extract-slides.ts --all slides/       # batch mode
 *   npx tsx scripts/extract-slides.ts --dry-run slides/02-Web.pdf 02-Web
 *
 * Environment:
 *   KNOWLEDGE_BASE_URL       — examSupabase URL
 *   KNOWLEDGE_BASE_ANON_KEY  — examSupabase anon key
 *
 * These are read from ../.env (without VITE_ prefix) or can be
 * exported directly.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// ENV loading (minimal — no dotenv dependency)
// ---------------------------------------------------------------------------

function loadEnv(): void {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnv();

// Map VITE_ prefixed vars to non-prefixed equivalents for script use
const SUPABASE_URL =
  process.env.KNOWLEDGE_BASE_URL ||
  process.env.VITE_KNOWLEDGE_BASE_URL ||
  "";
const SUPABASE_KEY =
  process.env.KNOWLEDGE_BASE_ANON_KEY ||
  process.env.VITE_KNOWLEDGE_BASE_ANON_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing KNOWLEDGE_BASE_URL or KNOWLEDGE_BASE_ANON_KEY.\n" +
      "Set them in .env or export them directly."
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Supabase client (lightweight — just REST calls, no full SDK needed in Node)
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// PDF text extraction via pdfjs-dist
// ---------------------------------------------------------------------------

async function extractPagesText(pdfPath: string): Promise<string[]> {
  // Dynamic import to handle ESM/CJS properly
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item: any) => "str" in item)
      .map((item: any) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(text);
  }

  return pages;
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

function contentHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Supabase upsert
// ---------------------------------------------------------------------------

interface SlideRow {
  lecture_id: string;
  slide_number: number;
  content: string;
  content_hash: string;
  word_count: number;
  is_diagram_heavy: boolean;
}

function isDiagramHeavy(text: string): boolean {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 30) return true;
  // Many short fragments suggest labels/diagrams rather than prose
  const lines = text.split(/[.!?]/).filter((l) => l.trim().length > 0);
  const avgLen =
    lines.reduce((s, l) => s + l.trim().length, 0) / (lines.length || 1);
  if (avgLen < 20 && lines.length > 3) return true;
  return false;
}

async function upsertSlides(
  lectureId: string,
  pages: string[],
  dryRun: boolean
): Promise<{ inserted: number; updated: number; unchanged: number }> {
  const rows: SlideRow[] = pages.map((text, i) => ({
    lecture_id: lectureId,
    slide_number: i + 1,
    content: text,
    content_hash: contentHash(text),
    word_count: text.split(/\s+/).filter(Boolean).length,
    is_diagram_heavy: isDiagramHeavy(text),
  }));

  if (dryRun) {
    console.log(`\n[DRY RUN] Would upsert ${rows.length} slides for ${lectureId}`);
    for (const r of rows) {
      const flag = r.is_diagram_heavy ? " [DIAGRAM]" : "";
      console.log(
        `  Slide ${r.slide_number}: ${r.word_count} words, hash=${r.content_hash}${flag}`
      );
      if (r.word_count > 0) {
        console.log(`    Preview: ${r.content.slice(0, 120)}...`);
      }
    }
    return { inserted: rows.length, updated: 0, unchanged: 0 };
  }

  // Fetch existing hashes to detect changes
  const { data: existing } = await supabase
    .from("lecture_slides_course")
    .select("slide_number, content_hash")
    .eq("lecture_id", lectureId);

  const existingMap = new Map<number, string>();
  for (const row of existing || []) {
    existingMap.set(row.slide_number, row.content_hash || "");
  }

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const prevHash = existingMap.get(row.slide_number);
    if (prevHash === row.content_hash) {
      unchanged++;
      continue;
    }

    const { error } = await supabase.from("lecture_slides_course").upsert(
      {
        lecture_id: row.lecture_id,
        slide_number: row.slide_number,
        content: row.content,
        content_hash: row.content_hash,
        word_count: row.word_count,
        is_diagram_heavy: row.is_diagram_heavy,
      },
      { onConflict: "lecture_id,slide_number" }
    );

    if (error) {
      console.error(
        `  Error upserting slide ${row.slide_number}:`,
        error.message
      );
    } else {
      if (prevHash === undefined) inserted++;
      else updated++;
    }
  }

  // Remove slides that no longer exist (e.g., PDF got shorter)
  const currentMax = rows.length;
  const staleSlides = [...existingMap.keys()].filter((n) => n > currentMax);
  if (staleSlides.length > 0) {
    const { error } = await supabase
      .from("lecture_slides_course")
      .delete()
      .eq("lecture_id", lectureId)
      .gt("slide_number", currentMax);

    if (error) {
      console.error(`  Error removing stale slides:`, error.message);
    } else {
      console.log(`  Removed ${staleSlides.length} stale slides (>${currentMax})`);
    }
  }

  return { inserted, updated, unchanged };
}

// ---------------------------------------------------------------------------
// Batch mode: process all PDFs in a directory
// ---------------------------------------------------------------------------

function inferLectureId(filename: string): string | null {
  // Match patterns like "01-Introduction.pdf", "02-Web.pdf"
  const match = filename.match(/^(\d{2}[-_].+)\.pdf$/i);
  return match ? match[1] : null;
}

async function batchProcess(dir: string, dryRun: boolean): Promise<void> {
  const absDir = path.resolve(dir);
  if (!fs.existsSync(absDir)) {
    console.error(`Directory not found: ${absDir}`);
    process.exit(1);
  }

  const pdfs = fs
    .readdirSync(absDir)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .sort();

  if (pdfs.length === 0) {
    console.error(`No PDF files found in ${absDir}`);
    process.exit(1);
  }

  console.log(`Found ${pdfs.length} PDFs in ${absDir}\n`);

  for (const pdf of pdfs) {
    const lectureId = inferLectureId(pdf);
    if (!lectureId) {
      console.log(`  Skipping ${pdf} — can't infer lecture ID`);
      continue;
    }

    console.log(`Processing: ${pdf} → ${lectureId}`);
    const pdfPath = path.join(absDir, pdf);
    await processSinglePdf(pdfPath, lectureId, dryRun);
    console.log("");
  }
}

// ---------------------------------------------------------------------------
// Single PDF processing
// ---------------------------------------------------------------------------

async function processSinglePdf(
  pdfPath: string,
  lectureId: string,
  dryRun: boolean
): Promise<void> {
  const absPath = path.resolve(pdfPath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  console.log(`  Extracting text from ${path.basename(absPath)}...`);
  const pages = await extractPagesText(absPath);
  console.log(`  Extracted ${pages.length} pages`);

  // Summary stats
  const totalWords = pages.reduce(
    (s, p) => s + p.split(/\s+/).filter(Boolean).length,
    0
  );
  const diagramCount = pages.filter((p) => isDiagramHeavy(p)).length;
  const emptyCount = pages.filter(
    (p) => p.split(/\s+/).filter(Boolean).length === 0
  ).length;

  console.log(
    `  Stats: ${totalWords} total words, ${diagramCount} diagram-heavy slides, ${emptyCount} empty slides`
  );

  const result = await upsertSlides(lectureId, pages, dryRun);
  console.log(
    `  Result: ${result.inserted} inserted, ${result.updated} updated, ${result.unchanged} unchanged`
  );
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const filteredArgs = args.filter((a) => a !== "--dry-run");

  if (dryRun) {
    console.log("=== DRY RUN MODE — no database writes ===\n");
  }

  if (filteredArgs[0] === "--all") {
    const dir = filteredArgs[1];
    if (!dir) {
      console.error("Usage: extract-slides.ts --all <directory>");
      process.exit(1);
    }
    await batchProcess(dir, dryRun);
  } else if (filteredArgs.length === 2) {
    const [pdfPath, lectureId] = filteredArgs;
    await processSinglePdf(pdfPath, lectureId, dryRun);
  } else {
    console.log(`
Usage:
  npx tsx scripts/extract-slides.ts <pdf-path> <lecture-id>
  npx tsx scripts/extract-slides.ts --all <directory>
  npx tsx scripts/extract-slides.ts --dry-run <pdf-path> <lecture-id>

Examples:
  npx tsx scripts/extract-slides.ts slides/02-Web.pdf 02-Web
  npx tsx scripts/extract-slides.ts --all slides/
  npx tsx scripts/extract-slides.ts --dry-run slides/02-Web.pdf 02-Web

Environment (read from .env):
  VITE_KNOWLEDGE_BASE_URL       — examSupabase URL
  VITE_KNOWLEDGE_BASE_ANON_KEY  — examSupabase anon key
`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
