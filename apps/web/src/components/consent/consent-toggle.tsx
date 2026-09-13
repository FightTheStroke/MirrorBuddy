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
    <div className="flex min-h-11 items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={locked ? undefined : onChange}
        disabled={disabled || locked}
        className={`relative h-11 w-11 shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 ${
          locked
            ? 'opacity-70 cursor-not-allowed'
            : disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-0 top-1/2 h-6 w-11 -translate-y-1/2 rounded-full transition-colors ${
            enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5' : ''
            }`}
          />
        </span>
      </button>
      <span className="text-sm text-slate-800 dark:text-slate-200 select-none">{label}</span>
    </div>
  );
}
