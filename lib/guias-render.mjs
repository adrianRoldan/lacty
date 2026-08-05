/**
 * Renderizado del HTML público de /guias/.
 *
 * Los artículos viven en la base de datos y se editan desde el panel de
 * administración; aquí solo se genera el HTML que ve el visitante (y Google).
 * Todo el andamiaje SEO —canonical, Open Graph, datos estructurados, migas de
 * pan— se aplica en un único sitio para que no pueda faltar en ningún artículo.
 */

const SITIO = 'https://lacty.es';

export const escapar = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fechaLegible = (iso) =>
  new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

/** Minutos de lectura a partir del HTML del artículo (~200 palabras/min). */
export function minutosLectura(html) {
  const texto = String(html).replace(/<[^>]*>/g, ' ');
  return Math.max(1, Math.round(texto.split(/\s+/).filter(Boolean).length / 200));
}

/**
 * Añade id a los h2 del contenido y devuelve el índice para la tabla de
 * contenidos. Se hace al renderizar y no al guardar, para que el contenido
 * almacenado quede limpio y los anclas se recalculen si se edita el texto.
 */
export function prepararContenido(html) {
  // El editor devuelve <table> a pelo. Sin envolverla, una tabla ancha rompe
  // el ancho de la página en móvil, y eso penaliza en usabilidad móvil.
  const conTablas = String(html).replace(
    /(<div class="tabla-scroll">\s*)?<table([\s\S]*?)<\/table>/gi,
    (completo, yaEnvuelta, interior) =>
      yaEnvuelta ? completo : `<div class="tabla-scroll"><table${interior}</table></div>`
  );

  const indice = [];
  const usados = new Set();
  const conIds = conTablas.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_, attrs, interior) => {
    const plano = interior.replace(/<[^>]*>/g, '').trim();
    let id = plano.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') || 'seccion';
    const base = id;
    let n = 2;
    while (usados.has(id)) id = `${base}-${n++}`;
    usados.add(id);
    indice.push({ id, texto: plano });
    const sinId = attrs.replace(/\s*id="[^"]*"/i, '');
    return `<h2${sinId} id="${id}">${interior}</h2>`;
  });
  return { html: conIds, indice };
}

// ── Trozos comunes ───────────────────────────────────────────────────────────

export const cabeceraComun = (extra = '') => `  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#7D9E82" />
  <link rel="icon" href="/favicon.ico" sizes="48x48" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="stylesheet" href="/styles.css?v=20260805" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" /></noscript>
${extra}`;

export const navegacion = `  <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
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

export const pie = `  <footer class="bg-gray-900 text-gray-400 py-12 px-6 mt-20">
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
        <a href="/referencias" class="hover:text-gray-200 transition-colors">Referencias</a>
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

// ── Páginas ──────────────────────────────────────────────────────────────────

