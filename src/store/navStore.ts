import { create } from 'zustand';

export type Tab = 'home' | 'workout' | 'profile';

export type Screen =
  | { type: 'statistics' }
  | { type: 'measures' }
  | { type: 'settings' }
  | { type: 'calendar' }
  | { type: 'report' }
  | { type: 'exercises' }
  | { type: 'exercise'; id: string }
  | { type: 'routine'; id: string | null }
  | { type: 'workout'; id: string };

interface NavState {
  tab: Tab;
  stack: Screen[];
  /** True while the full-screen workout logger is expanded. */
  loggerOpen: boolean;
  /** Stack depth when the logger was opened; deeper screens sit above it. */
  loggerBase: number;
  /** Bumped after any database write so lists reload. */
  dataVersion: number;
  setTab: (tab: Tab) => void;
  push: (screen: Screen) => void;
  back: () => void;
  openLogger: () => void;
  closeLogger: () => void;
  bump: () => void;
}

const depthOf = (s: Pick<NavState, 'stack' | 'loggerOpen'>) => s.stack.length + (s.loggerOpen ? 1 : 0);

/**
 * Every pushed screen and the expanded logger own one browser-history entry
 * (tagged with its depth), so the phone's back gesture/button closes the top
 * layer instead of leaving the app.
 */
export const useNav = create<NavState>((set, get) => ({
  tab: 'home',
  stack: [],
  loggerOpen: false,
  loggerBase: 0,
  dataVersion: 0,
  setTab: (tab) => set({ tab }),
  push: (screen) => {
    history.pushState({ depth: depthOf(get()) + 1 }, '');
    set((s) => ({ stack: [...s.stack, screen] }));
  },
  back: () => history.back(),
  openLogger: () => {
    if (get().loggerOpen) return;
    history.pushState({ depth: depthOf(get()) + 1 }, '');
    set((s) => ({ loggerOpen: true, loggerBase: s.stack.length }));
  },
  closeLogger: () => {
    const { loggerOpen, stack, loggerBase } = get();
    // Also closes any screens that were opened on top of the logger.
    if (loggerOpen) history.go(-(stack.length - loggerBase + 1));
  },
  bump: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
}));

if (typeof window !== 'undefined') {
  history.replaceState({ depth: 0 }, '');
  window.addEventListener('popstate', (e) => {
    const target = Math.max(0, Number((e.state as { depth?: number } | null)?.depth ?? 0));
    let { loggerOpen, loggerBase, stack } = useNav.getState();
    // Peel layers off the top until we are at the depth this history entry recorded.
    while (stack.length + (loggerOpen ? 1 : 0) > target) {
      if (loggerOpen && stack.length <= loggerBase) loggerOpen = false;
      else stack = stack.slice(0, -1);
    }
    useNav.setState({ loggerOpen, stack });
  });
}
