import { InlineText } from '@/components/ui';

type Option = { key: string; letter: string; text: string };

export default function OptionList(props: {
  options: Option[];
  type: 'single' | 'multi';
  selectCount: number;
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const { options, type, selectCount, selected, onChange } = props;
  function toggle(key: string, checked: boolean) {
    if (type === 'single') onChange([key]);
    else onChange(checked ? [...selected, key] : selected.filter((k) => k !== key));
  }
  return (
    <fieldset className="mt-4 space-y-2">
      <legend className="mb-1 text-sm font-semibold">
        {type === 'multi' ? `Options (Select ${selectCount})` : 'Options'}
      </legend>
      {options.map((o) => (
        <label
          key={o.key}
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:bg-surface-2 has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
        >
          <input
            type={type === 'multi' ? 'checkbox' : 'radio'}
            name="option"
            className="mt-1"
            checked={selected.includes(o.key)}
            onChange={(e) => toggle(o.key, e.target.checked)}
          />
          <span>
            <span className="font-semibold">{o.letter}.</span> <InlineText text={o.text} />
          </span>
        </label>
      ))}
    </fieldset>
  );
}
