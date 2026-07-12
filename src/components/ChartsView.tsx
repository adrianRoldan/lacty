import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  ComposedChart,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import type { Feeding, Rest, WeightEntry, HeightEntry, HeadCircEntry } from '../types';
import { localDateOf, formatMinutes } from '../utils/dateUtils';
import { getRestDurationMinutes, restMinutesOnDay } from '../utils/feedingUtils';
import { getWeightPercentiles, getLengthPercentiles, getHeadCircPercentiles } from '../data/whoPercentiles';
import { useTheme } from '../theme';

type Period = '7d' | '14d' | '30d';

interface Props {
  feedings: Feeding[];
  rests:    Rest[];
  weights:  WeightEntry[];
  heights:  HeightEntry[];
  headCircs: HeadCircEntry[];
  birthDate?: string;
  sex?: 'male' | 'female';
  onGoToProfile?: () => void;
  scrollTo?: string | null;
  onScrolled?: () => void;
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
    const bottleMl  = df.reduce((s, f) => s + (f.bottleMl ?? 0), 0);
    const breastMin = df.reduce((s, f) => s + (f.breastMinLeft ?? 0) + (f.breastMinRight ?? 0), 0);
    const avgRest   = dr.length > 0
      ? Math.round(dr.reduce((s, r) => s + (getRestDurationMinutes(r) ?? 0), 0) / dr.length)
      : undefined;
    // Total de sueño del día: cada sueño aporta solo su tramo dentro del día
    // (los que cruzan medianoche reparten minutos entre los dos días).
    const totalRest = rests.reduce((s, r) => s + restMinutesOnDay(r, date), 0);

