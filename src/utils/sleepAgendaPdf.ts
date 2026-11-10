import { jsPDF } from 'jspdf';
import type { Agenda, FilaAgenda } from './sleepAgenda';
import { CASILLAS_POR_DIA, MINUTOS_POR_CASILLA } from './sleepAgenda';

/**
 * Dibuja la agenda de sueño en A4 apaisado, con la misma disposición que la
 * hoja en papel del pediatra. Todo es vectorial: se imprime nítido y pesa poco.
 * Este módulo se carga bajo demanda para no sumar jsPDF al arranque de la app.
 */

export interface OpcionesPdf {
  nombre: string;
  desde: string;
  hasta: string;
}

type Rgb = [number, number, number];

const COLOR_SUENO: Rgb = [111, 208, 192];
const COLOR_BANDA: Rgb = [176, 176, 176];
const COLOR_CABECERA: Rgb = [90, 90, 90];
const COLOR_REJILLA: Rgb = [165, 165, 165];
const NEGRO: Rgb = [0, 0, 0];
const BLANCO: Rgb = [255, 255, 255];

const ANCHO_PAGINA = 297;
const ALTO_PAGINA = 210;
const MARGEN = 10;
const ANCHO_FECHA = 18;
const ANCHO_DF = 8;
const X_CASILLAS = MARGEN + ANCHO_FECHA + ANCHO_DF;
const ANCHO_CASILLA = (ANCHO_PAGINA - MARGEN - X_CASILLAS) / CASILLAS_POR_DIA;
const CASILLAS_POR_HORA = 60 / MINUTOS_POR_CASILLA;

const Y_TABLA = 31;
const ALTO_CABECERA = 6;
const ALTO_FILA = 7;
const FILAS_POR_PAGINA = 21;
const Y_LEYENDA = ALTO_PAGINA - MARGEN - 11;

const fechaCorta = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const fechaCompleta = (dia: string) => `${fechaCorta(dia)}/${dia.slice(0, 4)}`;
const centroCasilla = (casilla: number) => X_CASILLAS + (casilla + 0.5) * ANCHO_CASILLA;

function dibujarFlecha(doc: jsPDF, x: number, arriba: number, abajo: number) {
  const anchoPunta = 2.2;
  const altoPunta = 2.4;
  doc.setDrawColor(...NEGRO);
  doc.setFillColor(...NEGRO);
  doc.setLineWidth(0.45);
  doc.line(x, arriba, x, abajo - altoPunta + 0.2);
  doc.triangle(x - anchoPunta / 2, abajo - altoPunta, x + anchoPunta / 2, abajo - altoPunta, x, abajo, 'F');
}

function dibujarOjo(doc: jsPDF, x: number, y: number) {
  const ancho = 3.6;
  const alto = 2.6;
  const control = alto * (2 / 3); // con este control, la curva alcanza justo alto / 2
  doc.setDrawColor(...NEGRO);
  doc.setFillColor(...BLANCO);
  doc.setLineWidth(0.22);
  doc.lines(
    [
      [ancho * 0.3, -control, ancho * 0.7, -control, ancho, 0],
      [-ancho * 0.3, control, -ancho * 0.7, control, -ancho, 0],
    ],
    x - ancho / 2,
    y,
    [1, 1],
    'FD',
    true,
  );
  doc.setFillColor(...NEGRO);
  doc.circle(x, y, 0.62, 'F');
}

