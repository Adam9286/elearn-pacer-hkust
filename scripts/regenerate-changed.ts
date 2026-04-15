/**
 * regenerate-changed.ts — Smart regeneration based on content hashes
 *
 * Compares slide_explanations.source_content_hash against
 * lecture_slides_course.content_hash to find explanations that are
 * stale (generated from older slide content) and triggers regeneration
 * for those slides only.
 *
 * Usage:
 *   npx tsx scripts/regenerate-changed.ts <lecture-id>
 *   npx tsx scripts/regenerate-changed.ts --all
 *   npx tsx scripts/regenerate-changed.ts --dry-run <lecture-id>
 *
 * This script only REPORTS what needs regeneration. Actual regeneration
 * is triggered via the existing Supabase Edge Functions (same as the
 * admin UI "Regenerate" button).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// ENV
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
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const SUPABASE_URL = process.env.KNOWLEDGE_BASE_URL || process.env.VITE_KNOWLEDGE_BASE_URL || "";
const SUPABASE_KEY = process.env.KNOWLEDGE_BASE_ANON_KEY || process.env.VITE_KNOWLEDGE_BASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing KNOWLEDGE_BASE_URL / KNOWLEDGE_BASE_ANON_KEY");
  process.exit(1);
}

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// Change detection
// ---------------------------------------------------------------------------

interface ChangeReport {
  lectureId: string;
  totalSlides: number;
  staleSlides: number[];      // have explanation but content changed
  missingSlides: number[];    // have content but no explanation
  orphanedSlides: number[];   // have explanation but no source content
}

async function detectChanges(lectureId: string): Promise<ChangeReport> {
  // Fetch source content with hashes
  const { data: sourceSlides } = await supabase
    .from("lecture_slides_course")
    .select("slide_number, content_hash")
    .eq("lecture_id", lectureId)
    .order("slide_number");

  // Fetch existing explanations with their source hash
  const { data: explanations } = await supabase
    .from("slide_explanations")
    .select("slide_number, source_content_hash, status")
    .eq("lecture_id", lectureId)
    .order("slide_number");

  const sourceMap = new Map<number, string>();
  for (const s of sourceSlides || []) {
    sourceMap.set(s.slide_number, s.content_hash || "");
  }

  const explMap = new Map<number, { hash: string; status: string }>();
  for (const e of explanations || []) {
    explMap.set(e.slide_number, {
      hash: e.source_content_hash || "",
      status: e.status,
    });
  }

  const staleSlides: number[] = [];
  const missingSlides: number[] = [];
  const orphanedSlides: number[] = [];

  // Check each source slide
  for (const [slideNum, contentHash] of sourceMap) {
    const expl = explMap.get(slideNum);
    if (!expl) {
      missingSlides.push(slideNum);
    } else if (expl.hash && expl.hash !== contentHash) {
      staleSlides.push(slideNum);
    } else if (!expl.hash) {
      // Explanation exists but has no source_content_hash — was generated
      // before we added hashing. Consider it potentially stale.
      staleSlides.push(slideNum);
    }
  }

  // Check for orphaned explanations (slide removed from source)
  for (const slideNum of explMap.keys()) {
    if (!sourceMap.has(slideNum)) {
      orphanedSlides.push(slideNum);
    }
  }

  return {
    lectureId,
    totalSlides: sourceMap.size,
    staleSlides,
    missingSlides,
    orphanedSlides,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const filtered = args.filter(a => a !== "--dry-run");

  if (filtered.length === 0) {
    console.log(`
Usage:
  npx tsx scripts/regenerate-changed.ts <lecture-id>
  npx tsx scripts/regenerate-changed.ts --all
  npx tsx scripts/regenerate-changed.ts --dry-run <lecture-id>

Reports which slides need regeneration based on content hash comparison.
`);
    process.exit(0);
  }

  let lectureIds: string[];

  if (filtered[0] === "--all") {
    // Get all unique lecture IDs from source
    const { data } = await supabase
      .from("lecture_slides_course")
      .select("lecture_id")
      .order("lecture_id");

    const unique = new Set<string>();
    for (const row of data || []) unique.add(row.lecture_id);
    lectureIds = [...unique];
  } else {
    lectureIds = [filtered[0]];
  }

  console.log(`Checking ${lectureIds.length} lecture(s) for changes...\n`);

  let totalStale = 0;
  let totalMissing = 0;

  for (const id of lectureIds) {
    const report = await detectChanges(id);

    const needsWork = report.staleSlides.length > 0 || report.missingSlides.length > 0;
    const icon = needsWork ? "!" : "✓";

    console.log(`${icon} ${id}: ${report.totalSlides} slides`);

    if (report.staleSlides.length > 0) {
      console.log(`  Stale (content changed): slides ${report.staleSlides.join(", ")}`);
      totalStale += report.staleSlides.length;
    }
    if (report.missingSlides.length > 0) {
      console.log(`  Missing explanation: slides ${report.missingSlides.join(", ")}`);
      totalMissing += report.missingSlides.length;
    }
    if (report.orphanedSlides.length > 0) {
      console.log(`  Orphaned (no source): slides ${report.orphanedSlides.join(", ")}`);
    }
    if (!needsWork && report.orphanedSlides.length === 0) {
      console.log("  All explanations up to date");
    }
  }

  console.log(`\nSummary: ${totalStale} stale, ${totalMissing} missing across ${lectureIds.length} lectures`);

  if (totalStale + totalMissing > 0 && !dryRun) {
    console.log(`\nTo regenerate, use the admin UI or run:`);
    console.log(`  Admin panel: /admin-review-slides → select lecture → "Generate Missing" or "Regenerate"`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
