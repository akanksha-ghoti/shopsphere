import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const clientRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
let vite;
let OrderSummary;
let addressBook;
let checkoutUtils;

before(async () => {
  vite = await createServer({
    root: clientRoot,
    configFile: path.join(clientRoot, "vite.config.ts"),
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ default: OrderSummary } = await vite.ssrLoadModule(
    "/src/components/OrderSummary.tsx",
  ));
  addressBook = await vite.ssrLoadModule("/src/utils/addressBook.ts");
  checkoutUtils = await vite.ssrLoadModule("/src/utils/checkout.ts");
});

after(async () => {
  await vite?.close();
});

const summary = {
  items: [
    {
      _id: "cart-line-1",
      product: {
        _id: "product-1",
        name: "Everyday Jacket",
        slug: "everyday-jacket",
        images: [],
      },
      variant: { _id: "variant-1", size: "M", color: "Navy", sku: "JACKET-M" },
      quantity: 2,
      unitPrice: 500,
      lineTotal: 1000,
    },
  ],
  subtotal: 1000,
  shippingFee: 0,
  shipping: { fee: 0, freeShippingThreshold: 1000, isFree: true },
  tax: { rate: 0.18, amount: 180 },
  grandTotal: 1180,
  currency: "INR",
};

test("chooses explicit address, otherwise default, and handles no addresses", () => {
  const addresses = [
    { _id: "address-1", name: "First", isDefault: false },
    { _id: "address-2", name: "Default", isDefault: true },
  ];

  assert.equal(addressBook.selectAddress(addresses, "address-1"), addresses[0]);
  assert.equal(addressBook.selectAddress(addresses), addresses[1]);
  assert.equal(addressBook.selectAddress([]), null);
});

test("renders itemized order totals from the server summary", () => {
  const markup = renderToStaticMarkup(
    React.createElement(OrderSummary, { summary }),
  );

  assert.match(markup, /Everyday Jacket/);
  assert.match(markup, /2 ×/);
  assert.match(markup, /Navy/);
  assert.match(markup, /Subtotal/);
  assert.match(markup, /Shipping/);
  assert.match(markup, /Tax \(18%\)/);
  assert.match(markup, /Grand total/);
  assert.match(markup, /₹1,180/);
});

test("renders loading and service error states accessibly", () => {
  const loadingMarkup = renderToStaticMarkup(
    React.createElement(OrderSummary, { summary: null, loading: true }),
  );
  const errorMarkup = renderToStaticMarkup(
    React.createElement(OrderSummary, {
      summary: null,
      error: "Stock changed. Please review your cart.",
    }),
  );

  assert.match(loadingMarkup, /role="status"/);
  assert.match(loadingMarkup, /Loading order summary/);
  assert.match(errorMarkup, /role="alert"/);
  assert.match(errorMarkup, /Stock changed/);
});

test("explains insufficient-stock failures and detects updated server totals", () => {
  const stockError = Object.assign(new Error("Request failed"), {
    isAxiosError: true,
    response: { data: { code: "INSUFFICIENT_STOCK" } },
  });
  const updatedSnapshot = {
    ...summary,
    items: [{ ...summary.items[0], unitPrice: 550, lineTotal: 1100 }],
    subtotal: 1100,
    tax: { rate: 0.18, amount: 198 },
    grandTotal: 1298,
  };

  assert.match(
    checkoutUtils.getCheckoutErrorMessage(stockError),
    /enough stock/i,
  );
  assert.equal(checkoutUtils.hasSummaryChanged(summary, updatedSnapshot), true);
  assert.equal(checkoutUtils.hasSummaryChanged(summary, summary), false);
  assert.equal(
    checkoutUtils.hasSummaryChanged(summary, {
      ...summary,
      items: [
        {
          ...summary.items[0],
          product: { ...summary.items[0].product, id: "different-product" },
          cartItemId: "different-line",
        },
      ],
    }),
    true,
  );
});
