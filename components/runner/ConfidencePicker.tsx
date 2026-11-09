import type { Confidence } from '@/lib/types';

const CHOICES: { value: Confidence; label: string }[] = [
  { value: 'sure', label: 'Sure' },
  { value: 'unsure', label: 'Unsure' },
  { value: 'guess', label: 'Guess' },
];

export default function ConfidencePicker({
  value,
  onChange,
}: {
  value: Confidence | null;
  onChange: (value: Confidence) => void;
}) {
  return (
    <fieldset className="mt-4 flex flex-wrap items-center gap-2">
      <legend className="mb-1 text-sm font-semibold">Confidence (required)</legend>
      {CHOICES.map((c) => (
        <label
          key={c.value}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1 text-sm hover:bg-surface-2 has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
        >
          <input
            type="radio"
            name="confidence"
            checked={value === c.value}
            onChange={() => onChange(c.value)}
          />
          {c.label}
        </label>
      ))}
    </fieldset>
  );
}
