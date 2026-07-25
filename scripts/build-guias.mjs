#!/usr/bin/env node
/**
 * Generador de las guías de lacty.es.
 *
 * Lee los artículos en Markdown de contenido/guias/*.md y genera:
 *   - landing/guias/<slug>.html   una página por artículo
 *   - landing/guias/index.html    el índice de guías
 *   - landing/sitemap.xml         el sitemap completo del sitio
 *
 * Uso:  npm run build:guias
 *
 * La idea es que el andamiaje SEO (canonical, Open Graph, datos estructurados,
 * migas de pan, enlazado interno) se aplique siempre igual y no dependa de que
 * uno se acuerde de copiarlo al escribir cada artículo.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ     = join(__dirname, '..');
const ORIGEN   = join(RAIZ, 'contenido', 'guias');
const DESTINO  = join(RAIZ, 'landing', 'guias');
const SITIO    = 'https://lacty.es';

// Páginas estáticas que también entran en el sitemap.
const PAGINAS_FIJAS = [
  { url: '/',                  prioridad: '1.0', frecuencia: 'monthly' },
  { url: '/guias/',            prioridad: '0.8', frecuencia: 'weekly'  },
  { url: '/privacidad.html',   prioridad: '0.3', frecuencia: 'yearly'  },
  { url: '/aviso-legal.html',  prioridad: '0.3', frecuencia: 'yearly'  },
];

// ── Utilidades ───────────────────────────────────────────────────────────────

const escapar = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Parser mínimo de frontmatter: solo pares `clave: valor`. Suficiente y sin dependencias. */
function separarFrontmatter(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error('Falta el bloque de frontmatter (--- ... ---) al inicio del archivo');
  const datos = {};
  for (const linea of m[1].split(/\r?\n/)) {
    if (!linea.trim() || linea.trimStart().startsWith('#')) continue;
    const i = linea.indexOf(':');
    if (i === -1) continue;
    const clave = linea.slice(0, i).trim();
    let valor = linea.slice(i + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    datos[clave] = valor;
  }
  return { datos, cuerpo: m[2] };
}

function validar(datos, archivo) {
  for (const campo of ['titulo', 'descripcion', 'slug', 'fecha', 'resumen']) {
    if (!datos[campo]) throw new Error(`${archivo}: falta el campo obligatorio "${campo}" en el frontmatter`);
  }
  if (datos.descripcion.length > 160) {
    console.warn(`  ⚠️  ${archivo}: la descripción tiene ${datos.descripcion.length} caracteres (Google corta sobre 155)`);
  }
  if (datos.titulo.length > 60) {
    console.warn(`  ⚠️  ${archivo}: el título tiene ${datos.titulo.length} caracteres (Google corta sobre 60)`);
  }
}

const minutosLectura = (texto) => Math.max(1, Math.round(texto.split(/\s+/).length / 200));

const fechaLegible = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

/** Añade id a los h2/h3 para poder enlazarlos y construir el índice del artículo. */
function prepararRenderer() {
  const renderer = new marked.Renderer();
  const usados = new Set();
  const indice = [];
  renderer.heading = function ({ tokens, depth }) {
    const texto = this.parser.parseInline(tokens);
    const plano = texto.replace(/<[^>]*>/g, '');
    let id = plano.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    let base = id, n = 2;
    while (usados.has(id)) id = `${base}-${n++}`;
    usados.add(id);
    if (depth === 2) indice.push({ id, texto: plano });
    return `<h${depth} id="${id}">${texto}</h${depth}>\n`;
  };
  // Las tablas necesitan poder desbordarse en móvil sin romper la página.
  const tablaOriginal = renderer.table.bind(renderer);
  renderer.table = (...args) => `<div class="tabla-scroll">${tablaOriginal(...args)}</div>`;
  return { renderer, indice };
}

// ── Plantillas ───────────────────────────────────────────────────────────────

const cabeceraComun = (extra = '') => `  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#7D9E82" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="stylesheet" href="/styles.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" /></noscript>
${extra}`;

const navegacion = `  <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5" aria-label="Lacty, inicio">
        <div class="w-8 h-8 bg-sage-600 rounded-xl flex items-center justify-center">
          <span class="text-white text-sm font-bold">L</span>
        </div>
        <span class="text-xl font-bold text-gray-900">Lacty</span>
      </a>
      <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-taupe-700" aria-label="Principal">
        <a href="/#funcionalidades" class="hover:text-sage-700 transition-colors">Funcionalidades</a>
        <a href="/guias/" class="text-sage-700">Guías</a>
        <a href="/#preguntas" class="hover:text-sage-700 transition-colors">Preguntas</a>
      </nav>
      <a href="https://app.lacty.es?registro" class="btn-primary text-sm font-semibold px-5 py-2.5 rounded-xl whitespace-nowrap">
        Empezar gratis
      </a>
    </div>
  </header>`;

const pie = `  <footer class="bg-gray-900 text-gray-400 py-12 px-6 mt-20">
    <div class="max-w-6xl mx-auto">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 bg-sage-600 rounded-lg flex items-center justify-center">
            <span class="text-white text-xs font-bold">L</span>
          </div>
          <span class="text-white font-semibold">Lacty</span>
        </div>
        <p class="text-sm text-center">App gratuita para el seguimiento diario de tu bebé.</p>
        <a href="https://app.lacty.es" class="text-sage-300 hover:text-sage-200 text-sm font-medium transition-colors">
          Acceder a la app →
        </a>
      </div>
      <nav class="mt-8 pt-6 border-t border-gray-800 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" aria-label="Legal">
        <a href="/" class="hover:text-gray-200 transition-colors">Inicio</a>
        <a href="/guias/" class="hover:text-gray-200 transition-colors">Guías</a>
        <a href="/privacidad.html" class="hover:text-gray-200 transition-colors">Política de privacidad</a>
        <a href="/aviso-legal.html" class="hover:text-gray-200 transition-colors">Aviso legal</a>
      </nav>
      <p class="mt-6 text-xs text-gray-600 text-center max-w-2xl mx-auto leading-relaxed">
        Lacty es una herramienta de registro familiar. La información mostrada es orientativa y no
        sustituye el criterio de un profesional sanitario.
      </p>
    </div>
  </footer>`;

const llamadaAccion = `      <aside class="mt-14 rounded-3xl bg-linear-to-br from-sage-50 to-lagoon-100 border border-sage-200/50 p-8 text-center">
        <p class="text-2xl mb-3" aria-hidden="true">👶</p>
        <h2 class="text-xl font-extrabold text-gray-900 mb-3">Lleva este seguimiento sin esfuerzo</h2>
        <p class="text-taupe-700 leading-relaxed mb-6 max-w-lg mx-auto">
          Lacty registra las tomas, las siestas y los pañales de tu bebé, calcula sus medias
          y lo sincroniza con toda la familia. Gratis y sin instalar nada.
        </p>
        <a href="https://app.lacty.es?registro" class="btn-primary font-semibold px-7 py-3.5 rounded-xl text-base inline-flex items-center gap-2">
          Crear cuenta gratis
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </aside>`;

const avisoMedico = `      <p class="mt-10 text-sm text-taupe-600 bg-cream-50 border border-cream-200 rounded-2xl p-5 leading-relaxed">
        <strong class="text-gray-800">Aviso:</strong> este contenido es informativo y orientativo.
        No sustituye el consejo de tu pediatra, matrona o asesora de lactancia. Ante cualquier duda
        sobre la salud de tu bebé, consulta siempre con un profesional sanitario.
      </p>`;

function plantillaArticulo({ datos, html, indice, minutos, relacionados }) {
  const url = `${SITIO}/guias/${datos.slug}.html`;
  const imagen = datos.imagen ? `${SITIO}${datos.imagen}` : `${SITIO}/og-image.png`;
  const actualizado = datos.actualizado || datos.fecha;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#articulo`,
        headline: datos.titulo,
        description: datos.descripcion,
        inLanguage: 'es-ES',
        datePublished: datos.fecha,
        dateModified: actualizado,
        image: imagen,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author:    { '@type': 'Organization', name: 'Lacty', url: `${SITIO}/` },
        publisher: { '@id': `${SITIO}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITIO}/` },
          { '@type': 'ListItem', position: 2, name: 'Guías',  item: `${SITIO}/guias/` },
          { '@type': 'ListItem', position: 3, name: datos.titulo, item: url },
        ],
      },
    ],
  };

  const tabla = indice.length > 2 ? `
      <nav class="bg-cream-50 border border-cream-200 rounded-2xl p-5 mb-10" aria-label="Contenido del artículo">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">En este artículo</p>
        <ol class="space-y-1.5 text-sm">
          ${indice.map((h, i) => `<li><a href="#${h.id}" class="text-sage-700 hover:text-sage-800 hover:underline">${i + 1}. ${escapar(h.texto)}</a></li>`).join('\n          ')}
        </ol>
      </nav>` : '';

  const masGuias = relacionados.length ? `
      <section class="mt-14">
        <h2 class="text-xl font-extrabold text-gray-900 mb-5">Sigue leyendo</h2>
        <div class="grid sm:grid-cols-2 gap-4">
          ${relacionados.map(r => `<a href="/guias/${r.slug}.html" class="feature-card block bg-white rounded-2xl p-5 border border-gray-100">
            <span class="text-xl" aria-hidden="true">${r.emoji || '📄'}</span>
            <h3 class="font-bold text-gray-900 mt-2 mb-1 text-sm">${escapar(r.titulo)}</h3>
            <p class="text-xs text-taupe-700 leading-relaxed">${escapar(r.resumen)}</p>
          </a>`).join('\n          ')}
        </div>
      </section>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <title>${escapar(datos.titulo)} | Lacty</title>
  <meta name="description" content="${escapar(datos.descripcion)}" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
${cabeceraComun(`  <meta property="og:type" content="article" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:site_name" content="Lacty" />
  <meta property="og:title" content="${escapar(datos.titulo)}" />
  <meta property="og:description" content="${escapar(datos.descripcion)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${imagen}" />
  <meta property="article:published_time" content="${datos.fecha}" />
  <meta property="article:modified_time" content="${actualizado}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapar(datos.titulo)}" />
  <meta name="twitter:description" content="${escapar(datos.descripcion)}" />
  <meta name="twitter:image" content="${imagen}" />`)}
  <script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
  </script>
</head>

<body class="font-sans bg-white text-gray-900 antialiased">
${navegacion}

  <main class="max-w-3xl mx-auto px-6 py-12">

    <nav class="text-sm text-taupe-600 mb-6" aria-label="Migas de pan">
      <a href="/" class="hover:text-sage-700">Inicio</a>
      <span class="mx-2 text-gray-300">/</span>
      <a href="/guias/" class="hover:text-sage-700">Guías</a>
    </nav>

    <article class="articulo">
      <h1>${escapar(datos.titulo)}</h1>
      <p class="text-sm text-taupe-600 -mt-2 mb-8">
        <time datetime="${actualizado}">Actualizado el ${fechaLegible(actualizado)}</time>
        <span class="mx-1.5 text-gray-300">·</span>${minutos} min de lectura
      </p>
${tabla}
${html}
${avisoMedico}
${llamadaAccion}
${masGuias}
    </article>
  </main>

${pie}
</body>
</html>
`;
}

