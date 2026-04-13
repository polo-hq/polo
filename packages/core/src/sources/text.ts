import type { SourceAdapter } from "./interface.ts";

const TEXT_PATH = "text";

/**
 * A source adapter for a single inline string.
 */
export class TextAdapter implements SourceAdapter {
  private readonly text: string;

  constructor(text: string) {
    this.text = text;
  }

  describe(): string {
    return `Inline text source with one readable item at path \`${TEXT_PATH}\`.`;
  }

  async list(_path?: string): Promise<string[]> {
    return [TEXT_PATH];
  }

  async read(path: string): Promise<string> {
    if (path !== TEXT_PATH) {
      throw new Error(`Unknown path: ${path}. Available: ${TEXT_PATH}`);
    }

    return this.text;
  }
}
