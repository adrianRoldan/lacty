/**
 * Datos de referencia orientativos: ÚNICA fuente de verdad.
 *
 * Los usan la app (src/data/referenceTable.ts, que añade los tipos y los
 * cálculos), los avisos push del servidor y la página pública
 * lacty.es/referencias. Si se tocan aquí, cambian en todos a la vez.
 *
 * IMPORTANTE: son valores orientativos, no un diagnóstico. La indicación de
 * tu pediatra, matrona o asesora de lactancia siempre manda sobre esta tabla.
 *
 * Revisado en octubre de 2026 contra las fuentes de REFERENCE_SOURCES (abajo).
 * De dónde sale cada columna:
 *
 * - ml por toma, días 1–4: ingesta media de calostro por toma en bebés a
 *   término sanos (ABM, protocolo n.º 3, rev. 2017, tabla 2): 2–10 ml en las
 *   primeras 24 h, 5–15 ml de 24 a 48 h, 15–30 ml de 48 a 72 h y 30–60 ml de
 *   72 a 96 h. El «día 1» de la app es el día del nacimiento.
 * - ml por toma, a partir de la semana: AAP (healthychildren.org, 2022): no
 *   más de 30–60 ml la primera semana; 90–120 ml a final del primer mes;
 *   180–240 ml a los 6 meses.
 * - Tomas al día: AAP, 8–12 al pecho durante el primer mes (10–12 lo más
 *   habitual). Después las tomas se espacian: con biberón, cada 3–4 h; al
 *   pecho siguen siendo muchas más (Kent 2006: 11 ± 3 al día de 1 a 6 meses,
 *   rango 6–18). Por eso el máximo se queda en 12: el mínimo es el del
 *   biberón y el máximo, el del pecho.
 * - Leche materna al día (solo para estimar las tomas al pecho): Neville
 *   1988 (≈500 ml el día 5, 600–700 ml hacia el día 8, ≈750 ml a los 3–5
 *   meses) y la tabla 15-1 de la EPA (media 510 ml/día el primer mes, 690 de
 *   1 a 3 meses y 770 de 3 a 6 meses; Kent 2006: 750–800 ml de 1 a 6 meses).
 * - Sueño: National Sleep Foundation (2015), 14–17 h de 0 a 3 meses (hasta
 *   cumplir los 4) y 12–15 h de 4 a 11 meses. La AASM (2016) da 12–16 h de 4
 *   a 12 meses y no fija cifra por debajo de los 4 meses.
 * - Ventana de vigilia: NO hay una guía oficial. Se usa el extremo alto de
 *   los rangos de la Cleveland Clinic (2024): 0,5–1 h el primer mes, 1–2 h
 *   de 1 a 3 meses, 1,25–2,5 h de 3 a 4 meses y 2–4 h de 5 a 7 meses.
 */

/** Alimentación y sueño por días de vida. */
export const FEEDING_REFERENCE = [
  { dayFrom: 1,  dayTo: 1,   mlPerFeedMin: 2,   mlPerFeedMax: 10,  feedsPerDayMin: 8, feedsPerDayMax: 12, sleepHoursMin: 14, sleepHoursMax: 17, awakeWindowMaxMin: 60 },
  { dayFrom: 2,  dayTo: 2,   mlPerFeedMin: 5,   mlPerFeedMax: 15,  feedsPerDayMin: 8, feedsPerDayMax: 12, sleepHoursMin: 14, sleepHoursMax: 17, awakeWindowMaxMin: 60 },
  { dayFrom: 3,  dayTo: 3,   mlPerFeedMin: 15,  mlPerFeedMax: 30,  feedsPerDayMin: 8, feedsPerDayMax: 12, sleepHoursMin: 14, sleepHoursMax: 17, awakeWindowMaxMin: 60 },
  { dayFrom: 4,  dayTo: 7,   mlPerFeedMin: 30,  mlPerFeedMax: 60,  feedsPerDayMin: 8, feedsPerDayMax: 12, sleepHoursMin: 14, sleepHoursMax: 17, awakeWindowMaxMin: 60 },
  { dayFrom: 8,  dayTo: 14,  mlPerFeedMin: 60,  mlPerFeedMax: 90,  feedsPerDayMin: 8, feedsPerDayMax: 12, breastDailyMlMin: 502, breastDailyMlMax: 725, sleepHoursMin: 14, sleepHoursMax: 17, awakeWindowMaxMin: 60 },
  { dayFrom: 15, dayTo: 28,  mlPerFeedMin: 80,  mlPerFeedMax: 120, feedsPerDayMin: 8, feedsPerDayMax: 12, breastDailyMlMin: 502, breastDailyMlMax: 725, sleepHoursMin: 14, sleepHoursMax: 17, awakeWindowMaxMin: 60 },
  { dayFrom: 29, dayTo: 60,  mlPerFeedMin: 90,  mlPerFeedMax: 150, feedsPerDayMin: 7, feedsPerDayMax: 12, breastDailyMlMin: 600, breastDailyMlMax: 900, sleepHoursMin: 14, sleepHoursMax: 17, awakeWindowMaxMin: 90 },
  { dayFrom: 61, dayTo: 90,  mlPerFeedMin: 120, mlPerFeedMax: 180, feedsPerDayMin: 6, feedsPerDayMax: 12, breastDailyMlMin: 600, breastDailyMlMax: 900, sleepHoursMin: 14, sleepHoursMax: 17, awakeWindowMaxMin: 120 },
  { dayFrom: 91, dayTo: 120, mlPerFeedMin: 120, mlPerFeedMax: 180, feedsPerDayMin: 6, feedsPerDayMax: 12, breastDailyMlMin: 600, breastDailyMlMax: 900, sleepHoursMin: 14, sleepHoursMax: 17, awakeWindowMaxMin: 150 },
];

