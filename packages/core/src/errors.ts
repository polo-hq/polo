export class RequiredSourceMissingError extends Error {
  readonly sourceKey: string;

  constructor(sourceKey: string, taskId: string) {
    super(
      `Required source "${sourceKey}" resolved to null or undefined in task "${taskId}". ` +
        `Mark it as "prefer" if it is optional, or ensure the source always resolves.`,
    );
    this.name = "RequiredSourceMissingError";
    this.sourceKey = sourceKey;
  }
}

export class SourceResolutionError extends Error {
  readonly sourceKey: string;
  readonly cause: unknown;

  constructor(sourceKey: string, taskId: string, cause: unknown) {
    super(`Source "${sourceKey}" threw during resolution in task "${taskId}": ${String(cause)}`);
    this.name = "SourceResolutionError";
    this.sourceKey = sourceKey;
    this.cause = cause;
  }
}
