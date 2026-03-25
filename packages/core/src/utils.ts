let counter = 0;

export function generateRunId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 7);
  const seq = (++counter).toString(36).padStart(3, "0");
  return `run_${timestamp}_${random}_${seq}`;
}
