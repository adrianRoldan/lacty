/**
 * Datos de referencia orientativos: ÚNICA fuente de verdad.
 *
 * Los usan la app (src/data/referenceTable.ts, que añade los tipos y los
 * cálculos) y la página pública lacty.es/referencias, que sirve el servidor.
 * Si se tocan aquí, cambian en los dos sitios a la vez.
 *
 * IMPORTANTE: son valores orientativos, no un diagnóstico. La indicación de
 * tu pediatra, matrona o asesora de lactancia siempre manda sobre esta tabla.
 */

/** Alimentación y sueño por días de vida. */
export const FEEDING_REFERENCE = [
  { dayFrom: 1,  dayTo: 1,  mlPerFeedMin: 5,   mlPerFeedMax: 10,  feedsPerDayMin: 8, feedsPerDayMax: 12, sleepHoursMin: 14, sleepHoursMax: 18, awakeWindowMaxMin: 60 },
  { dayFrom: 2,  dayTo: 2,  mlPerFeedMin: 10,  mlPerFeedMax: 20,  feedsPerDayMin: 8, feedsPerDayMax: 12, sleepHoursMin: 14, sleepHoursMax: 18, awakeWindowMaxMin: 60 },
  { dayFrom: 3,  dayTo: 3,  mlPerFeedMin: 20,  mlPerFeedMax: 30,  feedsPerDayMin: 8, feedsPerDayMax: 12, sleepHoursMin: 14, sleepHoursMax: 18, awakeWindowMaxMin: 60 },
  { dayFrom: 4,  dayTo: 7,  mlPerFeedMin: 30,  mlPerFeedMax: 60,  feedsPerDayMin: 8, feedsPerDayMax: 12, sleepHoursMin: 14, sleepHoursMax: 18, awakeWindowMaxMin: 60 },
  { dayFrom: 8,  dayTo: 14, mlPerFeedMin: 60,  mlPerFeedMax: 90,  feedsPerDayMin: 8, feedsPerDayMax: 12, breastDailyMlMin: 502, breastDailyMlMax: 725, sleepHoursMin: 14, sleepHoursMax: 18, awakeWindowMaxMin: 60 },
  { dayFrom: 15, dayTo: 28, mlPerFeedMin: 80,  mlPerFeedMax: 120, feedsPerDayMin: 8, feedsPerDayMax: 10, breastDailyMlMin: 502, breastDailyMlMax: 725, sleepHoursMin: 14, sleepHoursMax: 18, awakeWindowMaxMin: 60 },
  { dayFrom: 29, dayTo: 60, mlPerFeedMin: 100, mlPerFeedMax: 150, feedsPerDayMin: 7, feedsPerDayMax: 9,  breastDailyMlMin: 600, breastDailyMlMax: 900, sleepHoursMin: 14, sleepHoursMax: 17, awakeWindowMaxMin: 90 },
  { dayFrom: 61, dayTo: 90, mlPerFeedMin: 120, mlPerFeedMax: 180, feedsPerDayMin: 6, feedsPerDayMax: 8,  breastDailyMlMin: 600, breastDailyMlMax: 900, sleepHoursMin: 13, sleepHoursMax: 16, awakeWindowMaxMin: 120 },
];

/** Sueño para edades fuera de la tabla (más de 3 meses). */
export const SLEEP_REFERENCE_FALLBACK = {
  sleepHoursMin: 12,
  sleepHoursMax: 15,
  awakeWindowMaxMin: 180,
};

/** Fórmula por peso que se aplica a partir del día 7, si hay peso registrado. */
export const WEIGHT_FORMULA = {
  mlPerKgMin: 150,
  mlPerKgMax: 180,
  desdeDia: 7,
};

/**
 * De dónde sale cada bloque de valores.
 *
 * Se citan las organizaciones cuyas guías se han seguido, sin enlazar a
 * documentos concretos para no atribuir cifras exactas a una publicación que
 * no se ha verificado una por una.
 */
export const REFERENCE_SOURCES = [
  {
    bloque: 'Mililitros por toma y al día',
    detalle:
      'La regla de 150–180 ml por kilo y día en lactantes a término es la que recogen las guías ' +
      'de la Organización Mundial de la Salud y de la Academia Americana de Pediatría. Durante los ' +
      'primeros días manda la capacidad del estómago, no el peso, así que esos tramos siguen la tabla por días.',
    organizaciones: ['Organización Mundial de la Salud (OMS)', 'American Academy of Pediatrics (AAP)'],
  },
  {
    bloque: 'Número de tomas al día',
    detalle:
      'Entre 8 y 12 tomas diarias en las primeras semanas, bajando de forma progresiva conforme ' +
      'crecen las tomas, según las recomendaciones habituales de lactancia a demanda.',
    organizaciones: ['OMS / UNICEF', 'Asociación Española de Pediatría (AEP)'],
  },
  {
    bloque: 'Producción de leche materna',
    detalle:
      'Unos 500–725 ml al día entre la primera y la cuarta semana, y unos 600–900 ml a partir del mes, ' +
      'cuando la producción se estabiliza en lactancia materna exclusiva. Se usa solo para estimar ' +
      'de forma orientativa los mililitros de una toma al pecho, que no se pueden medir.',
    organizaciones: ['Literatura sobre lactancia materna exclusiva', 'OMS'],
  },
  {
    bloque: 'Horas de sueño y ventanas de vigilia',
    detalle:
      'Las horas totales de sueño por edad siguen las recomendaciones de la National Sleep Foundation ' +
      'y de la Academia Americana de Medicina del Sueño. Las ventanas de vigilia son las que manejan ' +
      'habitualmente las guías de sueño infantil.',
    organizaciones: ['National Sleep Foundation', 'American Academy of Sleep Medicine (AASM)'],
  },
];
