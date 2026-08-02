/**
 * Página pública lacty.es/referencias.
 *
 * Se genera a partir de lib/reference-data.mjs, los mismos datos que usa la
 * app en su pestaña «Referencia». No hay ninguna tabla copiada aquí: si se
 * ajusta un rango, cambia en los dos sitios a la vez.
 */
import {
  FEEDING_REFERENCE,
  SLEEP_REFERENCE_FALLBACK,
  WEIGHT_FORMULA,
  REFERENCE_SOURCES,
} from './reference-data.mjs';
import { cabeceraComun, navegacion, pie, escapar } from './guias-render.mjs';

const SITIO = 'https://lacty.es';

/** «Día 1», «Días 4–7», «Días 61–90». */
function rangoDias(fila) {
  return fila.dayFrom === fila.dayTo ? `Día ${fila.dayFrom}` : `Días ${fila.dayFrom}–${fila.dayTo}`;
}

const horas = (min) => (min % 60 === 0 ? `${min / 60} h` : `${Math.floor(min / 60)} h ${min % 60} min`);

export function renderReferencias() {
  const url = `${SITIO}/referencias`;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#pagina`,
        name: 'Referencias de alimentación y sueño del bebé',
        description: 'Los rangos orientativos de mililitros, número de tomas, horas de sueño y ventanas de vigilia que utiliza Lacty, con sus fuentes.',
        inLanguage: 'es-ES',
        url,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITIO}/` },
          { '@type': 'ListItem', position: 2, name: 'Referencias', item: url },
        ],
      },
    ],
  };

  const filasAlimentacion = FEEDING_REFERENCE.map((f) => `
        <tr>
          <td>${rangoDias(f)}</td>
          <td>${f.mlPerFeedMin}–${f.mlPerFeedMax} ml</td>
          <td>${f.feedsPerDayMin}–${f.feedsPerDayMax}</td>
          <td>${f.breastDailyMlMin ? `${f.breastDailyMlMin}–${f.breastDailyMlMax} ml` : '<span class="text-gray-300">—</span>'}</td>
        </tr>`).join('');

  const filasSueno = FEEDING_REFERENCE.map((f) => `
        <tr>
          <td>${rangoDias(f)}</td>
          <td>${f.sleepHoursMin}–${f.sleepHoursMax} h</td>
          <td>${horas(f.awakeWindowMaxMin)}</td>
        </tr>`).join('') + `
        <tr>
          <td>Más de 90 días</td>
          <td>${SLEEP_REFERENCE_FALLBACK.sleepHoursMin}–${SLEEP_REFERENCE_FALLBACK.sleepHoursMax} h</td>
          <td>${horas(SLEEP_REFERENCE_FALLBACK.awakeWindowMaxMin)}</td>
        </tr>`;

  const fuentes = REFERENCE_SOURCES.map((f) => `
        <div class="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 class="font-bold text-gray-900 mb-2">${escapar(f.bloque)}</h3>
          <p class="text-sm text-taupe-700 leading-relaxed mb-3">${escapar(f.detalle)}</p>
          <div class="flex flex-wrap gap-1.5">
            ${f.organizaciones.map((o) => `<span class="text-xs bg-cream-50 text-taupe-700 border border-cream-200 px-2 py-1 rounded-full">${escapar(o)}</span>`).join('\n            ')}
          </div>
        </div>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <title>Referencias de alimentación y sueño del bebé | Lacty</title>
  <meta name="description" content="Los rangos orientativos de mililitros, tomas al día, horas de sueño y ventanas de vigilia que usa Lacty para sus avisos, con las fuentes en las que se apoyan." />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
