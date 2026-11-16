/** Build stamp injected by Vite, e.g. "17 Nov 2026, 09:41". */
export const APP_VERSION: string = __APP_VERSION__;

let checker: (() => Promise<unknown>) | null = null;
export const setUpdateChecker = (fn: () => Promise<unknown>) => {
  checker = fn;
};

/**
 * Ask the service worker for a newer build, then reload. If a new version was
 * found it takes over during the reload; otherwise the same version comes back.
 */
export async function checkForUpdate(): Promise<void> {
  try {
    await checker?.();
    // Give a freshly downloaded worker a moment to install before reloading.
    await new Promise((r) => setTimeout(r, 1500));
  } finally {
    location.reload();
  }
}