/** Último día de vida que cubre la tabla; a partir de ahí, los valores de abajo. */
export const ULTIMO_DIA_TABLA = FEEDING_REFERENCE[FEEDING_REFERENCE.length - 1].dayTo;

/** Sueño para edades fuera de la tabla (a partir de los 4 meses). */
export const SLEEP_REFERENCE_FALLBACK = {
  sleepHoursMin: 12,
  sleepHoursMax: 15,
  awakeWindowMaxMin: 180,
};

/**
 * Tiempo máximo entre tomas fuera de la tabla (a partir de los 4 meses): 4 h,
 * el intervalo habitual con biberón a esa edad (AAP: 4–5 tomas al día a los
 * 6 meses). Antes la app usaba 3 h y los avisos push 4 h para la misma edad.
 */
export const MAX_ENTRE_TOMAS_FUERA_DE_TABLA_MIN = 240;

/**
 * De noche se espera al menos esto antes de avisar: la AAP pide no pasar de
 * 2–3 horas sin comer de día ni de 4 horas de noche.
 */
export const MIN_SIN_COMER_DE_NOCHE_MIN = 240;

/** Franja nocturna por defecto (se puede cambiar en la ficha del bebé). */
export const NOCHE_INICIO_POR_DEFECTO = '20:30';
export const NOCHE_FIN_POR_DEFECTO = '07:00';

/** ¿Cae esta hora dentro de la franja nocturna? La franja puede cruzar la medianoche. */
export function esFranjaNocturna(fecha, inicio = NOCHE_INICIO_POR_DEFECTO, fin = NOCHE_FIN_POR_DEFECTO) {
  const aMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const ini = aMin(inicio || NOCHE_INICIO_POR_DEFECTO);
  const f = aMin(fin || NOCHE_FIN_POR_DEFECTO);
  const min = fecha.getHours() * 60 + fecha.getMinutes();
  return ini > f ? (min >= ini || min < f) : (min >= ini && min < f);
}

/**
 * Minutos máximos sin comer antes de avisar. De día, 24 h entre el mínimo de
 * tomas diarias de su edad (el primer mes, 3 h). De noche, al menos 4 h, como
 * recomienda la AAP. Lo comparten la app y los avisos push.
 */
export function maxMinutosEntreTomas(diasDeVida, { deNoche = false } = {}) {
  const fila = FEEDING_REFERENCE.find((r) => diasDeVida >= r.dayFrom && diasDeVida <= r.dayTo);
  const deDia = fila ? Math.round((24 * 60) / fila.feedsPerDayMin) : MAX_ENTRE_TOMAS_FUERA_DE_TABLA_MIN;
  return deNoche ? Math.max(deDia, MIN_SIN_COMER_DE_NOCHE_MIN) : deDia;
}

/** Ventana de vigilia máxima (minutos) para su edad. */
export function ventanaVigiliaMaxima(diasDeVida) {
  const fila = FEEDING_REFERENCE.find((r) => diasDeVida >= r.dayFrom && diasDeVida <= r.dayTo);
  return fila?.awakeWindowMaxMin ?? SLEEP_REFERENCE_FALLBACK.awakeWindowMaxMin;
}

/**
 * Fórmula por peso que se aplica a partir del día 7, si hay peso registrado.
 * AAP: unos 75 ml por libra y día (≈165 ml/kg); NHS: 150–200 ml/kg. El
 * techo diario es el de la AAP: no más de unos 960 ml (32 oz) en 24 h.
 */
export const WEIGHT_FORMULA = {
  mlPerKgMin: 150,
  mlPerKgMax: 180,
  desdeDia: 7,
  maxDailyMl: 960,
};

