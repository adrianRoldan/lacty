import { useState } from 'react';

/**
 * Campo de contraseña con el ojo para verla en claro: el administrador teclea
 * contraseñas que luego tiene que dictar a la familia, y en el login se falla
 * mucho al teclear a ciegas en el móvil. Empieza siempre oculta y vuelve a
 * ocultarse al desmontarse (cerrar la hoja o el formulario).
 */
export default function PasswordInput({ value, onChange, placeholder, required, autoComplete = 'new-password', className = '' }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input
        type={visible ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete} autoCapitalize="none" autoCorrect="off" spellCheck={false}
        placeholder={placeholder} required={required}
        className="w-full border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
      />
      <button
        type="button" onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 text-gray-400 active:text-gray-600 touch-manipulation"
      >
        <svg
          width={20} height={20} viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Ojo abierto; al estar visible se tacha con una barra diagonal */}
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M4 20 20 4" />}
        </svg>
      </button>
    </div>
  );
}
