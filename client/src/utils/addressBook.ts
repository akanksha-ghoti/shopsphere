import type { Address } from "../api/addresses";

export function selectAddress(
  addresses: Address[],
  addressId?: string,
): Address | null {
  return (
    addresses.find((address) => address._id === addressId) ??
    addresses.find((address) => address.isDefault) ??
    addresses[0] ??
    null
  );
}

export function addAddress(addresses: Address[], address: Address): Address[] {
  return [address, ...addresses];
}

export function replaceAddress(
  addresses: Address[],
  address: Address,
): Address[] {
  return addresses.map((item) => (item._id === address._id ? address : item));
}

export function removeAddress(
  addresses: Address[],
  addressId: string,
): Address[] {
  return addresses.filter((address) => address._id !== addressId);
}

export function applyDefaultAddress(
  addresses: Address[],
  address: Address,
): Address[] {
  return addresses.map((item) => ({
    ...item,
    isDefault: item._id === address._id,
  }));
}