function dibujarBiberon(doc: jsPDF, x: number, y: number) {
  doc.setTextColor(...NEGRO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('B', x, y, { align: 'center', baseline: 'middle' });
}

function dibujarEncabezado(doc: jsPDF, op: OpcionesPdf) {
  doc.setFillColor(...COLOR_BANDA);
  doc.rect(MARGEN, MARGEN, ANCHO_PAGINA - 2 * MARGEN, 9, 'F');
  doc.setTextColor(...BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(op.nombre, MARGEN + 3, MARGEN + 6.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${fechaCompleta(op.desde)} a ${fechaCompleta(op.hasta)}`, ANCHO_PAGINA - MARGEN - 3, MARGEN + 6.2, { align: 'right' });

  doc.setTextColor(...NEGRO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AGENDA DE SUEÑO', MARGEN, Y_TABLA - 2.5);
}

function dibujarCabeceraTabla(doc: jsPDF) {
  doc.setFillColor(...COLOR_CABECERA);
  doc.rect(MARGEN, Y_TABLA, ANCHO_PAGINA - 2 * MARGEN, ALTO_CABECERA, 'F');
  doc.setTextColor(...BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const yTexto = Y_TABLA + 4.1;
  doc.text('FECHA', MARGEN + ANCHO_FECHA / 2, yTexto, { align: 'center' });
  doc.text('D/F', MARGEN + ANCHO_FECHA + ANCHO_DF / 2, yTexto, { align: 'center' });
  for (let hora = 0; hora < 24; hora++) {
    const x = X_CASILLAS + (hora + 0.5) * CASILLAS_POR_HORA * ANCHO_CASILLA;
    doc.text(String(hora), x, yTexto, { align: 'center' });
  }
}

function dibujarFila(doc: jsPDF, fila: FilaAgenda, y: number) {
  // Los tramos seguidos van en un solo rectángulo para que no se vean costuras.
  doc.setFillColor(...COLOR_SUENO);
  for (let i = 0; i < CASILLAS_POR_DIA; i++) {
    if (!fila.dormido[i]) continue;
    const inicio = i;
    while (i + 1 < CASILLAS_POR_DIA && fila.dormido[i + 1]) i++;
    doc.rect(X_CASILLAS + inicio * ANCHO_CASILLA, y, (i - inicio + 1) * ANCHO_CASILLA, ALTO_FILA, 'F');
  }

  doc.setTextColor(...NEGRO);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(fechaCorta(fila.dia), MARGEN + ANCHO_FECHA / 2, y + 4.8, { align: 'center' });
  if (fila.domingo) {
    doc.setFont('helvetica', 'bold');
    doc.text('D', MARGEN + ANCHO_FECHA + ANCHO_DF / 2, y + 4.8, { align: 'center' });
  }
}

function dibujarRejilla(doc: jsPDF, numFilas: number) {
  const yCuerpo = Y_TABLA + ALTO_CABECERA;
  const yFin = yCuerpo + numFilas * ALTO_FILA;
  const xFin = ANCHO_PAGINA - MARGEN;

  doc.setDrawColor(...COLOR_REJILLA);
  doc.setLineWidth(0.08);
  for (let i = 1; i < CASILLAS_POR_DIA; i++) {
    if (i % CASILLAS_POR_HORA === 0) continue;
    const x = X_CASILLAS + i * ANCHO_CASILLA;
    doc.line(x, yCuerpo, x, yFin);
  }

  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.3);
  for (let hora = 0; hora <= 24; hora++) {
    const x = X_CASILLAS + hora * CASILLAS_POR_HORA * ANCHO_CASILLA;
    doc.line(x, yCuerpo, x, yFin);
  }
  for (let f = 0; f <= numFilas; f++) {
    const y = yCuerpo + f * ALTO_FILA;
    doc.line(MARGEN, y, xFin, y);
  }
  doc.line(MARGEN, Y_TABLA, MARGEN, yFin);
  doc.line(MARGEN + ANCHO_FECHA, Y_TABLA, MARGEN + ANCHO_FECHA, yFin);
  doc.line(X_CASILLAS, Y_TABLA, X_CASILLAS, yFin);
}

function dibujarLeyenda(doc: jsPDF, pagina: number, totalPaginas: number) {
  const y = Y_LEYENDA;
  doc.setTextColor(...NEGRO);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  let x = MARGEN;
  doc.setFillColor(...COLOR_SUENO);
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.2);
  doc.rect(x, y - 3, 6, 4, 'FD');
  doc.text('Durmiendo', x + 8, y);

  x += 30;
  doc.rect(x, y - 3, 6, 4, 'D');
  doc.text('Despierto', x + 8, y);

  x += 30;
  dibujarFlecha(doc, x + 1.5, y - 3.4, y + 1.2);
  doc.text('Se le ofrece dormir', x + 5, y);

  x += 40;
  dibujarOjo(doc, x + 2, y - 1);
  doc.text('Microdespertar', x + 6, y);

  x += 34;
  dibujarBiberon(doc, x + 1.5, y - 1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Biberón', x + 5, y);

  x += 24;
  doc.text('D: domingo', x, y);

  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Cada casilla son ${MINUTOS_POR_CASILLA} minutos y se rellena si durmió al menos la mitad. Generado con Lacty el ${new Date().toLocaleDateString('es-ES')}.`,
    MARGEN,
    y + 6,
  );
  if (totalPaginas > 1) {
    doc.text(`Página ${pagina} de ${totalPaginas}`, ANCHO_PAGINA - MARGEN, y + 6, { align: 'right' });
  }
}

export function generarAgendaPdf(agenda: Agenda, op: OpcionesPdf): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `Agenda de sueño de ${op.nombre}` });

  const totalPaginas = Math.max(1, Math.ceil(agenda.filas.length / FILAS_POR_PAGINA));

  for (let pagina = 0; pagina < totalPaginas; pagina++) {
    if (pagina > 0) doc.addPage();
    const filas = agenda.filas.slice(pagina * FILAS_POR_PAGINA, (pagina + 1) * FILAS_POR_PAGINA);
    const yCuerpo = Y_TABLA + ALTO_CABECERA;

    dibujarEncabezado(doc, op);
    dibujarCabeceraTabla(doc);
    filas.forEach((fila, i) => dibujarFila(doc, fila, yCuerpo + i * ALTO_FILA));
    dibujarRejilla(doc, filas.length);

    // Las marcas van después de la rejilla para que ninguna línea las cruce.
    filas.forEach((fila, i) => {
      const y = yCuerpo + i * ALTO_FILA;
      fila.flechas.forEach((c) => dibujarFlecha(doc, centroCasilla(c), y + 0.7, y + ALTO_FILA - 0.7));
      fila.microdespertares.forEach((c) => dibujarOjo(doc, centroCasilla(c), y + ALTO_FILA / 2));
      fila.biberones.forEach((c) => {
        // Si coincide con otra marca en la misma casilla, la «B» se aparta para que se lea.
        const ocupada = fila.flechas.includes(c) || fila.microdespertares.includes(c);
        const x = centroCasilla(c) - (ocupada ? 2.2 : 0);
        dibujarBiberon(doc, x, y + ALTO_FILA / 2);
      });
    });

    dibujarLeyenda(doc, pagina + 1, totalPaginas);
  }

  return doc.output('blob');
}
