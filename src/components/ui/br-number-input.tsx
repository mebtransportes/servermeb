"use client";

import { Input } from "@/components/ui/input";
import { KM_DECIMAL_PLACES, maskBrNumberInput } from "@/lib/number-format";

type BrNumberInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  label?: string;
  error?: string;
  value: string;
  onChange: (formatted: string) => void;
  /** Casas decimais: 0 = inteiro, 2 = moeda */
  decimalPlaces?: number;
};

export function BrNumberInput({
  value,
  onChange,
  decimalPlaces = 2,
  ...props
}: BrNumberInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(maskBrNumberInput(e.target.value, decimalPlaces))}
    />
  );
}

/** Input mascarado para quilometragem (1 decimal: 100.134,1). */
export function BrKmInput({
  value,
  onChange,
  ...props
}: Omit<BrNumberInputProps, "decimalPlaces">) {
  return (
    <BrNumberInput
      {...props}
      value={value}
      onChange={onChange}
      decimalPlaces={KM_DECIMAL_PLACES}
      placeholder={props.placeholder ?? "Ex: 125.430,1"}
    />
  );
}
