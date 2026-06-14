import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  ComposedChart,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import type { Feeding, Rest, WeightEntry } from '../types';
import { localDateOf, formatMinutes } from '../utils/dateUtils';
import { getRestDurationMinutes } from '../utils/feedingUtils';

type Period = '7d' | '14d' | '30d';

interface Props {
  feedings: Feeding[];
  rests:    Rest[];
  weights:  WeightEntry[];
}

// ── Data helpers ──────────────────────────────────────────────────────────────

function shortDate(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short',
  });
}

function getPastDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return localDateOf(d.toISOString());
  });
}

function getDailyData(feedings: Feeding[], rests: Rest[], period: Period) {
  const n = period === '7d' ? 7 : period === '14d' ? 14 : 30;
  return getPastDays(n).map(date => {
    const df = feedings.filter(f => localDateOf(f.timestamp) === date);
    const dr = rests.filter(r => localDateOf(r.startTime) === date && r.endTime != null);

    const ml        = df.reduce((s, f) => s + (f.supplementMl ?? 0), 0);
    const breastMin = df.reduce((s, f) => s + (f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0), 0);
    const avgRest   = dr.length > 0
      ? Math.round(dr.reduce((s, r) => s + (getRestDurationMinutes(r) ?? 0), 0) / dr.length)
      : undefined;

    return {
      date,
      label:    shortDate(date),
      ml:       ml > 0       ? ml        : undefined,
      breastMin: breastMin > 0 ? breastMin : undefined,
      avgRest,
      tomas:    df.length > 0 ? df.length : undefined,
    };
  });
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}{unit ?? ''}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Period selector ───────────────────────────────────────────────────────────

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1.5 mb-4">
      {(['7d', '14d', '30d'] as Period[]).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            value === p ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {p === '7d' ? '7 días' : p === '14d' ? '14 días' : '30 días'}
        </button>
      ))}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function ChartSection({ title, empty, children }: {
  title: string; empty: boolean; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {empty ? (
        <p className="text-xs text-gray-400 text-center py-6">Sin datos en este período</p>
      ) : children}
    </div>
  );
}

const TICK_STYLE = { fontSize: 10, fill: '#9ca3af' };

// ── Charts ────────────────────────────────────────────────────────────────────

export default function ChartsView({ feedings, rests, weights }: Props) {
  const [period, setPeriod] = useState<Period>('14d');
  const daily = getDailyData(feedings, rests, period);

  const weightData = [...weights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(w => ({ label: shortDate(w.date), kg: w.weightKg }));

  const hasMl       = daily.some(d => d.ml != null);
  const hasBreast   = daily.some(d => d.breastMin != null);
  const hasRest     = daily.some(d => d.avgRest != null);
  const hasTomas    = daily.some(d => d.tomas != null);
  const hasWeight   = weightData.length >= 2;

  // X axis tick interval based on period
  const tickInterval = period === '30d' ? 4 : period === '14d' ? 1 : 0;

  return (
    <div>
      {/* ── Peso ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">⚖️ Evolución del peso</h3>
        {!hasWeight ? (
          <p className="text-xs text-gray-400 text-center py-6">
            Añade al menos 2 registros de peso en la pestaña Mi bebé.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={TICK_STYLE} interval="preserveStartEnd" />
              <YAxis
                tick={TICK_STYLE}
                domain={['auto', 'auto']}
                tickFormatter={v => `${v}kg`}
              />
              <Tooltip content={<ChartTooltip unit=" kg" />} />
              <Line
                type="monotone"
                dataKey="kg"
                name="Peso"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 4, fill: '#2563eb' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Period selector for time-based charts */}
      <PeriodSelector value={period} onChange={setPeriod} />

      {/* ── Alimentación diaria ────────────────────────────────────────── */}
      <ChartSection title="🍼 Alimentación diaria" empty={!hasMl && !hasBreast}>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={daily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={TICK_STYLE} interval={tickInterval} />
            <YAxis tick={TICK_STYLE} />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              iconType="square"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
            {hasMl && (
              <Bar dataKey="ml" name="Jeringa (ml)" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={24} />
            )}
            {hasBreast && (
              <Bar dataKey="breastMin" name="Pecho (min)" fill="#ec4899" radius={[3, 3, 0, 0]} maxBarSize={24} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* ── Tomas por día ─────────────────────────────────────────────── */}
      <ChartSection title="🍼 Tomas por día" empty={!hasTomas}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={daily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={TICK_STYLE} interval={tickInterval} />
            <YAxis tick={TICK_STYLE} allowDecimals={false} />
            <Tooltip content={<ChartTooltip unit=" tomas" />} />
            <Bar dataKey="tomas" name="Tomas" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* ── Sueño medio ────────────────────────────────────────────── */}
      <ChartSection title="😴 Sueño medio por día" empty={!hasRest}>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={daily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={TICK_STYLE} interval={tickInterval} />
            <YAxis
              tick={TICK_STYLE}
              tickFormatter={v => v >= 60 ? `${Math.floor(v / 60)}h` : `${v}m`}
            />
            <Tooltip
              content={(props: any) => {
                const { active, payload, label } = props;
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-md text-xs">
                    <p className="font-semibold text-gray-700 mb-1">{label}</p>
                    <p style={{ color: '#9333ea' }}>
                      Media: <strong>{formatMinutes(payload[0].value)}</strong>
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="avgRest" name="Sueño (min)" fill="#9333ea" radius={[3, 3, 0, 0]} maxBarSize={24} />
            <Line
              type="monotone"
              dataKey="avgRest"
              stroke="#9333ea"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 text-center mt-2">Media de sueños completados</p>
      </ChartSection>
    </div>
  );
}
