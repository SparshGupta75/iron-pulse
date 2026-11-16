import { useEffect, useState, type ReactNode } from 'react';
import { House, Dumbbell, CircleUser } from 'lucide-react';
import { initDb } from './db/initDb';
import { db } from './db/db';
import type { RoutineFolder } from './types';
import { useNav, type Screen, type Tab } from './store/navStore';
import HomePage from './pages/HomePage';
import WorkoutTab, { useStartWorkout } from './pages/WorkoutTab';
import ProfilePage from './pages/ProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import BodyCardioPage from './pages/BodyCardioPage';
import SettingsPage from './pages/SettingsPage';
import CalendarPage from './pages/CalendarPage';
import WorkoutDetailPage from './pages/WorkoutDetailPage';
import { RoutineDetailPage } from './pages/RoutineDetailPage';
import { ExerciseDetailPage } from './pages/ExerciseDetailPage';
import AddExerciseModal from './components/workout/AddExerciseModal';
import CreateExerciseModal from './components/routines/CreateExerciseModal';
import ActiveWorkout, { MiniBar } from './components/workout/ActiveWorkout';
import { BackBar } from './components/ui';
import { useSettingsStore } from './store/settingsStore';
import { fmtRest } from './utils/format';

const TABS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: 'home', label: 'Home', Icon: House },
  { id: 'workout', label: 'Workout', Icon: Dumbbell },
  { id: 'profile', label: 'Profile', Icon: CircleUser },
];

/** Existing full pages get a slim back bar and their own scroll area. */
function Framed({ children }: { children: ReactNode }) {
  const bump = useNav((s) => s.bump);
  // These pages write to the database directly; refresh the tabs when leaving.
  useEffect(() => () => bump(), [bump]);
  return (
    <>
      <BackBar />
      <div className="scroll">{children}</div>
    </>
  );
}

const REST_CHOICES = [0, 60, 90, 120, 180];

function RestDefaultCard() {
  const { defaultRest, setDefaultRest } = useSettingsStore();
  return (
    <div className="pad" style={{ paddingTop: 16, marginBottom: -4 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Default Rest Timer</div>
        <div className="dim" style={{ fontSize: 13, margin: '2px 0 12px' }}>
          Used for exercises you add to a workout. Change it per exercise while logging.
        </div>
        <div className="seg">
          {REST_CHOICES.map((sec) => (
            <button key={sec} className={defaultRest === sec ? 'on' : ''} onClick={() => setDefaultRest(sec)} style={{ padding: 0 }}>
              {fmtRest(sec)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoutineScreen({ id }: { id: string | null }) {
  const { back, bump, dataVersion } = useNav();
  const { start, dialog } = useStartWorkout();
  const [folders, setFolders] = useState<RoutineFolder[]>([]);
  useEffect(() => {
    db.settings.get('routineFolders').then((f) => setFolders(Array.isArray(f?.value) ? (f.value as RoutineFolder[]) : []));
  }, [dataVersion]);
  return (
    <div className="scroll">
      <RoutineDetailPage
        routineId={id}
        folders={folders}
        onBack={back}
        onSaved={() => (bump(), back())}
        onStartWorkout={(r) => (back(), setTimeout(() => start(r), 60))}
      />
      {dialog}
    </div>
  );
}

function ExercisesScreen() {
  const { back, push, bump } = useNav();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <AddExerciseModal
        title="Exercises"
        onSelect={(ex) => push({ type: 'exercise', id: ex.id })}
        onClose={back}
        onCreateNew={() => setCreating(true)}
      />
      {creating && <CreateExerciseModal onCreated={() => (bump(), setCreating(false))} onClose={() => setCreating(false)} />}
    </>
  );
}

function renderScreen(screen: Screen) {
  switch (screen.type) {
    case 'statistics':
      return <Framed><AnalyticsPage /></Framed>;
    case 'measures':
      return <Framed><BodyCardioPage /></Framed>;
    case 'settings':
      return <Framed><RestDefaultCard /><SettingsPage /></Framed>;
    case 'calendar':
      return <CalendarPage />;
    case 'exercises':
      return <ExercisesScreen />;
    case 'exercise':
      return <div className="scroll"><ExerciseDetailPage exerciseId={screen.id} onBack={() => useNav.getState().back()} /></div>;
    case 'routine':
      return <RoutineScreen id={screen.id} />;
    case 'workout':
      return <WorkoutDetailPage id={screen.id} />;
  }
}

export default function App() {
  const { tab, setTab, stack, loggerOpen, loggerBase, bump } = useNav();

  useEffect(() => {
    initDb().then(bump).catch(console.error);
  }, [bump]);

  return (
    <div className="app">
      {tab === 'home' && <HomePage />}
      {tab === 'workout' && <WorkoutTab />}
      {tab === 'profile' && <ProfilePage />}

      <MiniBar />

      <nav className="tabbar">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            <Icon size={24} strokeWidth={tab === id ? 2.4 : 1.9} />
            {label}
          </button>
        ))}
      </nav>

      {stack.map((screen, i) => (
        <div key={i} className="screen" style={{ zIndex: loggerOpen && i >= loggerBase ? 48 : 30 }}>
          {renderScreen(screen)}
        </div>
      ))}

      <ActiveWorkout />
    </div>
  );
}
