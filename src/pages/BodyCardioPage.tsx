import { useState, useEffect } from 'react';
import {
  Scale,
  Activity,
  Plus,
  Heart,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { db } from '../db/db';
import type { BodyLog, CardioLog } from '../types';
import { useSettingsStore } from '../store/settingsStore';

export default function BodyCardioPage() {
  const { unit } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'body' | 'cardio'>('body');

  // Body logs state
  const [bodyLogs, setBodyLogs] = useState<BodyLog[]>([]);
  const [weightInput, setWeightInput] = useState<string>('');
  const [caloriesInput, setCaloriesInput] = useState<string>('');
  const [proteinInput, setProteinInput] = useState<string>('');
  const [waistInput, setWaistInput] = useState<string>('');
  const [chestInput, setChestInput] = useState<string>('');
  const [armInput, setArmInput] = useState<string>('');

  // Cardio logs state
  const [cardioLogs, setCardioLogs] = useState<CardioLog[]>([]);
  const [showCardioModal, setShowCardioModal] = useState<boolean>(false);
  const [cardioType, setCardioType] = useState<'treadmill' | 'bike' | 'rowing' | 'other'>('treadmill');
  const [cardioDuration, setCardioDuration] = useState<string>('30');
  const [cardioDistance, setCardioDistance] = useState<string>('3.5');
  const [cardioIncline, setCardioIncline] = useState<string>('12');
  const [cardioSpeed, setCardioSpeed] = useState<string>('4.8');
  const [cardioHeartRate, setCardioHeartRate] = useState<string>('135');
  const [cardioNotes, setCardioNotes] = useState<string>('LISS 12-3-30');

  const loadData = async () => {
    const bLogs = await db.bodyLogs.orderBy('date').toArray();
    setBodyLogs(bLogs);

    const cLogs = await db.cardioLogs.orderBy('date').reverse().toArray();
    setCardioLogs(cLogs);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save new body weight log
  const handleSaveBodyLog = async () => {
    const weightNum = parseFloat(weightInput);
    if (!weightNum || isNaN(weightNum)) {
      alert('Please enter a valid body weight');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const newLog: BodyLog = {
      id: `body-${today}-${Date.now()}`,
      date: today,
      weight: weightNum,
      unit,
      calories: caloriesInput ? parseInt(caloriesInput, 10) : undefined,
      protein: proteinInput ? parseInt(proteinInput, 10) : undefined,
      waistCm: waistInput ? parseFloat(waistInput) : undefined,
      chestCm: chestInput ? parseFloat(chestInput) : undefined,
      armCm: armInput ? parseFloat(armInput) : undefined,
    };

    await db.bodyLogs.put(newLog);
    setWeightInput('');
    setCaloriesInput('');
    setProteinInput('');
    setWaistInput('');
    setChestInput('');
    setArmInput('');
    loadData();
  };

  // Save new cardio log
  const handleSaveCardioLog = async () => {
    const durNum = parseInt(cardioDuration, 10);
    if (!durNum || isNaN(durNum)) return;

    const today = new Date().toISOString().slice(0, 10);
    const newCardio: CardioLog = {
      id: `cardio-${Date.now()}`,
      date: today,
      type: cardioType,
      durationMinutes: durNum,
      distanceKm: cardioDistance ? parseFloat(cardioDistance) : undefined,
      inclinePercent: cardioIncline ? parseFloat(cardioIncline) : undefined,
      speedKph: cardioSpeed ? parseFloat(cardioSpeed) : undefined,
      avgHeartRate: cardioHeartRate ? parseInt(cardioHeartRate, 10) : undefined,
      notes: cardioNotes,
    };

    await db.cardioLogs.put(newCardio);
    setShowCardioModal(false);
    loadData();
  };

  // Compute 7-day rolling average for body weight
  const chartPoints = bodyLogs.map((log: BodyLog, idx: number, arr: BodyLog[]) => {
    const slice = arr.slice(Math.max(0, idx - 6), idx + 1);
    const rollingAvg = slice.reduce((sum: number, item: BodyLog) => sum + item.weight, 0) / slice.length;
    return {
      date: log.date.slice(5),
      weight: log.weight,
      rollingAvg: parseFloat(rollingAvg.toFixed(2)),
    };
  });

  const latestLog = bodyLogs[bodyLogs.length - 1];
  const prevLog = bodyLogs.length > 1 ? bodyLogs[bodyLogs.length - 2] : null;
  const weightChange = latestLog && prevLog ? latestLog.weight - prevLog.weight : 0;

  return (
    <div style={{ minHeight: '100%', paddingBottom: 80, backgroundColor: '#000000' }}>
      <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#FAFAFA' }}>
            Body & Cardio
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#7C7C87' }}>
            Recomposition tracking & low-intensity steady-state cardio
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#141416',
            borderRadius: 12,
            padding: 4,
            border: '1px solid #232327',
            marginBottom: 20,
          }}
        >
          <button
            onClick={() => setActiveTab('body')}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: activeTab === 'body' ? '#2F8CFF' : 'transparent',
              color: activeTab === 'body' ? '#FAFAFA' : '#7C7C87',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Scale size={16} /> Body Weight & Recomp
          </button>
          <button
            onClick={() => setActiveTab('cardio')}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: activeTab === 'cardio' ? '#2F8CFF' : 'transparent',
              color: activeTab === 'cardio' ? '#FAFAFA' : '#7C7C87',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Activity size={16} /> LISS Cardio
          </button>
        </div>

        {activeTab === 'body' ? (
          /* ── BODY WEIGHT & RECOMP TAB ───────────────────────── */
          <div>
            {/* Quick Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              <div
                style={{
                  backgroundColor: '#141416',
                  borderRadius: 14,
                  padding: 16,
                  border: '1px solid #232327',
                }}
              >
                <div style={{ fontSize: 12, color: '#A1A1AA', fontWeight: 600 }}>Current Weight</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#FAFAFA', marginTop: 4 }}>
                  {latestLog ? `${latestLog.weight} ${unit}` : `— ${unit}`}
                </div>
                {latestLog && prevLog && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      marginTop: 4,
                      color: weightChange <= 0 ? '#2FD67B' : '#F59E0B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {weightChange <= 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                    {Math.abs(weightChange).toFixed(1)} {unit} from last log
                  </div>
                )}
              </div>

              <div
                style={{
                  backgroundColor: '#141416',
                  borderRadius: 14,
                  padding: 16,
                  border: '1px solid #232327',
                }}
              >
                <div style={{ fontSize: 12, color: '#A1A1AA', fontWeight: 600 }}>7-Day Rolling Trend</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#2F8CFF', marginTop: 4 }}>
                  {chartPoints.length > 0
                    ? `${chartPoints[chartPoints.length - 1].rollingAvg} ${unit}`
                    : `— ${unit}`}
                </div>
                <div style={{ fontSize: 11, color: '#7C7C87', marginTop: 4 }}>
                  Smoothed water balance
                </div>
              </div>
            </div>

            {/* 7-Day Rolling Trend Line Chart */}
            {chartPoints.length > 1 && (
              <div
                style={{
                  backgroundColor: '#141416',
                  borderRadius: 16,
                  padding: 16,
                  border: '1px solid #232327',
                  marginBottom: 18,
                }}
              >
                <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#FAFAFA' }}>
                  Weight & 7-Day Rolling Trend ({unit})
                </h3>
                <div style={{ width: '100%', height: 190 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartPoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#232327" />
                      <XAxis dataKey="date" stroke="#7C7C87" fontSize={11} />
                      <YAxis stroke="#7C7C87" fontSize={11} domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#141416', borderColor: '#232327', color: '#FAFAFA' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        name="Daily Weight"
                        stroke="#52525B"
                        strokeWidth={1}
                        dot={{ r: 2, fill: '#7C7C87' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rollingAvg"
                        name="7-Day Trend"
                        stroke="#2F8CFF"
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 6, fontSize: 11 }}>
                  <span style={{ color: '#7C7C87' }}>● Daily Scale Weight</span>
                  <span style={{ color: '#2F8CFF' }}>━ 7-Day Smoothed Trend</span>
                </div>
              </div>
            )}

            {/* Daily Log Input Box */}
            <div
              style={{
                backgroundColor: '#141416',
                borderRadius: 16,
                padding: 16,
                border: '1px solid #232327',
                marginBottom: 18,
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#FAFAFA' }}>
                Log Today's Body Metrics
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', marginBottom: 4 }}>
                    WEIGHT ({unit.toUpperCase()}) *
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="e.g. 78.4"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#000000',
                      border: '1px solid #232327',
                      borderRadius: 8,
                      color: '#FAFAFA',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', marginBottom: 4 }}>
                    PROTEIN (G)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 175"
                    value={proteinInput}
                    onChange={(e) => setProteinInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#000000',
                      border: '1px solid #232327',
                      borderRadius: 8,
                      color: '#FAFAFA',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#7C7C87', marginBottom: 4 }}>
                    WAIST (CM)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 82"
                    value={waistInput}
                    onChange={(e) => setWaistInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      backgroundColor: '#000000',
                      border: '1px solid #232327',
                      borderRadius: 8,
                      color: '#FAFAFA',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#7C7C87', marginBottom: 4 }}>
                    CHEST (CM)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 104"
                    value={chestInput}
                    onChange={(e) => setChestInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      backgroundColor: '#000000',
                      border: '1px solid #232327',
                      borderRadius: 8,
                      color: '#FAFAFA',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#7C7C87', marginBottom: 4 }}>
                    ARM (CM)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 38"
                    value={armInput}
                    onChange={(e) => setArmInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      backgroundColor: '#000000',
                      border: '1px solid #232327',
                      borderRadius: 8,
                      color: '#FAFAFA',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleSaveBodyLog}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 10,
                  backgroundColor: '#2F8CFF',
                  border: 'none',
                  color: '#FAFAFA',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Log Entry
              </button>
            </div>

            {/* Recent Body Logs Table */}
            {bodyLogs.length > 0 && (
              <div
                style={{
                  backgroundColor: '#141416',
                  borderRadius: 16,
                  padding: 16,
                  border: '1px solid #232327',
                }}
              >
                <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#FAFAFA' }}>
                  Log History
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[...bodyLogs].reverse().slice(0, 7).map((log: BodyLog) => (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        backgroundColor: '#000000',
                        borderRadius: 8,
                        border: '1px solid #232327',
                        fontSize: 12,
                      }}
                    >
                      <span style={{ color: '#A1A1AA' }}>{log.date}</span>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {log.protein && <span style={{ color: '#2FD67B' }}>{log.protein}g protein</span>}
                        {log.waistCm && <span style={{ color: '#7C7C87' }}>Waist: {log.waistCm}cm</span>}
                        <span style={{ fontWeight: 800, color: '#FAFAFA' }}>
                          {log.weight} {unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── LISS CARDIO TAB ────────────────────────────────── */
          <div>
            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#FAFAFA' }}>
                  Cardio Logs ({cardioLogs.length})
                </h2>
                <span style={{ fontSize: 12, color: '#7C7C87' }}>
                  Zone 2 and steady state conditioning
                </span>
              </div>

              <button
                onClick={() => setShowCardioModal(true)}
                style={{
                  backgroundColor: '#2FD67B',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Plus size={16} /> Log Cardio
              </button>
            </div>

            {/* Cardio History List */}
            {cardioLogs.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#141416',
                  borderRadius: 16,
                  padding: '36px 20px',
                  textAlign: 'center',
                  border: '1px dashed #232327',
                }}
              >
                <Activity size={36} color="#34343A" style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>
                  No cardio sessions logged yet
                </p>
                <p style={{ margin: '4px 0 16px', fontSize: 12, color: '#7C7C87' }}>
                  Track treadmill incline walks (12-3-30), stationary bike, or rowing.
                </p>
                <button
                  onClick={() => setShowCardioModal(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    backgroundColor: '#2FD67B',
                    border: 'none',
                    color: '#FAFAFA',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Log First Session
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cardioLogs.map((c: CardioLog) => (
                  <div
                    key={c.id}
                    style={{
                      backgroundColor: '#141416',
                      borderRadius: 14,
                      padding: 14,
                      border: '1px solid #232327',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: 'rgba(47,214,123, 0.15)',
                            color: '#2FD67B',
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {c.type}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#FAFAFA' }}>
                          {c.durationMinutes} min
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#7C7C87' }}>{c.date}</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        marginTop: 8,
                        fontSize: 12,
                        color: '#A1A1AA',
                        flexWrap: 'wrap',
                      }}
                    >
                      {c.distanceKm && <span>{c.distanceKm} km</span>}
                      {c.inclinePercent && <span>{c.inclinePercent}% Incline</span>}
                      {c.speedKph && <span>{c.speedKph} kph</span>}
                      {c.avgHeartRate && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#EF4444' }}>
                          <Heart size={12} fill="#EF4444" /> {c.avgHeartRate} bpm
                        </span>
                      )}
                    </div>

                    {c.notes && (
                      <div style={{ fontSize: 11, color: '#7C7C87', marginTop: 6, fontStyle: 'italic' }}>
                        "{c.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log Cardio Modal */}
      {showCardioModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowCardioModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: '#141416',
              borderRadius: 18,
              border: '1px solid #232327',
              padding: 20,
              color: '#FAFAFA',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>
              Log Cardio Session
            </h3>

            {/* Type selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {(['treadmill', 'bike', 'rowing', 'other'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setCardioType(t)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: cardioType === t ? '1px solid #2FD67B' : '1px solid #232327',
                    backgroundColor: cardioType === t ? 'rgba(47,214,123,0.15)' : '#000000',
                    color: cardioType === t ? '#2FD67B' : '#7C7C87',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', marginBottom: 4 }}>
                  DURATION (MIN) *
                </label>
                <input
                  type="number"
                  value={cardioDuration}
                  onChange={(e) => setCardioDuration(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#000000',
                    border: '1px solid #232327',
                    borderRadius: 8,
                    color: '#FAFAFA',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', marginBottom: 4 }}>
                  DISTANCE (KM)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={cardioDistance}
                  onChange={(e) => setCardioDistance(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#000000',
                    border: '1px solid #232327',
                    borderRadius: 8,
                    color: '#FAFAFA',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {cardioType === 'treadmill' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', marginBottom: 4 }}>
                    INCLINE (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={cardioIncline}
                    onChange={(e) => setCardioIncline(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#000000',
                      border: '1px solid #232327',
                      borderRadius: 8,
                      color: '#FAFAFA',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', marginBottom: 4 }}>
                    SPEED (KPH)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={cardioSpeed}
                    onChange={(e) => setCardioSpeed(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#000000',
                      border: '1px solid #232327',
                      borderRadius: 8,
                      color: '#FAFAFA',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', marginBottom: 4 }}>
                AVG HEART RATE (BPM)
              </label>
              <input
                type="number"
                value={cardioHeartRate}
                onChange={(e) => setCardioHeartRate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: '#000000',
                  border: '1px solid #232327',
                  borderRadius: 8,
                  color: '#FAFAFA',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A1A1AA', marginBottom: 4 }}>
                SESSION NOTES
              </label>
              <input
                type="text"
                placeholder="e.g. 12-3-30 incline, steady pace"
                value={cardioNotes}
                onChange={(e) => setCardioNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: '#000000',
                  border: '1px solid #232327',
                  borderRadius: 8,
                  color: '#FAFAFA',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowCardioModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 10,
                  backgroundColor: '#232327',
                  border: 'none',
                  color: '#FAFAFA',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCardioLog}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 10,
                  backgroundColor: '#2FD67B',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Save Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
