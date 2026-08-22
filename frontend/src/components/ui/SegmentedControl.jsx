export default function SegmentedControl({ label, name, value, onChange, options }) {
  return (
    <fieldset className="pac-segmented">
      {label && <legend>{label}</legend>}
      <div className="pac-segmented__options" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`pac-segmented__option${value === option.value ? " is-selected" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>
              <strong>{option.label}</strong>
              {option.hint && <small>{option.hint}</small>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
