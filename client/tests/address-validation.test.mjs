import test from "node:test";
import assert from "node:assert/strict";
import { validateAddress } from "../src/utils/addressValidation.ts";
import {
  addAddress,
  applyDefaultAddress,
  removeAddress,
  replaceAddress,
  selectAddress,
} from "../src/utils/addressBook.ts";

const validAddress = {
  name: "Test Recipient",
  phone: "9876543210",
  street: "12 Market Road",
  addressLine2: "",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411001",
  isDefault: false,
};

test("accepts a complete address with an Indian phone and PIN", () => {
  assert.deepEqual(validateAddress(validAddress), {});
});

test("requires name, street, city, and state", () => {
  const errors = validateAddress({
    ...validAddress,
    name: " ",
    street: "",
    city: "",
    state: "",
  });

  assert.equal(
    errors.name,
    "Enter a recipient name with at least 2 characters.",
  );
  assert.equal(errors.street, "Enter the street address.");
  assert.equal(errors.city, "Enter the city.");
  assert.equal(errors.state, "Enter the state.");
});

test("rejects phone numbers that are not valid 10-digit Indian mobiles", () => {
  for (const phone of ["987654321", "1234567890", "98765432101"]) {
    assert.ok(validateAddress({ ...validAddress, phone }).phone);
  }
});

test("rejects PIN codes that are not valid six-digit Indian PINs", () => {
  for (const pincode of ["41100", "041001", "4110012"]) {
    assert.ok(validateAddress({ ...validAddress, pincode }).pincode);
  }
});

test("adds, edits, and deletes an address in the address book state", () => {
  const first = { ...validAddress, _id: "first", isDefault: true };
  const second = { ...validAddress, _id: "second", name: "Second Recipient" };
  const edited = { ...second, city: "Mumbai" };

  assert.deepEqual(addAddress([first], second), [second, first]);
  assert.deepEqual(replaceAddress([first, second], edited), [first, edited]);
  assert.deepEqual(removeAddress([first, second], "first"), [second]);
});

test("selects the requested address or falls back to default and then first", () => {
  const first = { ...validAddress, _id: "first", isDefault: false };
  const preferred = { ...validAddress, _id: "preferred", isDefault: true };
  const addresses = [first, preferred];

  assert.equal(selectAddress(addresses, "first"), first);
  assert.equal(selectAddress(addresses, "missing"), preferred);
  assert.equal(selectAddress([first], undefined), first);
  assert.equal(selectAddress([], undefined), null);
});

test("keeps exactly the selected address as default in UI state", () => {
  const first = { ...validAddress, _id: "first", isDefault: true };
  const next = { ...validAddress, _id: "next", isDefault: false };

  assert.deepEqual(applyDefaultAddress([first, next], next), [
    { ...first, isDefault: false },
    { ...next, isDefault: true },
  ]);
});
