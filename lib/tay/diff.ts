/** Dependency-free line diff used to preview proposed changes. */
import type { ApprovalSlide } from "./types";

export type DiffLineKind = "context" | "add" | "remove";

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
  /** 1-based line number in the old file, when the line exists there. */
  oldLine: number | null;
  /** 1-based line number in the new file, when the line exists there. */
  newLine: number | null;
}

export interface DiffSummary {
  added: number;
  removed: number;
  unchanged: number;
  lines: DiffLine[];
  truncated: boolean;
}

const MAX_DIFF_LINES = 600;

/** Longest-common-subsequence line diff; file sizes here are small and bounded. */
export function diffLines(before: string, after: string): DiffSummary {
  const oldLines = splitLines(before);
  const newLines = splitLines(after);
  const rows = oldLines.length;
  const columns = newLines.length;

  // Guard: an enormous file pair would need an enormous table.
  if (rows * columns > 4_000_000) {
    return {
      added: newLines.length,
      removed: oldLines.length,
      unchanged: 0,
      lines: [
        ...oldLines.slice(0, 50).map<DiffLine>((text, index) => ({ kind: "remove", text, oldLine: index + 1, newLine: null })),
        ...newLines.slice(0, 50).map<DiffLine>((text, index) => ({ kind: "add", text, oldLine: null, newLine: index + 1 })),
      ],
      truncated: true,
    };
  }

  const table: Uint32Array = new Uint32Array((rows + 1) * (columns + 1));
  const at = (i: number, j: number) => i * (columns + 1) + j;
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = columns - 1; j >= 0; j--) {
      table[at(i, j)] =
        oldLines[i] === newLines[j]
          ? table[at(i + 1, j + 1)]! + 1
          : Math.max(table[at(i + 1, j)]!, table[at(i, j + 1)]!);
    }
  }

  const lines: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  let i = 0;
  let j = 0;
  while (i < rows && j < columns) {
    if (oldLines[i] === newLines[j]) {
      lines.push({ kind: "context", text: oldLines[i]!, oldLine: i + 1, newLine: j + 1 });
      unchanged++;
      i++;
      j++;
    } else if (table[at(i + 1, j)]! >= table[at(i, j + 1)]!) {
      lines.push({ kind: "remove", text: oldLines[i]!, oldLine: i + 1, newLine: null });
      removed++;
      i++;
    } else {
      lines.push({ kind: "add", text: newLines[j]!, oldLine: null, newLine: j + 1 });
      added++;
      j++;
    }
  }
  while (i < rows) {
    lines.push({ kind: "remove", text: oldLines[i]!, oldLine: i + 1, newLine: null });
    removed++;
    i++;
  }
  while (j < columns) {
    lines.push({ kind: "add", text: newLines[j]!, oldLine: null, newLine: j + 1 });
    added++;
    j++;
  }

  const truncated = lines.length > MAX_DIFF_LINES;
  return {
    added,
    removed,
    unchanged,
    lines: truncated ? lines.slice(0, MAX_DIFF_LINES) : lines,
    truncated,
  };
}

function splitLines(value: string): string[] {
  if (value === "") return [];
  const normalized = value.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Renders a compact unified-diff style string for logs and copy buttons. */
export function renderUnifiedDiff(path: string, summary: DiffSummary): string {
  const body = summary.lines
    .map((line) => `${line.kind === "add" ? "+" : line.kind === "remove" ? "-" : " "}${line.text}`)
    .join("\n");
  return `--- a/${path}\n+++ b/${path}\n${body}${summary.truncated ? "\n… preview truncated" : ""}`;
}

export function clip(value: string, max = 2000): string {
  return value.length <= max ? value : `${value.slice(0, max)}\n… (${value.length - max} more characters)`;
}

/**
 * Builds the short slideshow a human sees before approving a change:
 * what will happen, the concrete result, and the effect on the file.
 */
export function buildChangeSlides(input: {
  action: string;
  path: string | null;
  summary: string;
  before: string | null;
  after: string;
  diff?: DiffSummary | null;
}): ApprovalSlide[] {
  const slides: ApprovalSlide[] = [
    {
      title: "What this does",
      caption: input.action,
      lines: wrap(input.summary, 64),
      tone: "neutral",
    },
  ];

  if (input.path) {
    slides.push({
      title: input.before === null ? `New file: ${input.path}` : `Updated file: ${input.path}`,
      caption: input.before === null ? "The file will be created in this project." : "The file will be replaced with the content below.",
      lines: clip(input.after, 1200).split("\n").slice(0, 40),
      tone: "add",
    });
  }

  if (input.diff) {
    const changed = input.diff.lines.filter((line) => line.kind !== "context").slice(0, 40);
    slides.push({
      title: "Change preview",
      caption: `${input.diff.added} line${input.diff.added === 1 ? "" : "s"} added · ${input.diff.removed} removed`,
      lines: changed.length
        ? changed.map((line) => `${line.kind === "add" ? "+" : "-"}${line.text}`)
        : ["No textual change."],
      tone: "remove",
    });
  } else {
    slides.push({
      title: "Result",
      caption: "This is the content that will be saved.",
      lines: clip(input.after, 1200).split("\n").slice(0, 40),
      tone: "add",
    });
  }

  return slides;
}

function wrap(value: string, width: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [value];
}
