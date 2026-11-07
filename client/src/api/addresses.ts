import api from "../services/api";

export interface Address {
  _id: string;
  name: string;
  phone: string;
  street: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, "_id">;

interface AddressResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export async function getAddresses(signal?: AbortSignal): Promise<Address[]> {
  const response = await api.get<AddressResponse<Address[]>>("/addresses", {
    signal,
  });
  return response.data.data;
}

export async function createAddress(input: AddressInput): Promise<Address> {
  const response = await api.post<AddressResponse<Address>>(
    "/addresses",
    input,
  );
  return response.data.data;
}

export async function updateAddress(
  id: string,
  input: Partial<AddressInput>,
): Promise<Address> {
  const response = await api.patch<AddressResponse<Address>>(
    `/addresses/${encodeURIComponent(id)}`,
    input,
  );
  return response.data.data;
}

export async function setDefaultAddress(id: string): Promise<Address> {
  const response = await api.patch<AddressResponse<Address>>(
    `/addresses/${encodeURIComponent(id)}/default`,
  );
  return response.data.data;
}

export async function deleteAddress(id: string): Promise<void> {
  await api.delete(`/addresses/${encodeURIComponent(id)}`);
}
