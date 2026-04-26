/** Toggle switch for a cookie consent category */
export function ConsentToggle({
  label,
  enabled,
  locked,
  onChange,
  disabled,
}: {
  label: string;
  enabled: boolean;
  locked?: boolean;
  onChange?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={locked ? undefined : onChange}
        disabled={disabled || locked}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
        } ${locked ? 'opacity-70 cursor-not-allowed' : disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-5' : ''
          }`}
        />
      </button>
      <span className="text-sm text-slate-800 dark:text-slate-200 select-none">{label}</span>
    </div>
  );
}
