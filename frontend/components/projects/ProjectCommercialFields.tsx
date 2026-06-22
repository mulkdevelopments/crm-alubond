import {
  SPEC_CORE_OPTIONS,
  SPEC_PAINT_TYPE_OPTIONS,
  SPEC_THICKNESS_OPTIONS,
} from '@/lib/project-specs';

type ProjectCommercialFieldsProps = {
  value: string;
  itemQuantity: string;
  specThickness: string;
  specCore: string;
  specPaintType: string;
  onValueChange: (value: string) => void;
  onItemQuantityChange: (value: string) => void;
  onSpecThicknessChange: (value: string) => void;
  onSpecCoreChange: (value: string) => void;
  onSpecPaintTypeChange: (value: string) => void;
  required?: boolean;
  showSpecifications?: boolean;
  idPrefix?: string;
};

const selectClassName =
  'h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-transparent focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:outline-none text-sm w-full';

const inputClassName = selectClassName;

export function ProjectCommercialFields({
  value,
  itemQuantity,
  specThickness,
  specCore,
  specPaintType,
  onValueChange,
  onItemQuantityChange,
  onSpecThicknessChange,
  onSpecCoreChange,
  onSpecPaintTypeChange,
  required = false,
  showSpecifications = true,
  idPrefix = 'commercial',
}: ProjectCommercialFieldsProps) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-value`} className="text-xs font-medium text-2">
          Total Project Value (AED)
        </label>
        <input
          id={`${idPrefix}-value`}
          type="number"
          min={1}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Total Project Value (AED)"
          required={required}
          className={`mt-1 ${inputClassName}`}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-quantity`} className="text-xs font-medium text-2">
          Total Project Quantity (m²)
        </label>
        <input
          id={`${idPrefix}-quantity`}
          type="number"
          min={1}
          step={1}
          value={itemQuantity}
          onChange={(e) => onItemQuantityChange(e.target.value)}
          placeholder="Total Project Quantity (m²)"
          required={required}
          className={`mt-1 ${inputClassName}`}
        />
      </div>
      {showSpecifications ? (
        <div>
          <p className="text-xs font-medium text-2">Project Specifications</p>
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              id={`${idPrefix}-thickness`}
              value={specThickness}
              onChange={(e) => onSpecThicknessChange(e.target.value)}
              required={required}
              className={selectClassName}
            >
              <option value="">Thickness</option>
              {SPEC_THICKNESS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              id={`${idPrefix}-core`}
              value={specCore}
              onChange={(e) => onSpecCoreChange(e.target.value)}
              required={required}
              className={selectClassName}
            >
              <option value="">Core</option>
              {SPEC_CORE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              id={`${idPrefix}-paint`}
              value={specPaintType}
              onChange={(e) => onSpecPaintTypeChange(e.target.value)}
              required={required}
              className={selectClassName}
            >
              <option value="">Paint Type</option>
              {SPEC_PAINT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