${cabeceraComun(`  <meta property="og:type" content="article" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:site_name" content="Lacty" />
  <meta property="og:title" content="Referencias de alimentación y sueño del bebé" />
  <meta property="og:description" content="Los rangos orientativos que usa Lacty y de dónde salen." />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${SITIO}/og-image.png" />`)}
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
      <span class="text-gray-500">Referencias</span>
    </nav>

    <article class="articulo">
      <h1>De dónde salen los números de Lacty</h1>
      <p class="text-sm text-taupe-600 -mt-2 mb-8">
        Estos son los rangos con los que la app te dice si el día va corto, en rango o por encima,
        y los que disparan los avisos de «lleva mucho sin comer» o «lleva mucho despierto».
      </p>

      <p class="text-sm text-taupe-600 bg-cream-50 border border-cream-200 rounded-2xl p-5 leading-relaxed mb-8">
        <strong class="text-gray-800">Son orientativos.</strong> Cada bebé tiene su ritmo y estos valores
        son medias estadísticas: sirven para hacerse una idea y para llevar datos a la consulta, no para
        decidir nada por tu cuenta. <strong class="text-gray-800">La indicación de tu pediatra, matrona o
        asesora de lactancia siempre manda sobre esta tabla.</strong>
      </p>

      <h2>Alimentación por días de vida</h2>
      <p>
        Durante la primera semana el límite es la capacidad del estómago, no el peso: el primer día
        apenas caben unos mililitros. Por eso ese tramo va por días.
      </p>
      <div class="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Edad</th>
              <th>ml por toma</th>
              <th>Tomas al día</th>
              <th>Leche materna al día</th>
            </tr>
          </thead>
          <tbody>${filasAlimentacion}
          </tbody>
        </table>
      </div>

      <h2>A partir del día ${WEIGHT_FORMULA.desdeDia}: la fórmula por peso</h2>
      <p>
        Cuando el estómago deja de ser el límite, lo que manda es el peso. Si has registrado uno,
        Lacty deja de usar la tabla y calcula el rango diario con la regla estándar para lactantes
        a término:
      </p>
      <blockquote><p><strong>${WEIGHT_FORMULA.mlPerKgMin} – ${WEIGHT_FORMULA.mlPerKgMax} ml por kilo de peso y día</strong></p></blockquote>
      <p>
        Los mililitros por toma salen de repartir ese total entre las tomas del día, así que el número
        de tomas y la cantidad de cada una no se pueden mirar por separado.
      </p>

      <h2>Sueño y ventanas de vigilia</h2>
      <p>
        La ventana de vigilia es el tiempo que un bebé aguanta despierto entre siesta y siesta sin
        sobrecansarse. Es el valor que usa Lacty para avisarte de que lleva demasiado rato despierto.
      </p>
      <div class="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Edad</th>
              <th>Sueño al día</th>
              <th>Ventana de vigilia</th>
            </tr>
          </thead>
          <tbody>${filasSueno}
          </tbody>
        </table>
      </div>

      <h2>Cómo se estiman los mililitros al pecho</h2>
      <p>
        Al pecho no se puede medir. Lacty parte de la producción diaria de referencia para la edad del
        bebé, la divide entre el número medio de tomas y, a partir de la tercera toma registrada,
        ajusta esa estimación comparando los minutos de cada toma con la media del propio bebé.
      </p>
      <p>
        Es una estimación, no una medición: la eficacia de la succión varía mucho entre bebés y entre
        tomas. Sirve para ver tendencias, no para tomar decisiones clínicas.
      </p>

      <h2>Fuentes</h2>
      <p>
        Los rangos siguen las guías pediátricas y de sueño infantil más habituales. Se citan las
        organizaciones en las que se apoyan; no se enlaza a documentos concretos para no atribuir
        cifras exactas a una publicación determinada.
      </p>
      <div class="grid gap-4 mb-6">
${fuentes}
      </div>

      <p class="text-sm text-taupe-600 bg-cream-50 border border-cream-200 rounded-2xl p-5 leading-relaxed">
        ¿Tu profesional te ha dado valores distintos? Son los que valen. Estos rangos son un punto de
        partida general, y Lacty no sustituye en ningún caso el seguimiento sanitario.
      </p>

      <aside class="mt-14 rounded-3xl bg-linear-to-br from-sage-50 to-lagoon-100 border border-sage-200/50 p-8 text-center">
        <p class="text-2xl mb-3" aria-hidden="true">👶</p>
        <h2 class="text-xl font-extrabold text-gray-900 mb-3">Lleva el seguimiento sin cuentas mentales</h2>
        <p class="text-taupe-700 leading-relaxed mb-6 max-w-lg mx-auto">
          Lacty compara lo que registras con estos rangos y te avisa si el día va corto.
          Gratis y sin instalar nada.
        </p>
        <a href="https://app.lacty.es?registro" class="btn-primary font-semibold px-7 py-3.5 rounded-xl text-base inline-flex items-center gap-2">
          Crear cuenta gratis
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </aside>
    </article>
  </main>

${pie}
</body>
</html>
`;
}
