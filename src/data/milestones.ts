export type MilestoneCategory = 'motor' | 'social' | 'cognitive' | 'language' | 'sensory';

export interface Milestone {
  id: string;
  text: string;
  category: MilestoneCategory;
}

export interface MilestoneGroup {
  monthFrom: number;
  monthTo: number;
  label: string;
  milestones: Milestone[];
}

export const MILESTONES: MilestoneGroup[] = [
  {
    monthFrom: 0, monthTo: 1, label: '0–1 mes',
    milestones: [
      { id: 'm0-1', text: 'Levanta brevemente la cabeza boca abajo', category: 'motor' },
      { id: 'm0-2', text: 'Mueve brazos y piernas de forma simétrica', category: 'motor' },
      { id: 'm0-3', text: 'Agarra un dedo con fuerza (reflejo prensil)', category: 'motor' },
      { id: 'm0-4', text: 'Se calma al oír la voz de sus padres', category: 'social' },
      { id: 'm0-5', text: 'Fija brevemente la mirada en caras cercanas', category: 'sensory' },
      { id: 'm0-6', text: 'Reacciona a sonidos fuertes (se sobresalta)', category: 'sensory' },
      { id: 'm0-7', text: 'Emite sonidos guturales (gorjeos)', category: 'language' },
    ],
  },
  {
    monthFrom: 1, monthTo: 2, label: '1–2 meses',
    milestones: [
      { id: 'm1-1', text: 'Sostiene la cabeza unos segundos boca abajo', category: 'motor' },
      { id: 'm1-2', text: 'Abre y cierra las manos', category: 'motor' },
      { id: 'm1-3', text: 'Primera sonrisa social (en respuesta a una cara)', category: 'social' },
      { id: 'm1-4', text: 'Sigue objetos con la mirada (arco de 90°)', category: 'sensory' },
      { id: 'm1-5', text: 'Emite sonidos vocálicos ("aaa", "ooo")', category: 'language' },
      { id: 'm1-6', text: 'Presta atención a caras', category: 'cognitive' },
      { id: 'm1-7', text: 'Se lleva las manos a la boca', category: 'motor' },
    ],
  },
  {
    monthFrom: 2, monthTo: 3, label: '2–3 meses',
    milestones: [
      { id: 'm2-1', text: 'Levanta la cabeza y el pecho boca abajo (mini-cobra)', category: 'motor' },
      { id: 'm2-2', text: 'Sigue objetos en un arco de 180°', category: 'sensory' },
      { id: 'm2-3', text: 'Sonríe espontáneamente a personas', category: 'social' },
      { id: 'm2-4', text: 'Gorjea y "conversa" en turnos (proto-conversación)', category: 'language' },
      { id: 'm2-5', text: 'Junta las manos en la línea media', category: 'motor' },
      { id: 'm2-6', text: 'Reconoce caras familiares a distancia', category: 'cognitive' },
      { id: 'm2-7', text: 'Empieza a aburrirse si no hay estímulos (llora o se queja)', category: 'cognitive' },
    ],
  },
  {
    monthFrom: 3, monthTo: 4, label: '3–4 meses',
    milestones: [
      { id: 'm3-1', text: 'Sostiene la cabeza firme sin apoyo', category: 'motor' },
      { id: 'm3-2', text: 'Empuja con los pies cuando se le pone de pie sobre superficie', category: 'motor' },
      { id: 'm3-3', text: 'Agarra y sacude juguetes', category: 'motor' },
      { id: 'm3-4', text: 'Ríe a carcajadas', category: 'social' },
      { id: 'm3-5', text: 'Imita algunos sonidos y expresiones faciales', category: 'language' },
      { id: 'm3-6', text: 'Llora de formas distintas según la necesidad', category: 'language' },
      { id: 'm3-7', text: 'Muestra interés por juguetes nuevos (los mira y alcanza)', category: 'cognitive' },
      { id: 'm3-8', text: 'Sigue objetos en movimiento con fluidez', category: 'sensory' },
    ],
  },
  {
    monthFrom: 4, monthTo: 5, label: '4–5 meses',
    milestones: [
      { id: 'm4-1', text: 'Rueda de boca abajo a boca arriba', category: 'motor' },
      { id: 'm4-2', text: 'Se sostiene sentado con apoyo', category: 'motor' },
      { id: 'm4-3', text: 'Se lleva objetos a la boca para explorarlos', category: 'cognitive' },
      { id: 'm4-4', text: 'Responde a su nombre girando la cabeza', category: 'language' },
      { id: 'm4-5', text: 'Balbucea cadenas de consonantes ("ba-ba", "ma-ma")', category: 'language' },
      { id: 'm4-6', text: 'Muestra alegría al ver a quienes le cuidan', category: 'social' },
      { id: 'm4-7', text: 'Intenta alcanzar objetos con una mano', category: 'motor' },
      { id: 'm4-8', text: 'Distingue colores y observa objetos pequeños', category: 'sensory' },
    ],
  },
  {
    monthFrom: 5, monthTo: 6, label: '5–6 meses',
    milestones: [
      { id: 'm5-1', text: 'Rueda en ambas direcciones', category: 'motor' },
      { id: 'm5-2', text: 'Se sienta sin apoyo unos segundos', category: 'motor' },
      { id: 'm5-3', text: 'Pasa objetos de una mano a otra', category: 'motor' },
      { id: 'm5-4', text: 'Reconoce caras familiares vs extraños', category: 'social' },
      { id: 'm5-5', text: 'Responde a emociones de otros (sonríe si le sonríen)', category: 'social' },
      { id: 'm5-6', text: 'Le gusta mirarse en el espejo', category: 'cognitive' },
      { id: 'm5-7', text: 'Balbuceo variado con entonación', category: 'language' },
      { id: 'm5-8', text: 'Explora objetos con las manos, golpeándolos', category: 'cognitive' },
    ],
  },
];

export const CATEGORY_META: Record<MilestoneCategory, { icon: string; label: string; color: string }> = {
  motor:     { icon: '🏃', label: 'Motor',      color: 'blue' },
  social:    { icon: '😊', label: 'Social',     color: 'pink' },
  cognitive: { icon: '🧠', label: 'Cognitivo',  color: 'purple' },
  language:  { icon: '🗣️', label: 'Lenguaje',   color: 'amber' },
  sensory:   { icon: '👁️', label: 'Sensorial',  color: 'green' },
};