export function renderArticulo(art, relacionados = []) {
  const url = `${SITIO}/guias/${art.slug}.html`;
  const imagen = `${SITIO}/og-image.png`;
  const publicado = String(art.fecha_publicacion ?? '').slice(0, 10);
  const actualizado = String(art.actualizado_at ?? art.fecha_publicacion ?? '').slice(0, 10);
  const { html, indice } = prepararContenido(art.contenido);
  const minutos = minutosLectura(art.contenido);

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#articulo`,
        headline: art.titulo,
        description: art.descripcion,
        inLanguage: 'es-ES',
        datePublished: publicado,
        dateModified: actualizado || publicado,
        image: imagen,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: { '@type': 'Organization', name: 'Lacty', url: `${SITIO}/` },
        publisher: { '@id': `${SITIO}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITIO}/` },
          { '@type': 'ListItem', position: 2, name: 'Guías', item: `${SITIO}/guias/` },
          { '@type': 'ListItem', position: 3, name: art.titulo, item: url },
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
            <span class="text-xl" aria-hidden="true">${escapar(r.emoji || '📄')}</span>
            <h3 class="font-bold text-gray-900 mt-2 mb-1 text-sm">${escapar(r.titulo)}</h3>
            <p class="text-xs text-taupe-700 leading-relaxed">${escapar(r.resumen)}</p>
          </a>`).join('\n          ')}
        </div>
      </section>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <title>${escapar(art.titulo)} | Lacty</title>
  <meta name="description" content="${escapar(art.descripcion)}" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
${cabeceraComun(`  <meta property="og:type" content="article" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:site_name" content="Lacty" />
  <meta property="og:title" content="${escapar(art.titulo)}" />
  <meta property="og:description" content="${escapar(art.descripcion)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${imagen}" />
  <meta property="article:published_time" content="${publicado}" />
  <meta property="article:modified_time" content="${actualizado || publicado}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapar(art.titulo)}" />
  <meta name="twitter:description" content="${escapar(art.descripcion)}" />
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
      <h1>${escapar(art.titulo)}</h1>
      <p class="text-sm text-taupe-600 -mt-2 mb-8">
        <time datetime="${actualizado || publicado}">Actualizado el ${fechaLegible(actualizado || publicado)}</time>
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

export function renderIndice(articulos) {
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
      datePublished: String(a.fecha_publicacion ?? '').slice(0, 10),
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
        <span class="text-2xl" aria-hidden="true">${escapar(a.emoji || '📄')}</span>
        <h2 class="text-lg font-bold text-gray-900 mt-3 mb-2">${escapar(a.titulo)}</h2>
        <p class="text-sm text-taupe-700 leading-relaxed mb-3">${escapar(a.resumen)}</p>
        <span class="text-xs text-taupe-600">
          <time datetime="${String(a.fecha_publicacion ?? '').slice(0, 10)}">${fechaLegible(a.fecha_publicacion)}</time> · ${minutosLectura(a.contenido ?? '')} min
        </span>
      </a>`).join('\n      ')}
    </div>`}
  </main>

${pie}
</body>
</html>
`;
}

/** Página 404 para rutas inexistentes bajo /guias/. */
export function render404() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <title>Página no encontrada | Lacty</title>
  <meta name="robots" content="noindex, follow" />
${cabeceraComun()}
</head>
<body class="font-sans bg-white text-gray-900 antialiased">
${navegacion}
  <main class="max-w-2xl mx-auto px-6 py-24 text-center">
    <p class="text-5xl mb-5" aria-hidden="true">🍼</p>
    <h1 class="text-3xl font-extrabold text-gray-900 mb-4">Esta guía no existe</h1>
    <p class="text-taupe-700 leading-relaxed mb-8">
      Puede que la dirección esté mal escrita o que el artículo ya no esté disponible.
    </p>
    <a href="/guias/" class="btn-primary font-semibold px-7 py-3.5 rounded-xl text-base inline-block">
      Ver todas las guías
    </a>
  </main>
${pie}
</body>
</html>
`;
}

export function renderSitemap(articulos) {
  const hoy = new Date().toISOString().slice(0, 10);
  const fijas = [
    { url: '/', prioridad: '1.0', frecuencia: 'monthly' },
    { url: '/guias/', prioridad: '0.8', frecuencia: 'weekly' },
    { url: '/referencias', prioridad: '0.6', frecuencia: 'monthly' },
    { url: '/privacidad.html', prioridad: '0.3', frecuencia: 'yearly' },
    { url: '/aviso-legal.html', prioridad: '0.3', frecuencia: 'yearly' },
  ];
  const entradas = [
    ...fijas.map(p => ({ loc: `${SITIO}${p.url}`, lastmod: hoy, changefreq: p.frecuencia, priority: p.prioridad })),
    ...articulos.map(a => ({
      loc: `${SITIO}/guias/${a.slug}.html`,
      lastmod: String(a.actualizado_at ?? a.fecha_publicacion ?? hoy).slice(0, 10),
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
