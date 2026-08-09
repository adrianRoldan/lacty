#!/usr/bin/env node
/**
 * Mantiene el FAQPage del JSON-LD a partir de las preguntas visibles.
 *
 * Las preguntas frecuentes estaban escritas dos veces: en el HTML que lee la
 * gente y en el JSON-LD que lee Google. Cambiar una y olvidar la otra es fácil
 * —pasó al revisar el lenguaje inclusivo— y Google descarta los resultados
 * enriquecidos cuando el marcado no coincide con lo que se ve en la página.
 *
 * Aquí la fuente única es el HTML visible: los <details class="faq-item">.
 * El JSON-LD se regenera a partir de ellos.
 *
 *   node scripts/sync-faq-jsonld.mjs           reescribe el JSON-LD
 *   node scripts/sync-faq-jsonld.mjs --check   solo avisa si está desfasado
 *
 * Se ejecuta solo en `npm run build:landing`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = join(RAIZ, 'landing', 'index.html');

const soloComprobar = process.argv.includes('--check');

/** Quita etiquetas, resuelve entidades y colapsa los espacios. */
function aTextoPlano(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pregunta y respuesta de cada <details class="faq-item"> de la página. */
function leerPreguntasVisibles(html) {
  const preguntas = [];
  const bloques = html.matchAll(/<details class="faq-item[^"]*"[^>]*>([\s\S]*?)<\/details>/g);

  for (const [, cuerpo] of bloques) {
    const titulo = cuerpo.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    if (!titulo) continue;
    // La respuesta es todo lo que hay tras el </summary>
    const resto = cuerpo.split('</summary>')[1] ?? '';
    const respuesta = aTextoPlano(resto);
    if (!respuesta) continue;
    preguntas.push({
      '@type': 'Question',
      name: aTextoPlano(titulo[1]),
      acceptedAnswer: { '@type': 'Answer', text: respuesta },
    });
  }
  return preguntas;
}

const html = readFileSync(HTML, 'utf8');

const scriptJson = html.match(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/);
if (!scriptJson) {
  console.error('✘ No se encuentra el bloque JSON-LD en landing/index.html');
  process.exit(1);
}

const datos = JSON.parse(scriptJson[2]);
const faqPage = datos['@graph']?.find((n) => n['@type'] === 'FAQPage');
if (!faqPage) {
  console.error('✘ El JSON-LD no tiene ningún nodo FAQPage');
  process.exit(1);
}

const visibles = leerPreguntasVisibles(html);
if (visibles.length === 0) {
  console.error('✘ No se ha reconocido ninguna pregunta visible: ¿ha cambiado el marcado?');
  process.exit(1);
}

const iguales = JSON.stringify(faqPage.mainEntity) === JSON.stringify(visibles);

if (iguales) {
  console.log(`✓ JSON-LD al día (${visibles.length} preguntas)`);
  process.exit(0);
}

if (soloComprobar) {
  console.error(`✘ El JSON-LD no coincide con las preguntas visibles (${visibles.length} en la página).`);
  console.error('  Ejecuta: npm run build:landing');
  process.exit(1);
}

faqPage.mainEntity = visibles;

// Se conserva la sangría del fichero: el JSON-LD va indentado con dos espacios
// dentro del <head>.
const json = JSON.stringify(datos, null, 2).split('\n').map((l) => '  ' + l).join('\n');
const nuevo = html.replace(scriptJson[0], `${scriptJson[1]}\n${json}\n  ${scriptJson[3]}`);
writeFileSync(HTML, nuevo);

console.log(`✓ JSON-LD regenerado desde el HTML visible (${visibles.length} preguntas)`);
