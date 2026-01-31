let resolveAuthReady: (() => void) | null = null;

export const authReady = new Promise<void>((resolve) => {
  resolveAuthReady = resolve;
});

export function markAuthReady() {
  resolveAuthReady?.();
  resolveAuthReady = null;
}
