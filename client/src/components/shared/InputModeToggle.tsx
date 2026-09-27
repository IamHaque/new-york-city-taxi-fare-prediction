type InputMode = 'manual' | 'describe';

interface InputModeToggleProps {
  mode: InputMode;
  onChange: (m: InputMode) => void;
  disabled?: boolean;
}

/**
 * InputModeToggle - mirrors the reference's `.view-toggle` / `.view-btn.active` pattern:
 * a small button group to switch between views of the same content, with the active button
 * getting a distinct background/border/color treatment.
 */
export function InputModeToggle({ mode, onChange, disabled }: InputModeToggleProps) {
  const baseClass = 'rounded-md border px-3 py-1.5 font-mono text-xs font-medium transition-colors';
  const activeClass = 'border-primary bg-primary/15 text-primary';
  const inactiveClass = 'border-border bg-transparent text-muted-foreground hover:border-primary';

  return (
    <div className="flex gap-1.5" role="group" aria-label="Input mode">
      <button
        type="button"
        className={`${baseClass} ${mode === 'manual' ? activeClass : inactiveClass}`}
        onClick={() => onChange('manual')}
        disabled={disabled}
      >
        Manual
      </button>
      <button
        type="button"
        className={`${baseClass} ${mode === 'describe' ? activeClass : inactiveClass}`}
        onClick={() => onChange('describe')}
        disabled={disabled}
      >
        Describe Trip
      </button>
    </div>
  );
}
