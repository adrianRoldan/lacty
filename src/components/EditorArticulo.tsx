import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { TableKit } from '@tiptap/extension-table';

interface Props {
  valor: string;
  onChange: (html: string) => void;
}

/**
 * Editor visual de las guías.
 *
 * Produce HTML semántico (h2, h3, strong, ul…), que es justo lo que necesita
 * el posicionamiento: los encabezados estructuran el artículo y el servidor
 * genera con ellos el índice y los enlaces internos.
 *
 * `valor` solo se usa como contenido inicial. Para cargar otra guía hay que
 * remontar el componente con una `key` distinta (lo hace GuiasAdminView), en
 * lugar de sincronizar el contenido con un efecto: con StrictMode el editor se
 * monta y destruye dos veces, y llamar a getHTML() sobre la instancia destruida
 * rompía la página entera.
 */
export default function EditorArticulo({ valor, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // El h1 lo pone la plantilla con el título: dentro del texto solo h2/h3.
        heading: { levels: [2, 3] },
      }),
      Link.configure({ openOnClick: false, autolink: false }),
      // Sin esto las tablas se borrarían al abrir un artículo que las tenga,
      // y son valiosas: una tabla bien hecha puede ganar el fragmento
      // destacado de Google.
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: valor,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (editor.isDestroyed) return;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'articulo-editor focus:outline-none',
      },
    },
  });

  if (!editor) return null;

  function ponerEnlace() {
    if (!editor) return;
    const previo = editor.getAttributes('link').href ?? '';
    const url = window.prompt('Dirección del enlace (deja vacío para quitarlo):', previo);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
        <Boton activo={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} titulo="Título de sección">
          H2
        </Boton>
        <Boton activo={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} titulo="Subtítulo">
          H3
        </Boton>
        <Separador />
        <Boton activo={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()} titulo="Negrita">
          <strong>B</strong>
        </Boton>
        <Boton activo={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()} titulo="Cursiva">
          <em>I</em>
        </Boton>
        <Separador />
        <Boton activo={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()} titulo="Lista con puntos">
          • Lista
        </Boton>
        <Boton activo={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()} titulo="Lista numerada">
          1. Lista
        </Boton>
        <Separador />
        <Boton activo={editor.isActive('link')} onClick={ponerEnlace} titulo="Insertar enlace">
          🔗 Enlace
        </Boton>
        <Boton activo={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()} titulo="Cita destacada">
          ❝ Cita
        </Boton>
        <Separador />
        {editor.isActive('table') ? (
          <>
            <Boton onClick={() => editor.chain().focus().addRowAfter().run()} titulo="Añadir fila">+ Fila</Boton>
            <Boton onClick={() => editor.chain().focus().addColumnAfter().run()} titulo="Añadir columna">+ Col</Boton>
            <Boton onClick={() => editor.chain().focus().deleteRow().run()} titulo="Borrar fila">− Fila</Boton>
            <Boton onClick={() => editor.chain().focus().deleteTable().run()} titulo="Borrar tabla">🗑 Tabla</Boton>
          </>
        ) : (
          <Boton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            titulo="Insertar tabla">
            ▦ Tabla
          </Boton>
        )}
        <Separador />
        <Boton onClick={() => editor.chain().focus().undo().run()} titulo="Deshacer">↶</Boton>
        <Boton onClick={() => editor.chain().focus().redo().run()} titulo="Rehacer">↷</Boton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

function Boton({ children, onClick, activo, titulo }: {
  children: React.ReactNode; onClick: () => void; activo?: boolean; titulo: string;
}) {
  return (
    <button
      type="button" onClick={onClick} title={titulo}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold touch-manipulation transition-colors ${
        activo ? 'bg-sage-600 text-white' : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

const Separador = () => <span className="w-px h-5 bg-gray-200 mx-1" />;
