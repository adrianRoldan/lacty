import { useState } from 'react';
import type { Consultation, ConsultationCategory } from '../types';
import { generateId } from '../utils/feedingUtils';

interface Props {
  consultations: Consultation[];
  onCreate: (c: Consultation) => void;
  onUpdate: (c: Consultation) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: { key: ConsultationCategory; label: string; icon: string; color: string }[] = [
  { key: 'pediatra', label: 'Pediatra', icon: '🩺', color: 'bg-blue-100 text-blue-700' },
  { key: 'matrona',  label: 'Matrona',  icon: '👩‍⚕️', color: 'bg-pink-100 text-pink-700' },
  { key: 'fisio',    label: 'Fisio',    icon: '💪', color: 'bg-amber-100 text-amber-700' },
  { key: 'otro',     label: 'Otro',     icon: '💬', color: 'bg-gray-100 text-gray-600' },
];

const catOf = (k: ConsultationCategory) => CATEGORIES.find((c) => c.key === k)!;

export default function ConsultationsView({ consultations, onCreate, onUpdate, onDelete }: Props) {
  const [text, setText] = useState('');
  const [newCat, setNewCat] = useState<ConsultationCategory>('pediatra');
  const [filter, setFilter] = useState<ConsultationCategory | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  function handleAdd() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onCreate({
      id: generateId(),
      text: trimmed,
      category: newCat,
      resolved: false,
      createdAt: new Date().toISOString(),
    });
    setText('');
  }

  function toggleResolved(c: Consultation) {
    onUpdate({
      ...c,
      resolved: !c.resolved,
      resolvedAt: !c.resolved ? new Date().toISOString() : undefined,
    });
  }

  const matchesFilter = (c: Consultation) => filter === 'all' || c.category === filter;
  const pending = consultations.filter((c) => !c.resolved && matchesFilter(c))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const resolved = consultations.filter((c) => c.resolved && matchesFilter(c))
    .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''));

  return (
    <div className="px-4 pt-3 pb-24">
      {/* Quick-add */}
      <div className="bg-white rounded-2xl shadow-sm p-3 mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd(); }}
          placeholder="Apunta una duda…"
          rows={2}
          className="w-full text-sm text-gray-900 placeholder-gray-400 border-none outline-none resize-none bg-transparent"
        />
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setNewCat(c.key)}
                className={`text-xs font-medium px-2 py-1 rounded-full touch-manipulation transition-colors ${
                  newCat === c.key ? c.color : 'bg-gray-50 text-gray-400'
                }`}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleAdd}
            disabled={!text.trim()}
            className="shrink-0 bg-sage-600 text-white text-sm font-semibold px-4 py-2 rounded-xl active:bg-sage-700 disabled:opacity-40 touch-manipulation"
          >
            Añadir
          </button>
        </div>
      </div>

      {/* Filtro por categoría */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>Todas</FilterChip>
        {CATEGORIES.map((c) => (
          <FilterChip key={c.key} active={filter === c.key} onClick={() => setFilter(c.key)}>
            {c.icon} {c.label}
          </FilterChip>
        ))}
      </div>

      {/* Pendientes */}
      {pending.length === 0 && resolved.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-base">Sin dudas apuntadas</p>
          <p className="text-xs mt-1">Añade lo que quieras comentar en la próxima visita</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-2 mb-6">
              {pending.map((c) => (
                <ConsultationCard
                  key={c.id} c={c} expanded={expandedId === c.id}
                  onToggleExpand={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  onToggleResolved={() => toggleResolved(c)}
                  onUpdate={onUpdate} onDelete={onDelete}
                />
              ))}
            </div>
          )}

          {/* Resueltas (colapsable) */}
          {resolved.length > 0 && (
            <div>
              <button
                onClick={() => setShowResolved(!showResolved)}
                className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 touch-manipulation"
              >
                <span>Resueltas ({resolved.length})</span>
                <span>{showResolved ? '▼' : '▶'}</span>
              </button>
              {showResolved && (
                <div className="space-y-2">
                  {resolved.map((c) => (
                    <ConsultationCard
                      key={c.id} c={c} expanded={expandedId === c.id}
                      onToggleExpand={() => setExpandedId(expandedId === c.id ? null : c.id)}
                      onToggleResolved={() => toggleResolved(c)}
                      onUpdate={onUpdate} onDelete={onDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ConsultationCard({ c, expanded, onToggleExpand, onToggleResolved, onUpdate, onDelete }: {
  c: Consultation;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleResolved: () => void;
  onUpdate: (c: Consultation) => void;
  onDelete: (id: string) => void;
}) {
  const cat = catOf(c.category);
  const [answer, setAnswer] = useState(c.answer ?? '');
  const [editText, setEditText] = useState(c.text);

  function saveAnswer() {
    if (answer.trim() !== (c.answer ?? '')) {
      onUpdate({ ...c, answer: answer.trim() || undefined });
    }
  }

  function saveText() {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== c.text) {
      onUpdate({ ...c, text: trimmed });
    } else if (!trimmed) {
      setEditText(c.text); // no permitir vaciar: revierte
    }
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm p-3 ${c.resolved ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Toggle resuelto */}
        <button
          onClick={onToggleResolved}
          className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center touch-manipulation transition-colors ${
            c.resolved ? 'bg-sage-600 border-sage-600 text-white' : 'border-gray-300'
          }`}
          aria-label={c.resolved ? 'Marcar pendiente' : 'Marcar resuelta'}
        >
          {c.resolved && <span className="text-xs">✓</span>}
        </button>

        {/* Texto + meta */}
        <div className="flex-1 min-w-0">
          {expanded ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={saveText}
              rows={2}
              autoFocus
              className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-sage-400 resize-none"
            />
          ) : (
            <p
              onClick={onToggleExpand}
              className={`text-sm text-gray-900 cursor-pointer ${c.resolved ? 'line-through text-gray-400' : ''}`}
            >
              {c.text}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {expanded ? (
              CATEGORIES.map((cc) => (
                <button
                  key={cc.key}
                  onClick={() => onUpdate({ ...c, category: cc.key })}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full touch-manipulation transition-colors ${
                    c.category === cc.key ? cc.color : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  {cc.icon} {cc.label}
                </button>
              ))
            ) : (
              <>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${cat.color}`}>
                  {cat.icon} {cat.label}
                </span>
                {c.answer && (
                  <span className="text-xs text-sage-600">💬 con respuesta</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Borrar / cerrar edición */}
        {expanded ? (
          <button
            onClick={() => { saveText(); onToggleExpand(); }}
            className="text-sage-600 text-sm font-semibold px-2 py-1 shrink-0 touch-manipulation"
          >
            Hecho
          </button>
        ) : (
          <button
            onClick={() => { if (window.confirm('¿Eliminar esta duda?')) onDelete(c.id); }}
            className="text-gray-300 hover:text-red-400 p-1 shrink-0 touch-manipulation"
            aria-label="Eliminar"
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {/* Respuesta (al expandir) */}
      {expanded && (
        <div className="mt-3 pl-9">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onBlur={saveAnswer}
            placeholder="Respuesta del profesional…"
            rows={2}
            className="w-full text-sm text-gray-700 placeholder-gray-300 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-sage-400 resize-none"
          />
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full touch-manipulation transition-colors ${
        active ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 shadow-sm'
      }`}
    >
      {children}
    </button>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
