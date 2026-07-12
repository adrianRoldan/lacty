import { useTheme } from '../theme';

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">
        Apariencia
      </label>
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {([
          { key: 'light', label: 'Claro', icon: '☀️' },
          { key: 'dark',  label: 'Noche', icon: '🌙' },
        ] as const).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setTheme(opt.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold touch-manipulation transition-colors ${
              theme === opt.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <span>{opt.icon}</span> {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        El modo noche reduce el brillo para usar la app con poca luz.
      </p>
    </div>
  );
}