function plantillaIndice(articulos) {
  const url = `${SITIO}/guias/`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#coleccion`,
    name: 'Guías sobre el cuidado del bebé',
    description: 'Guías prácticas sobre lactancia, sueño, pañales y postoperatorio de frenectomía.',
    inLanguage: 'es-ES',
    url,
    hasPart: articulos.map(a => ({
      '@type': 'BlogPosting',
      headline: a.titulo,
      description: a.descripcion,
      datePublished: a.fecha,
      url: `${SITIO}/guias/${a.slug}.html`,
    })),
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <title>Guías sobre lactancia, sueño y cuidados del bebé | Lacty</title>
  <meta name="description" content="Guías prácticas y claras sobre las tomas, el sueño, los pañales y el postoperatorio de frenectomía, escritas para madres y padres primerizos." />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
${cabeceraComun(`  <meta property="og:type" content="website" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:site_name" content="Lacty" />
  <meta property="og:title" content="Guías sobre lactancia, sueño y cuidados del bebé" />
  <meta property="og:description" content="Guías prácticas sobre las tomas, el sueño, los pañales y el postoperatorio de frenectomía." />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${SITIO}/og-image.png" />`)}
  <script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
  </script>
</head>

<body class="font-sans bg-white text-gray-900 antialiased">
${navegacion}

  <main class="max-w-4xl mx-auto px-6 py-12">
    <nav class="text-sm text-taupe-600 mb-6" aria-label="Migas de pan">
      <a href="/" class="hover:text-sage-700">Inicio</a>
      <span class="mx-2 text-gray-300">/</span>
      <span class="text-gray-500">Guías</span>
    </nav>

    <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Guías para los primeros meses</h1>
    <p class="text-lg text-taupe-700 leading-relaxed mb-12 max-w-2xl">
      Respuestas claras a las dudas que aparecen de madrugada: cuántas tomas necesita,
      cuánto debería dormir, qué hacer tras una frenectomía. Sin humo y sin alarmismos.
    </p>

    ${articulos.length === 0 ? '<p class="text-taupe-600">Muy pronto, las primeras guías.</p>' : `<div class="grid md:grid-cols-2 gap-5">
      ${articulos.map(a => `<a href="/guias/${a.slug}.html" class="feature-card block bg-white rounded-2xl p-6 border border-gray-100">
        <span class="text-2xl" aria-hidden="true">${a.emoji || '📄'}</span>
        <h2 class="text-lg font-bold text-gray-900 mt-3 mb-2">${escapar(a.titulo)}</h2>
        <p class="text-sm text-taupe-700 leading-relaxed mb-3">${escapar(a.resumen)}</p>
        <span class="text-xs text-taupe-600">
          <time datetime="${a.actualizado || a.fecha}">${fechaLegible(a.actualizado || a.fecha)}</time> · ${a.minutos} min
        </span>
      </a>`).join('\n      ')}
    </div>`}
  </main>

${pie}
</body>
</html>
`;
}

function generarSitemap(articulos) {
  const hoy = new Date().toISOString().slice(0, 10);
  const entradas = [
    ...PAGINAS_FIJAS.map(p => ({ loc: `${SITIO}${p.url}`, lastmod: hoy, changefreq: p.frecuencia, priority: p.prioridad })),
    ...articulos.map(a => ({
      loc: `${SITIO}/guias/${a.slug}.html`,
      lastmod: a.actualizado || a.fecha,
      changefreq: 'yearly',
      priority: '0.7',
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entradas.map(e => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
}

// ── Ejecución ────────────────────────────────────────────────────────────────

function main() {
  if (!existsSync(ORIGEN)) {
    console.error(`No existe el directorio de artículos: ${ORIGEN}`);
    process.exit(1);
  }
  mkdirSync(DESTINO, { recursive: true });

  const archivos = readdirSync(ORIGEN).filter(f => f.endsWith('.md')).sort();
  const articulos = [];

  // 1ª pasada: leer y validar todo antes de escribir nada.
  for (const archivo of archivos) {
    const bruto = readFileSync(join(ORIGEN, archivo), 'utf-8');
    const { datos, cuerpo } = separarFrontmatter(bruto);
    validar(datos, archivo);
    articulos.push({ ...datos, cuerpo, minutos: minutosLectura(cuerpo), archivo });
  }

  const slugs = articulos.map(a => a.slug);
  const duplicados = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (duplicados.length) throw new Error(`Slugs duplicados: ${[...new Set(duplicados)].join(', ')}`);

  // Más recientes primero en el índice.
  articulos.sort((a, b) => (b.actualizado || b.fecha).localeCompare(a.actualizado || a.fecha));

  // 2ª pasada: renderizar.
  for (const art of articulos) {
    const { renderer, indice } = prepararRenderer();
    const html = marked.parse(art.cuerpo, { renderer, mangle: false, headerIds: false });
    const relacionados = articulos.filter(a => a.slug !== art.slug).slice(0, 2);
    const salida = plantillaArticulo({ datos: art, html, indice, minutos: art.minutos, relacionados });
    writeFileSync(join(DESTINO, `${art.slug}.html`), salida);
    console.log(`  ✓ guias/${art.slug}.html  (${art.minutos} min)`);
  }

  writeFileSync(join(DESTINO, 'index.html'), plantillaIndice(articulos));
  console.log(`  ✓ guias/index.html  (${articulos.length} ${articulos.length === 1 ? 'artículo' : 'artículos'})`);

  writeFileSync(join(RAIZ, 'landing', 'sitemap.xml'), generarSitemap(articulos));
  console.log(`  ✓ sitemap.xml  (${PAGINAS_FIJAS.length + articulos.length} URLs)`);

  console.log('\nRecuerda ejecutar «npm run build:landing» si has usado clases nuevas de Tailwind.');
}

main();
