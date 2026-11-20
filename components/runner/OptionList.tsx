import { Check, X } from 'lucide-react';
import { InlineText } from '@/components/ui';

type Option = { key: string; letter: string; text: string };
type OptionResult = { key: string; isCorrect: boolean; selected: boolean };

function rowClass(result: OptionResult | undefined, disabled: boolean): string {
  if (result?.isCorrect) return 'border-good bg-good-soft';
  if (result?.selected) return 'border-weak bg-weak-soft';
  const picked = 'has-[:checked]:border-accent has-[:checked]:bg-accent-soft';
  return disabled
    ? `border-border ${picked}`
    : `cursor-pointer border-border hover:bg-surface-2 ${picked}`;
}

export default function OptionList(props: {
  options: Option[];
  type: 'single' | 'multi';
  selectCount: number;
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  results?: OptionResult[];
}) {
  const { options, type, selectCount, selected, onChange, disabled = false, results } = props;
  function toggle(key: string, checked: boolean) {
    if (type === 'single') onChange([key]);
    else onChange(checked ? [...selected, key] : selected.filter((k) => k !== key));
  }
  return (
    <fieldset className="mt-4 space-y-2">
      <legend className="mb-1 text-sm font-semibold">
        {type === 'multi' ? `Options (Select ${selectCount})` : 'Options'}
      </legend>
      {options.map((o) => {
        const result = results?.find((r) => r.key === o.key);
        return (
          // pr-9 keeps room for the result mark, so rows are the same height before and after.
          <label
            key={o.key}
            className={`relative flex items-start gap-3 rounded-xl border p-3 pr-9 ${rowClass(result, disabled)}`}
          >
            <input
              type={type === 'multi' ? 'checkbox' : 'radio'}
              name="option"
              className="mt-1"
              disabled={disabled}
              checked={selected.includes(o.key)}
              onChange={(e) => toggle(o.key, e.target.checked)}
            />
            <span>
              <span className="font-semibold">{o.letter}.</span> <InlineText text={o.text} />
            </span>
            {/* Sits on the top border so it never changes the row's height. */}
            {result?.selected && (
              <span
                data-testid="your-answer"
                className={`absolute -top-2 right-9 rounded-md px-1.5 text-xs font-semibold leading-4 ${
                  result.isCorrect ? 'bg-good text-surface' : 'bg-weak text-surface'
                }`}
              >
                Your answer
              </span>
            )}
            {result?.isCorrect && (
              <Check
                size={18}
                role="img"
                aria-label="Correct option"
                className="absolute right-3 top-3.5 text-good"
              />
            )}
            {result && !result.isCorrect && result.selected && (
              <X
                size={18}
                role="img"
                aria-label="Your answer, incorrect"
                className="absolute right-3 top-3.5 text-weak"
              />
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
