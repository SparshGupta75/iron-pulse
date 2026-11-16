import { useState } from 'react';
import { CalendarPlus, RefreshCw } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { fmtRest } from '../utils/format';
import { shareOrDownload } from '../utils/shareCard';
import { APP_VERSION, checkForUpdate } from '../utils/appUpdate';

const REST_CHOICES = [0, 60, 90, 120, 180];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const ICS_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

/** A weekly repeating calendar event with an alert, for the phone's own calendar app. */
function buildReminderIcs(days: number[], time: string): string {
  const [h, m] = time.split(':').map(Number);
  const p = (n: number) => String(n).padStart(2, '0');
  // First occurrence: the next selected weekday (today included).
  const d = new Date();
  for (let i = 0; i < 7 && !days.includes((d.getDay() + 6) % 7); i++) d.setDate(d.getDate() + 1);
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(h)}${p(m)}00`;
  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IronPulse//Workout Reminders//EN',
    'BEGIN:VEVENT',
    `UID:ironpulse-reminder-${Date.now()}@ironpulse`,
    `DTSTAMP:${now}`,
    `DTSTART:${stamp}`,
    'DURATION:PT1H',
    `RRULE:FREQ=WEEKLY;BYDAY=${days.map((i) => ICS_DAYS[i]).join(',')}`,
    'SUMMARY:Workout',
    'DESCRIPTION:Time to train. Open IronPulse and start your workout.',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Time to train',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{ width: 50, height: 30, borderRadius: 15, border: 0, padding: 3, background: on ? 'var(--green)' : 'var(--surface-3)', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
    >
      <span style={{ display: 'block', width: 24, height: 24, borderRadius: '50%', background: '#fff', transform: `translateX(${on ? 20 : 0}px)`, transition: 'transform 0.2s' }} />
    </button>
  );
}

/** Settings added on top of the original settings page: rest timer, reminders, app version. */
export function SettingsExtras() {
  const s = useSettingsStore();
  const [note, setNote] = useState('');
  const [checking, setChecking] = useState(false);

  const toggleNotify = async (on: boolean) => {
    setNote('');
    if (!on) return s.setRestNotify(false);
    if (!('Notification' in window)) return setNote('This browser does not support notifications.');
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission !== 'granted') return setNote('Notifications are blocked for this app. Allow them in your phone settings first.');
    s.setRestNotify(true);
  };

  const toggleDay = (i: number) =>
    s.setReminderDays(s.reminderDays.includes(i) ? s.reminderDays.filter((d) => d !== i) : [...s.reminderDays, i].sort());

  return (
    <div className="pad" style={{ paddingTop: 16, marginBottom: -4, display: 'grid', gap: 12 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Default Rest Timer</div>
        <div className="dim" style={{ fontSize: 13, margin: '2px 0 12px' }}>
          Used for exercises you add to a workout. Change it per exercise while logging.
        </div>
        <div className="seg">
          {REST_CHOICES.map((sec) => (
            <button key={sec} className={s.defaultRest === sec ? 'on' : ''} onClick={() => s.setDefaultRest(sec)} style={{ padding: 0 }}>
              {fmtRest(sec)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Rest-over notification</div>
            <div className="dim" style={{ fontSize: 13, marginTop: 2 }}>
              Alerts you when rest ends while you are in another app. The screen stays awake during workouts, so the sound and vibration work with the app open.
            </div>
          </div>
          <Toggle on={s.restNotify} onChange={toggleNotify} label="Rest-over notification" />
        </div>
        {note && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--yellow)' }}>{note}</div>
        )}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Workout Reminders</div>
        <div className="dim" style={{ fontSize: 13, margin: '2px 0 12px' }}>
          Pick your training days. Home shows a nudge on those days, and you can add a repeating reminder to your phone's calendar, which alerts you even when IronPulse is closed.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {DAYS.map((d, i) => {
            const on = s.reminderDays.includes(i);
            return (
              <button
                key={i}
                aria-pressed={on}
                onClick={() => toggleDay(i)}
                style={{ height: 40, borderRadius: 11, border: 0, background: on ? 'var(--accent)' : 'var(--surface-2)', color: on ? '#fff' : 'var(--text-2)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                {d}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '146px 1fr', gap: 10, marginTop: 12 }}>
          <input className="field" type="time" aria-label="Reminder time" value={s.reminderTime} onChange={(e) => s.setReminderTime(e.target.value || '18:00')} style={{ padding: '0 10px' }} />
          <button
            className="btn soft"
            disabled={s.reminderDays.length === 0}
            onClick={() =>
              shareOrDownload(new Blob([buildReminderIcs(s.reminderDays, s.reminderTime)], { type: 'text/calendar' }), 'ironpulse-reminders.ics', 'Workout reminders')
            }
          >
            <CalendarPlus size={18} /> Add to Calendar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>App Version</div>
          <div className="dim num" style={{ fontSize: 13, marginTop: 2 }}>
            Built {APP_VERSION}
          </div>
        </div>
        <button
          className="btn sm"
          disabled={checking}
          onClick={() => {
            setChecking(true);
            checkForUpdate();
          }}
        >
          <RefreshCw size={16} /> {checking ? 'Checking…' : 'Check for update'}
        </button>
      </div>
    </div>
  );
}
