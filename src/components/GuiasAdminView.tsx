import { useState, useEffect, lazy, Suspense } from 'react';
import * as api from '../api';
import type { Articulo } from '../api';
import { useConfirm } from './ConfirmDialog';

// El editor pesa bastante y solo lo usa el administrador: se carga aparte
// para no engordar el paquete que descarga cualquier familia al entrar.
const EditorArticulo = lazy(() => import('./EditorArticulo'));

const VACIO = { titulo: '', slug: '', descripcion: '', resumen: '', emoji: '📄', contenido: '', publicado: false };

export default function GuiasAdminView() {
  const confirm = useConfirm();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Articulo | 'nuevo' | null>(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [slugTocado, setSlugTocado] = useState(false);

  useEffect(() => {
    api.getArticulos().then(setArticulos).finally(() => setCargando(false));
  }, []);

  function abrir(a: Articulo | 'nuevo') {
    setEditando(a);
    setError('');
    setSlugTocado(a !== 'nuevo');
    setForm(a === 'nuevo' ? VACIO : {
      titulo: a.titulo, slug: a.slug, descripcion: a.descripcion, resumen: a.resumen,
      emoji: a.emoji ?? '📄', contenido: a.contenido, publicado: !!a.publicado,
    });
  }

  function cambiarTitulo(titulo: string) {
    setForm(f => ({ ...f, titulo, slug: slugTocado ? f.slug : generarSlug(titulo) }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const guardado = editando === 'nuevo'
        ? await api.crearArticulo(form)
        : await api.actualizarArticulo((editando as Articulo).id, form);
      setArticulos(prev => editando === 'nuevo'
        ? [guardado, ...prev]
        : prev.map(a => (a.id === guardado.id ? guardado : a)));
      setEditando(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(a: Articulo) {
    if (!await confirm({
      message: `¿Eliminar la guía "${a.titulo}"? Si estaba publicada, su página dejará de existir y Google acabará quitándola.`,
      confirmLabel: 'Eliminar', danger: true,
    })) return;
    try {
      await api.borrarArticulo(a.id);
      setArticulos(prev => prev.filter(x => x.id !== a.id));
      setEditando(null);
    } catch (e: any) { alert(e.message); }
  }

  if (cargando) return <p className="text-center text-gray-400 py-12 text-sm">Cargando…</p>;

  // ── Formulario ─────────────────────────────────────────────────────────────
  if (editando) {
    const largoTitulo = form.titulo.length;
    const largoDesc = form.descripcion.length;
    return (
      <form onSubmit={guardar} className="pb-24">
        <div className="flex items-center justify-between mb-5">
          <button type="button" onClick={() => setEditando(null)} className="text-sage-600 text-sm font-semibold touch-manipulation">
            ← Volver
          </button>
          <div className="flex items-center gap-2">
            {editando !== 'nuevo' && (
              <a href={`https://lacty.es/guias/${(editando as Articulo).slug}.html`} target="_blank" rel="noreferrer"
                className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg touch-manipulation">
                Ver ↗
              </a>
            )}
            <button type="submit" disabled={guardando}
              className="bg-sage-600 text-white text-sm font-semibold px-4 py-2 rounded-xl active:bg-sage-700 disabled:opacity-50 touch-manipulation">
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <Campo etiqueta="Título" ayuda={`${largoTitulo}/60 · es el titular que sale en Google`}
            alerta={largoTitulo > 60}>
            <input type="text" value={form.titulo} onChange={e => cambiarTitulo(e.target.value)} required
              placeholder="Cuántas tomas necesita un bebé según su edad"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500" />
          </Campo>

          <Campo etiqueta="Dirección de la página" ayuda={`lacty.es/guias/${form.slug || '…'}.html`}>
            <input type="text" value={form.slug}
              onChange={e => { setSlugTocado(true); setForm(f => ({ ...f, slug: generarSlug(e.target.value) })); }}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
          </Campo>

          <Campo etiqueta="Descripción para Google" ayuda={`${largoDesc}/155 · el texto gris bajo el título en los resultados`}
            alerta={largoDesc > 155}>
            <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} required rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500 resize-none" />
          </Campo>

          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <Campo etiqueta="Icono">
              <input type="text" value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} maxLength={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-xl focus:outline-none focus:ring-2 focus:ring-sage-500" />
            </Campo>
            <Campo etiqueta="Resumen" ayuda="Frase corta para la tarjeta del listado">
              <input type="text" value={form.resumen} onChange={e => setForm(f => ({ ...f, resumen: e.target.value }))} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500" />
            </Campo>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Contenido</label>
            <Suspense fallback={<p className="text-sm text-gray-400 py-8 text-center">Cargando el editor…</p>}>
              {/* La key remonta el editor al cambiar de guía: es como se le
                  carga contenido nuevo, sin sincronizarlo con un efecto. */}
              <EditorArticulo
                key={editando === 'nuevo' ? 'nuevo' : (editando as Articulo).id}
                valor={form.contenido}
                onChange={html => setForm(f => ({ ...f, contenido: html }))}
              />
            </Suspense>
          </div>

          <label className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 cursor-pointer touch-manipulation">
            <input type="checkbox" checked={form.publicado}
              onChange={e => setForm(f => ({ ...f, publicado: e.target.checked }))} className="accent-sage-600 w-4 h-4" />
            <div>
              <p className="text-sm font-medium text-gray-900">Publicada</p>
              <p className="text-xs text-gray-500">
                Si está desmarcada queda como borrador: nadie puede verla y no aparece en el sitemap.
              </p>
            </div>
          </label>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          {editando !== 'nuevo' && (
            <div className="pt-2 border-t border-gray-100">
              <button type="button" onClick={() => borrar(editando as Articulo)}
                className="w-full py-3 rounded-xl text-sm font-semibold text-red-500 bg-red-50 active:bg-red-100 touch-manipulation">
                🗑️ Eliminar guía
              </button>
            </div>
          )}
        </div>
      </form>
    );
  }

  // ── Listado ────────────────────────────────────────────────────────────────
  const publicadas = articulos.filter(a => a.publicado).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          {articulos.length} {articulos.length === 1 ? 'guía' : 'guías'}
          {articulos.length > 0 && <> · {publicadas} publicada{publicadas === 1 ? '' : 's'}</>}
        </div>
        <button onClick={() => abrir('nuevo')}
          className="flex items-center gap-1.5 bg-sage-600 text-white text-sm font-semibold px-3 py-2 rounded-xl active:bg-sage-700 touch-manipulation">
          <span className="text-base leading-none">＋</span> Nueva guía
        </button>
      </div>

      {articulos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📄</p>
          <p className="text-sm">Aún no hay guías. Crea la primera.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articulos.map(a => (
            <button key={a.id} onClick={() => abrir(a)}
              className="w-full text-left bg-white rounded-2xl shadow-sm p-4 flex items-start gap-3 active:bg-gray-50 touch-manipulation">
              <span className="text-2xl shrink-0">{a.emoji ?? '📄'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{a.titulo}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    a.publicado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {a.publicado ? 'publicada' : 'borrador'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">/guias/{a.slug}.html</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {a.fecha_publicacion ? `Publicada el ${formatoFecha(a.fecha_publicacion)}` : 'Sin publicar'}
                </p>
              </div>
              <span className="text-gray-300 shrink-0">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Campo({ etiqueta, ayuda, alerta, children }: {
  etiqueta: string; ayuda?: string; alerta?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{etiqueta}</label>
      {children}
      {ayuda && <p className={`text-xs mt-1 ${alerta ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>{ayuda}</p>}
    </div>
  );
}

function generarSlug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);
}

function formatoFecha(iso: string): string {
  return new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}
