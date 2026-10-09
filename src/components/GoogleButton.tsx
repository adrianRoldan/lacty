import { useEffect, useRef } from 'react';

// Botón oficial de «Iniciar sesión con Google» (Google Identity Services).
// Google entrega un ID token firmado (`credential`) que se envía al servidor
// para que lo verifique; aquí no se toca ningún secreto.

interface GoogleIdApi {
  initialize: (opts: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: 'popup' | 'redirect' }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
}
declare global {
  interface Window { google?: { accounts: { id: GoogleIdApi } } }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error('No se pudo cargar Google')); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Props {
  clientId: string;
  /** Texto del botón: «Continuar con Google» o «Registrarse con Google». */
  text: 'continue_with' | 'signup_with';
  onCredential: (credential: string) => void;
}

export default function GoogleButton({ clientId, text, onCredential }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // El callback se registra una sola vez en Google; se lee siempre el último
  // para que vea el estado actual del formulario (código de invitación, etc.).
  const onCredentialRef = useRef(onCredential);
  useEffect(() => { onCredentialRef.current = onCredential; });

  useEffect(() => {
    let cancelado = false;
    loadScript().then(() => {
      const gid = window.google?.accounts.id;
      if (cancelado || !gid || !ref.current) return;
      gid.initialize({ client_id: clientId, callback: (r) => onCredentialRef.current(r.credential) });
      gid.renderButton(ref.current, {
        type: 'standard', theme: 'outline', size: 'large', shape: 'pill',
        text, locale: 'es', width: ref.current.offsetWidth || 320,
      });
    }).catch(() => { /* sin Google: queda el login normal */ });
    return () => { cancelado = true; };
  }, [clientId, text]);

  return <div ref={ref} className="w-full flex justify-center min-h-11" />;
}