    return {
      date,
      label:    shortDate(date),
      ml:       ml > 0       ? ml        : undefined,
      bottleMl: bottleMl > 0 ? bottleMl  : undefined,
      breastMin: breastMin > 0 ? breastMin : undefined,
      avgRest,
      totalRest: totalRest > 0 ? totalRest : undefined,
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

function ageInMonths(birthDate: string, date: string): number {
  const b = new Date(birthDate + 'T12:00:00');
  const d = new Date(date + 'T12:00:00');
  return (d.getTime() - b.getTime()) / (30.4375 * 24 * 60 * 60 * 1000);
}

export default function ChartsView({ feedings, rests, weights, heights, headCircs, birthDate, sex, onGoToProfile, scrollTo, onScrolled }: Props) {
  const { theme } = useTheme();
  const gridStroke = theme === 'dark' ? '#2b2f29' : '#f3f4f6';
  const [period, setPeriod] = useState<Period>('14d');
  const daily = getDailyData(feedings, rests, period);

  // Desplazarse a una gráfica concreta cuando se llega desde un enlace directo.
  useEffect(() => {
    if (!scrollTo) return;
    const t = setTimeout(() => {
      document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onScrolled?.();
    }, 80);
    return () => clearTimeout(t);
  }, [scrollTo, onScrolled]);

  const weightData = [...weights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(w => ({ label: shortDate(w.date), kg: w.weightKg }));

  const heightData = [...heights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(h => ({ label: shortDate(h.date), cm: h.heightCm }));

  // Percentile chart data (age-based)
  const canShowPercentiles = !!birthDate && !!sex;
  const babyAgeMonths = birthDate ? ageInMonths(birthDate, localDateOf(new Date().toISOString())) : 0;
  const percentileMaxMonth = Math.min(6, Math.ceil(babyAgeMonths) + 1);
  const weightPercentileData = canShowPercentiles ? buildPercentileChartData(
    weights.map(w => ({ date: w.date, value: w.weightKg })),
    getWeightPercentiles(sex!),
    birthDate!,
    percentileMaxMonth,
  ) : null;
  const heightPercentileData = canShowPercentiles ? buildPercentileChartData(
    heights.map(h => ({ date: h.date, value: h.heightCm })),
    getLengthPercentiles(sex!),
    birthDate!,
    percentileMaxMonth,
  ) : null;
  const headCircPercentileData = canShowPercentiles ? buildPercentileChartData(
    headCircs.map(h => ({ date: h.date, value: h.headCm })),
    getHeadCircPercentiles(sex!),
    birthDate!,
    percentileMaxMonth,
  ) : null;

  const headCircData = [...headCircs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(h => ({ label: shortDate(h.date), cm: h.headCm }));
  const hasHeadCirc = headCircData.length >= 2 || (headCircData.length >= 1 && canShowPercentiles);

  const hasMl       = daily.some(d => d.ml != null);
  const hasBottle   = daily.some(d => d.bottleMl != null);
  const hasBreast   = daily.some(d => d.breastMin != null);
  const hasRest     = daily.some(d => d.avgRest != null);
  const hasTotalRest = daily.some(d => d.totalRest != null);
  const hasTomas    = daily.some(d => d.tomas != null);
  const hasWeight   = weightData.length >= 2 || (weightData.length >= 1 && canShowPercentiles);
  const hasHeight   = heightData.length >= 2 || (heightData.length >= 1 && canShowPercentiles);

  // X axis tick interval based on period
  const tickInterval = period === '30d' ? 4 : period === '14d' ? 1 : 0;

  return (
    <div>
      {/* ── Peso con percentiles ─────────────────────────────────────── */}
      <div id="chart-weight" className="bg-white rounded-2xl shadow-sm p-4 mb-4 scroll-mt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">⚖️ Evolución del peso</h3>
        {!hasWeight ? (
          <p className="text-xs text-gray-400 text-center py-6">
            Añade al menos 2 registros de peso en la pestaña Mi bebé.
          </p>
        ) : weightPercentileData ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weightPercentileData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" tick={TICK_STYLE} tickFormatter={v => `${Math.round(v)}m`} type="number" domain={[0, percentileMaxMonth]} />
                <YAxis tick={TICK_STYLE} domain={['auto', 'auto']} tickFormatter={v => `${v} kg`} />
                <Tooltip content={<PercentileTooltip unit=" kg" />} />
                <Line type="monotone" dataKey="p3" name="P3" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="p15" name="P15" stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                <Line type="monotone" dataKey="p50" name="P50" stroke="#64748b" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="p85" name="P85" stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                <Line type="monotone" dataKey="p97" name="P97" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="baby" name="Bebé" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 2.5, fill: '#2563eb' }} activeDot={{ r: 5 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-4 border-t border-dashed border-gray-400" /> P3–P97</span>
              <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-blue-600" /> Bebé</span>
              <span>OMS · {sex === 'female' ? 'niña' : 'niño'}</span>
            </div>
            <PercentileSummary entries={weights.map(w => ({ date: w.date, value: w.weightKg }))} percentiles={getWeightPercentiles(sex!)} birthDate={birthDate!} unit="kg" label="peso" />
          </>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="label" tick={TICK_STYLE} interval="preserveStartEnd" />
              <YAxis tick={TICK_STYLE} domain={['auto', 'auto']} tickFormatter={v => `${v}kg`} />
              <Tooltip content={<ChartTooltip unit=" kg" />} />
              <Line type="monotone" dataKey="kg" name="Peso" stroke="#2563eb" strokeWidth={2} dot={{ r: 2.5, fill: '#2563eb' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {hasWeight && !canShowPercentiles && (
          <p className="text-xs text-gray-400 text-center mt-2">
            Indica sexo y fecha de nacimiento en {onGoToProfile ? <button onClick={onGoToProfile} className="underline text-sage-600 font-semibold touch-manipulation">Mi bebé</button> : 'Mi bebé'} para ver percentiles OMS.
          </p>
        )}
      </div>

      {/* ── Talla con percentiles ──────────────────────────────────── */}
      <div id="chart-height" className="bg-white rounded-2xl shadow-sm p-4 mb-4 scroll-mt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📏 Evolución de la talla</h3>
        {!hasHeight ? (
          <p className="text-xs text-gray-400 text-center py-6">
            Añade al menos 2 registros de altura en la pestaña Mi bebé.
          </p>
        ) : heightPercentileData ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={heightPercentileData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" tick={TICK_STYLE} tickFormatter={v => `${Math.round(v)}m`} type="number" domain={[0, percentileMaxMonth]} />
                <YAxis tick={TICK_STYLE} domain={['auto', 'auto']} tickFormatter={v => `${v} cm`} />
                <Tooltip content={<PercentileTooltip unit=" cm" />} />
                <Line type="monotone" dataKey="p3" name="P3" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="p15" name="P15" stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                <Line type="monotone" dataKey="p50" name="P50" stroke="#64748b" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="p85" name="P85" stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                <Line type="monotone" dataKey="p97" name="P97" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="baby" name="Bebé" stroke="#0891b2" strokeWidth={2.5} dot={{ r: 2.5, fill: '#0891b2' }} activeDot={{ r: 5 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-4 border-t border-dashed border-gray-400" /> P3–P97</span>
              <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-cyan-600" /> Bebé</span>
              <span>OMS · {sex === 'female' ? 'niña' : 'niño'}</span>
            </div>
            <PercentileSummary entries={heights.map(h => ({ date: h.date, value: h.heightCm }))} percentiles={getLengthPercentiles(sex!)} birthDate={birthDate!} unit="cm" label="talla" />
          </>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={heightData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="label" tick={TICK_STYLE} interval="preserveStartEnd" />
              <YAxis tick={TICK_STYLE} domain={['auto', 'auto']} tickFormatter={v => `${v}cm`} />
              <Tooltip content={<ChartTooltip unit=" cm" />} />
              <Line type="monotone" dataKey="cm" name="Altura" stroke="#0891b2" strokeWidth={2} dot={{ r: 2.5, fill: '#0891b2' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {hasHeight && !canShowPercentiles && (
          <p className="text-xs text-gray-400 text-center mt-2">
            Indica sexo y fecha de nacimiento en {onGoToProfile ? <button onClick={onGoToProfile} className="underline text-sage-600 font-semibold touch-manipulation">Mi bebé</button> : 'Mi bebé'} para ver percentiles OMS.
          </p>
        )}
      </div>

      {/* ── Perímetro craneal con percentiles ───────────────────────── */}
      <div id="chart-headcirc" className="bg-white rounded-2xl shadow-sm p-4 mb-4 scroll-mt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🧒 Perímetro craneal</h3>
        {!hasHeadCirc ? (
          <p className="text-xs text-gray-400 text-center py-6">
            Añade al menos 1 registro de perímetro craneal en Mi bebé.
          </p>
        ) : headCircPercentileData ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={headCircPercentileData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" tick={TICK_STYLE} tickFormatter={v => `${Math.round(v)}m`} type="number" domain={[0, percentileMaxMonth]} />
                <YAxis tick={TICK_STYLE} domain={['auto', 'auto']} tickFormatter={v => `${v} cm`} />
                <Tooltip content={<PercentileTooltip unit=" cm" />} />
                <Line type="monotone" dataKey="p3" name="P3" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="p15" name="P15" stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                <Line type="monotone" dataKey="p50" name="P50" stroke="#64748b" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="p85" name="P85" stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                <Line type="monotone" dataKey="p97" name="P97" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="baby" name="Bebé" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 2.5, fill: '#8b5cf6' }} activeDot={{ r: 5 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-4 border-t border-dashed border-gray-400" /> P3–P97</span>
              <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-purple-500" /> Bebé</span>
              <span>OMS · {sex === 'female' ? 'niña' : 'niño'}</span>
            </div>
            <PercentileSummary entries={headCircs.map(h => ({ date: h.date, value: h.headCm }))} percentiles={getHeadCircPercentiles(sex!)} birthDate={birthDate!} unit="cm" label="perímetro" />
          </>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={headCircData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="label" tick={TICK_STYLE} interval="preserveStartEnd" />
              <YAxis tick={TICK_STYLE} domain={['auto', 'auto']} tickFormatter={v => `${v}cm`} />
              <Tooltip content={<ChartTooltip unit=" cm" />} />
              <Line type="monotone" dataKey="cm" name="P. craneal" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2.5, fill: '#8b5cf6' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {hasHeadCirc && !canShowPercentiles && (
          <p className="text-xs text-gray-400 text-center mt-2">
            Indica sexo y fecha de nacimiento en {onGoToProfile ? <button onClick={onGoToProfile} className="underline text-sage-600 font-semibold touch-manipulation">Mi bebé</button> : 'Mi bebé'} para ver percentiles OMS.
          </p>
        )}
      </div>

      {/* Period selector for time-based charts */}
      <PeriodSelector value={period} onChange={setPeriod} />

      {/* ── Alimentación diaria ────────────────────────────────────────── */}
      <ChartSection title="🍼 Alimentación diaria" empty={!hasMl && !hasBottle && !hasBreast}>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={daily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
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
            {hasBottle && (
              <Bar dataKey="bottleMl" name="Biberón (ml)" fill="#0ea5e9" radius={[3, 3, 0, 0]} maxBarSize={24} />
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
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="label" tick={TICK_STYLE} interval={tickInterval} />
            <YAxis tick={TICK_STYLE} allowDecimals={false} />
            <Tooltip content={<ChartTooltip unit=" tomas" />} />
            <Bar dataKey="tomas" name="Tomas" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* ── Sueño total por día ────────────────────────────────────── */}
      <ChartSection title="🌙 Sueño total por día" empty={!hasTotalRest}>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={daily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
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
                    <p style={{ color: '#7c3aed' }}>
                      Total: <strong>{formatMinutes(payload[0].value)}</strong>
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="totalRest" name="Sueño total (min)" fill="#7c3aed" radius={[3, 3, 0, 0]} maxBarSize={24} />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 text-center mt-2">Suma del día; los sueños que cruzan medianoche reparten sus minutos entre los dos días</p>
      </ChartSection>

      {/* ── Sueño medio ────────────────────────────────────────────── */}
      <ChartSection title="🌙 Sueño medio por día" empty={!hasRest}>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={daily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
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

// ── Percentile helpers ───────────────────────────────────────────────────────

import type { PercentileRow } from '../data/whoPercentiles';

function buildPercentileChartData(
  entries: { date: string; value: number }[],
  percentiles: PercentileRow[],
  birthDate: string,
  maxMonth: number = 6,
): Record<string, number | undefined>[] {
  const data: Record<string, number | undefined>[] = percentiles
    .filter(row => row.month <= maxMonth)
    .map(row => ({
      month: row.month,
      p3: row.p3,
      p15: row.p15,
      p50: row.p50,
      p85: row.p85,
      p97: row.p97,
      baby: undefined,
    }));

  for (const entry of entries) {
    const month = ageInMonths(birthDate, entry.date);
    if (month < 0 || month > 6.5) continue;
    data.push({
      month: Math.round(month * 100) / 100,
      p3: interpolate(percentiles, month, 'p3'),
      p15: interpolate(percentiles, month, 'p15'),
      p50: interpolate(percentiles, month, 'p50'),
      p85: interpolate(percentiles, month, 'p85'),
      p97: interpolate(percentiles, month, 'p97'),
      baby: entry.value,
    });
  }

  return data.sort((a, b) => (a.month as number) - (b.month as number));
}

function interpolate(rows: PercentileRow[], month: number, key: 'p3' | 'p15' | 'p50' | 'p85' | 'p97'): number | undefined {
  if (month <= rows[0].month) return rows[0][key];
  if (month >= rows[rows.length - 1].month) return rows[rows.length - 1][key];
  for (let i = 0; i < rows.length - 1; i++) {
    if (month >= rows[i].month && month <= rows[i + 1].month) {
      const t = (month - rows[i].month) / (rows[i + 1].month - rows[i].month);
      return Math.round((rows[i][key] + t * (rows[i + 1][key] - rows[i][key])) * 100) / 100;
    }
  }
  return undefined;
}

function estimatePercentileNum(value: number, percentiles: PercentileRow[], month: number): number {
  const points: [number, number][] = [
    [3, interpolate(percentiles, month, 'p3') ?? 0],
    [15, interpolate(percentiles, month, 'p15') ?? 0],
    [50, interpolate(percentiles, month, 'p50') ?? 0],
    [85, interpolate(percentiles, month, 'p85') ?? 0],
    [97, interpolate(percentiles, month, 'p97') ?? 0],
  ];

  if (value <= points[0][1]) return 1;
  if (value >= points[points.length - 1][1]) return 99;

  for (let i = 0; i < points.length - 1; i++) {
    const [pLow, vLow] = points[i];
    const [pHigh, vHigh] = points[i + 1];
    if (value >= vLow && value <= vHigh) {
      const t = (value - vLow) / (vHigh - vLow);
      return Math.round(pLow + t * (pHigh - pLow));
    }
  }
  return 50;
}

function percentileDescription(p: number): string {
  if (p < 3) return 'Muy por debajo del rango normal';
  if (p < 15) return 'Por debajo de la media, dentro del rango normal';
  if (p < 50) return 'Por debajo de la media, dentro del rango normal';
  if (p <= 50) return 'En la media';
  if (p <= 85) return 'Por encima de la media, dentro del rango normal';
  if (p <= 97) return 'Por encima de la media, dentro del rango normal';
  return 'Muy por encima del rango normal';
}

function PercentileSummary({ entries, percentiles, birthDate, unit, label }: {
  entries: { date: string; value: number }[];
  percentiles: PercentileRow[];
  birthDate: string;
  unit: string;
  label: string;
}) {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  const month = ageInMonths(birthDate, latest.date);
  if (month < 0 || month > 6.5) return null;
  const p = estimatePercentileNum(latest.value, percentiles, month);
  const desc = percentileDescription(p);

  return (
    <div className="mt-3 bg-blue-50 rounded-xl px-3 py-2.5 text-xs text-blue-900">
      <p className="font-semibold">
        Último registro: {latest.value} {unit} → <span className="text-blue-700">~P{p}</span>
      </p>
      <p className="text-blue-700 mt-0.5">{desc}</p>
      <p className="text-blue-600/70 mt-1.5">
        {label === 'peso'
          ? `P${p} = el ${p}% de bebés de la misma edad y sexo pesa menos.`
          : label === 'perímetro'
          ? `P${p} = el ${p}% de bebés de la misma edad y sexo tiene un perímetro craneal menor.`
          : `P${p} = el ${p}% de bebés de la misma edad y sexo mide menos.`
        }
      </p>
    </div>
  );
}

function PercentileTooltip({ active, payload, unit }: any) {
  if (!active || !payload?.length) return null;
  const babyPoint = payload.find((p: any) => p.dataKey === 'baby' && p.value != null);
  const p50 = payload.find((p: any) => p.dataKey === 'p50');
  const monthVal = payload[0]?.payload?.month;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-md text-xs">
      {monthVal != null && <p className="font-semibold text-gray-700 mb-1">{monthVal.toFixed(1)} meses</p>}
      {babyPoint && (
        <p className="text-blue-600 font-bold">Bebé: {babyPoint.value}{unit}</p>
      )}
      {p50 && (
        <p className="text-gray-500">P50: {p50.value}{unit}</p>
      )}
    </div>
  );
}
