import { subscribe } from './pushNotifications';
import * as api from '../api';

export type ResultadoAvisos = 'ok' | 'denegado' | 'error';

/**
 * Pide permiso, se suscribe y guarda la suscripción en el servidor.
 *
 * Vive aparte de pushNotifications.ts, que es una envoltura de las APIs del
 * navegador y no habla con el servidor. Lo usan el alta y la bienvenida.
 */
export async function enablePush(): Promise<ResultadoAvisos> {
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return 'denegado';
    const vapidKey = await api.getPushVapidKey();
    const sub = await subscribe(vapidKey);
    if (sub) await api.savePushSubscription(sub);
    return 'ok';
  } catch {
    return 'error';
  }
}
