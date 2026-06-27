import { FormattedDecimalInput } from '@/components/projects/FormattedDecimalInput';
import {
  SPEC_CORE_OPTIONS,
  SPEC_PAINT_TYPE_OPTIONS,
  SPEC_THICKNESS_OPTIONS,
} from '@/lib/project-specs';

type CurrencyOption = {
  code: string;
  name: string;
};

type ProjectCommercialFieldsProps = {
  value: string;
  currencyCode: string;
  currencies: CurrencyOption[];
  itemQuantity: string;
  specThickness: string;
  specCore: string;
  specPaintType: string;
  onValueChange: (value: string) => void;
  onCurrencyCodeChange: (currencyCode: string) => void;
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
  currencyCode,
  currencies,
  itemQuantity,
  specThickness,
  specCore,
  specPaintType,
  onValueChange,
  onCurrencyCodeChange,
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
          Total project value
        </label>
        <div className="mt-1 grid grid-cols-[minmax(0,1fr)_120px] gap-2">
          <FormattedDecimalInput
            id={`${idPrefix}-value`}
            value={value}
            onChange={onValueChange}
            placeholder="Amount"
            required={required}
            className={inputClassName}
            maxFractionDigits={2}
          />
          <select
            id={`${idPrefix}-currency`}
            value={currencyCode}
            onChange={(e) => onCurrencyCodeChange(e.target.value)}
            required={required}
            className={selectClassName}
          >
            {currencies.length === 0 ? <option value="AED">AED</option> : null}
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-quantity`} className="text-xs font-medium text-2">
          Total Project Quantity (m²)
        </label>
        <FormattedDecimalInput
          id={`${idPrefix}-quantity`}
          value={itemQuantity}
          onChange={onItemQuantityChange}
          placeholder="Total Project Quantity (m²)"
          required={required}
          className={`mt-1 ${inputClassName}`}
          maxFractionDigits={2}
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
