import { useState } from 'react';
import type { MilestoneLog } from '../types';
import { MILESTONES, CATEGORY_META, type MilestoneCategory } from '../data/milestones';

interface Props {
  milestoneLogs: MilestoneLog[];
  babyAgeMonths: number;
  onToggle: (milestoneId: string) => void;
  readOnly?: boolean;
}

export default function MilestonesView({ milestoneLogs, babyAgeMonths, onToggle, readOnly }: Props) {
  const achieved = new Set(milestoneLogs.map((l) => l.id));
  const [filterCat, setFilterCat] = useState<MilestoneCategory | 'all'>('all');

  const currentGroupIdx = MILESTONES.findIndex(
    (g) => babyAgeMonths >= g.monthFrom && babyAgeMonths < g.monthTo
  );
  const currentGroup = currentGroupIdx >= 0 ? currentGroupIdx : MILESTONES.length - 1;

  const totalMilestones = MILESTONES.reduce((s, g) => s + g.milestones.length, 0);
  const totalAchieved = milestoneLogs.length;
  const currentGroupMilestones = MILESTONES[currentGroup]?.milestones ?? [];
  const currentAchieved = currentGroupMilestones.filter((m) => achieved.has(m.id)).length;

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Hitos del desarrollo</h1>
      <p className="text-sm text-gray-500 mb-4">
        Basado en CDC/AAP/OMS · {babyAgeMonths.toFixed(1)} meses
      </p>

      {/* Progress summary */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Progreso global</span>
          <span className="text-sm font-bold text-sage-600">{totalAchieved}/{totalMilestones}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-sage-500 rounded-full transition-all duration-500"
            style={{ width: `${(totalAchieved / totalMilestones) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Etapa actual: <span className="font-semibold text-gray-700">{MILESTONES[currentGroup]?.label}</span>
          </span>
          <span className="text-xs font-medium text-sage-600">{currentAchieved}/{currentGroupMilestones.length}</span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        <FilterChip label="Todos" active={filterCat === 'all'} onClick={() => setFilterCat('all')} />
        {(Object.keys(CATEGORY_META) as MilestoneCategory[]).map((cat) => (
          <FilterChip
            key={cat}
            label={`${CATEGORY_META[cat].icon} ${CATEGORY_META[cat].label}`}
            active={filterCat === cat}
            onClick={() => setFilterCat(cat)}
          />
        ))}
      </div>

      {/* Milestone groups */}
      <div className="space-y-4">
        {MILESTONES.map((group, gi) => {
          const milestones = filterCat === 'all'
            ? group.milestones
            : group.milestones.filter((m) => m.category === filterCat);
          if (milestones.length === 0) return null;

          const groupAchieved = milestones.filter((m) => achieved.has(m.id)).length;
          const isCurrent = gi === currentGroup;
          const isPast = gi < currentGroup;

          return (
            <div key={group.label} className={`rounded-2xl overflow-hidden ${isCurrent ? 'ring-2 ring-sage-300' : ''}`}>
              <div className={`px-4 py-2.5 flex items-center justify-between ${
                isCurrent ? 'bg-sage-50' : isPast ? 'bg-gray-50' : 'bg-white'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{group.label}</span>
                  {isCurrent && <span className="text-xs bg-sage-100 text-sage-700 px-1.5 py-0.5 rounded-full font-medium">actual</span>}
                </div>
                <span className="text-xs text-gray-500">{groupAchieved}/{milestones.length}</span>
              </div>
              <div className="bg-white divide-y divide-gray-50">
                {milestones.map((m) => {
                  const done = achieved.has(m.id);
                  const meta = CATEGORY_META[m.category];
                  return (
                    <button
                      key={m.id}
                      onClick={readOnly ? undefined : () => onToggle(m.id)}
                      disabled={readOnly}
                      className="w-full flex items-center gap-3 px-4 py-3 active:bg-gray-50 touch-manipulation text-left"
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        done ? 'bg-sage-500 border-sage-500 text-white' : 'border-gray-300'
                      }`}>
                        {done && <CheckIcon />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{m.text}</p>
                      </div>
                      <span className="text-xs shrink-0">{meta.icon}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6 px-4">
        Cada bebé se desarrolla a su ritmo. Estos hitos son orientativos. Consulta con tu pediatra si tienes dudas.
      </p>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 touch-manipulation transition-colors ${
        active ? 'bg-sage-600 text-white' : 'bg-white text-gray-500 shadow-sm'
      }`}
    >
      {label}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
