import { ripgrep } from "ripgrep";

export async function grepCorpus(
  sourceRoot: string,
  pattern: string,
  options: {
    fileExtensions?: string[];
    include?: string[];
    exclude?: string[];
  } = {},
): Promise<string> {
  const args = ["--json", "--max-count", "5"];

  for (const extension of options.fileExtensions ?? []) {
    args.push("--glob", `**/*.${extension.replace(/^\./, "")}`);
  }

  for (const include of options.include ?? []) {
    args.push("--glob", include);
  }

  for (const exclude of options.exclude ?? []) {
    args.push("--glob", `!${exclude}`);
  }

  args.push("--", pattern, ".");

  try {
    const result = await ripgrep(args, {
      buffer: true,
      preopens: { ".": sourceRoot },
    });

    if (result.code === 2) {
      throw new Error(`ripgrep failed for pattern: ${pattern}`);
    }

    return formatRipgrepJson(result.stdout);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

interface RgLine {
  type: string;
  data?: {
    path?: { text?: string } | null;
    lines?: { text?: string };
    line_number?: number | null;
  };
}

function formatRipgrepJson(stdout: string): string {
  const lines: string[] = [];

  for (const rawLine of stdout.split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    let parsed: RgLine;
    try {
      parsed = JSON.parse(trimmed) as RgLine;
    } catch {
      continue;
    }

    if (parsed.type !== "match") continue;
    const filePath = parsed.data?.path?.text;
    const lineNumber = parsed.data?.line_number;
    const content = parsed.data?.lines?.text?.trimEnd();

    if (!filePath || lineNumber == null || content == null) continue;
    lines.push(`${filePath}:${lineNumber}: ${content}`);
  }

  return lines.length > 0 ? lines.join("\n") : "No matches found.";
}
