export interface AddressFormValues {
  name: string;
  phone: string;
  street: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export type AddressFieldErrors = Partial<
  Record<keyof AddressFormValues, string>
>;

export function validateAddress(values: AddressFormValues): AddressFieldErrors {
  const errors: AddressFieldErrors = {};

  if (values.name.trim().length < 2) {
    errors.name = "Enter a recipient name with at least 2 characters.";
  }
  if (!/^[6-9]\d{9}$/.test(values.phone.trim())) {
    errors.phone = "Enter a valid 10-digit Indian mobile number.";
  }
  if (!values.street.trim()) errors.street = "Enter the street address.";
  if (!values.city.trim()) errors.city = "Enter the city.";
  if (!values.state.trim()) errors.state = "Enter the state.";
  if (!/^[1-9]\d{5}$/.test(values.pincode.trim())) {
    errors.pincode = "Enter a valid 6-digit Indian PIN code.";
  }

  return errors;
}