/** De dónde sale cada bloque de valores, con enlace a la fuente consultada. */
export const REFERENCE_SOURCES = [
  {
    bloque: 'Mililitros por toma en los primeros días',
    detalle:
      'Los cuatro primeros días manda el estómago, no el peso. Las cantidades son las ingestas medias ' +
      'de calostro por toma en bebés a término sanos: 2–10 ml el primer día, 5–15 ml el segundo, ' +
      '15–30 ml el tercero y 30–60 ml el cuarto.',
    fuentes: [
      { texto: 'Academy of Breastfeeding Medicine, protocolo clínico n.º 3 (revisión 2017), tabla 2', url: 'https://www.bfmed.org/assets/DOCUMENTS/PROTOCOLS/3-supplementation-protocol-english.pdf' },
    ],
  },
  {
    bloque: 'Mililitros al día según el peso',
    detalle:
      `A partir del día ${WEIGHT_FORMULA.desdeDia}, ${WEIGHT_FORMULA.mlPerKgMin}–${WEIGHT_FORMULA.mlPerKgMax} ml por kilo y día. ` +
      'La AAP calcula unos 75 ml por libra de peso (≈165 ml/kg) y el NHS británico, 150–200 ml/kg hasta los 6 meses. ' +
      `Como tope, la AAP aconseja no pasar de unos ${WEIGHT_FORMULA.maxDailyMl} ml al día.`,
    fuentes: [
      { texto: 'American Academy of Pediatrics — Amount and Schedule of Baby Formula Feedings (2022)', url: 'https://www.healthychildren.org/English/ages-stages/baby/formula-feeding/Pages/Amount-and-Schedule-of-Formula-Feedings.aspx' },
      { texto: 'NHS (Nottinghamshire Healthcare NHS Foundation Trust) — Formula feeding', url: 'https://www.nottinghamshirehealthcare.nhs.uk/bis-formula-feeding/' },
    ],
  },
  {
    bloque: 'Número de tomas y horas entre tomas',
    detalle:
      'Durante el primer mes, 8–12 tomas al día, sin pasar de 2–3 horas de día ni de 4 de noche. Después ' +
      'se espacian: con biberón, cada 3–4 horas; al pecho siguen siendo frecuentes (de 6 a 18 al día ' +
      'entre el mes y los 6 meses). El aviso de «lleva mucho sin comer» usa de día 24 horas entre el mínimo ' +
      'de tomas de su edad y, de noche, al menos 4 horas.',
    fuentes: [
      { texto: 'American Academy of Pediatrics — How Often to Breastfeed', url: 'https://www.healthychildren.org/English/ages-stages/baby/breastfeeding/Pages/How-Often-to-Breastfeed.aspx' },
      { texto: 'American Academy of Pediatrics — How Often and How Much Should Your Baby Eat? (2024)', url: 'https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/how-often-and-how-much-should-your-baby-eat.aspx' },
      { texto: 'Kent JC et al. Pediatrics 2006;117:e387 (tomas y volumen al pecho de 1 a 6 meses)', url: 'https://pubmed.ncbi.nlm.nih.gov/16510619/' },
    ],
  },
  {
    bloque: 'Producción de leche materna',
    detalle:
      'Unos 500–725 ml al día entre la primera y la cuarta semana, y unos 600–900 ml a partir del mes. ' +
      'Las medias publicadas son 510 ml/día el primer mes, 690 de 1 a 3 meses y 770 de 3 a 6 meses. ' +
      'Se usa solo para estimar de forma orientativa los mililitros de una toma al pecho, que no se pueden medir.',
    fuentes: [
      { texto: 'Neville MC et al. Am J Clin Nutr 1988;48:1375 (volúmenes desde el parto)', url: 'https://pubmed.ncbi.nlm.nih.gov/3202087/' },
      { texto: 'U.S. EPA — Exposure Factors Handbook, cap. 15, tabla 15-1 (ingesta de leche materna)', url: 'https://www.epa.gov/sites/default/files/2015-09/documents/efh-chapter15.pdf' },
    ],
  },
  {
    bloque: 'Horas de sueño',
    detalle:
      '14–17 horas al día de 0 a 3 meses (hasta cumplir los 4) y 12–15 horas de 4 a 11 meses, según la ' +
      'National Sleep Foundation. La Academia Americana de Medicina del Sueño da 12–16 horas de 4 a 12 meses ' +
      'y no fija cifra antes de los 4 meses por falta de evidencia.',
    fuentes: [
      { texto: 'National Sleep Foundation — Sleep Duration Recommendations', url: 'https://www.thensf.org/sleep-duration-recommendations/' },
      { texto: 'Paruthi S et al. J Clin Sleep Med 2016;12(6):785 (consenso de la AASM)', url: 'https://aasm.org/resources/pdf/pediatricsleepdurationconsensus.pdf' },
    ],
  },
  {
    bloque: 'Ventanas de vigilia',
    detalle:
      'No existe una guía oficial sobre ventanas de vigilia. Lacty usa el extremo alto de los rangos que ' +
      'publica la Cleveland Clinic: hasta 1 hora el primer mes, hasta 2 horas de 1 a 3 meses (Lacty avisa a ' +
      'la hora y media durante el segundo mes) y hasta 2 horas y media de 3 a 4 meses.',
    fuentes: [
      { texto: 'Cleveland Clinic — Baby Wake Windows by Age (2024)', url: 'https://health.clevelandclinic.org/wake-windows-by-age' },
    ],
  },
];
