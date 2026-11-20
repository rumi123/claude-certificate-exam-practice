import type { Confidence } from '@/lib/types';

const CHOICES: { value: Confidence; label: string }[] = [
  { value: 'sure', label: 'Sure' },
  { value: 'unsure', label: 'Unsure' },
  { value: 'guess', label: 'Guess' },
];

export default function ConfidencePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: Confidence | null;
  onChange: (value: Confidence) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="mt-4 flex flex-wrap items-center gap-2">
      <legend className="mb-1 text-sm font-semibold">Confidence (required)</legend>
      {CHOICES.map((c) => (
        <label
          key={c.value}
          className={`flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft ${disabled ? '' : 'cursor-pointer hover:bg-surface-2'}`}
        >
          <input
            type="radio"
            name="confidence"
            disabled={disabled}
            checked={value === c.value}
            onChange={() => onChange(c.value)}
          />
          {c.label}
        </label>
      ))}
    </fieldset>
  );
}
