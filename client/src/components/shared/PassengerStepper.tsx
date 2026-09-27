import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MIN_PASSENGERS, MAX_PASSENGERS } from '@/utils/validators';

interface PassengerStepperProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * PassengerStepper - direct port of the reference's `.score-row` + `.step-btn` pattern:
 * a bordered numeric field flanked by small increment/decrement buttons, value in mono font.
 */
export function PassengerStepper({ value, onChange, disabled }: PassengerStepperProps) {
  function step(delta: number) {
    const next = value + delta;
    if (next >= MIN_PASSENGERS && next <= MAX_PASSENGERS) onChange(next);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-6 w-6 rounded"
        disabled={disabled || value <= MIN_PASSENGERS}
        onClick={() => step(-1)}
        aria-label="Decrease passenger count"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <input
        type="number"
        readOnly
        value={value}
        className="w-12 rounded border border-border bg-secondary py-1 text-center font-mono text-lg font-semibold text-foreground"
        aria-label="Passenger count"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-6 w-6 rounded"
        disabled={disabled || value >= MAX_PASSENGERS}
        onClick={() => step(1)}
        aria-label="Increase passenger count"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
