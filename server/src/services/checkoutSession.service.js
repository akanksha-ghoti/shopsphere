const crypto = require('crypto');
const Address = require('../models/Address');
const CheckoutSession = require('../models/CheckoutSession');
const checkoutService = require('./checkout.service');

const DEFAULT_SESSION_TTL_MINUTES = 15;
const MAX_SESSION_TTL_MINUTES = 60;
const configuredSecret = process.env.CHECKOUT_SESSION_SECRET;
if (configuredSecret && Buffer.byteLength(configuredSecret) < 32) {
  throw new Error('CHECKOUT_SESSION_SECRET must contain at least 32 bytes');
}
const sessionSecret = configuredSecret || crypto.randomBytes(32).toString('hex');

function createSessionError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeObjectId(value, label) {
  const id = String(value || '');
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw createSessionError(400, 'INVALID_ID', `${label} must be a valid MongoDB ObjectId`);
  }
  return id.toLowerCase();
}

function readSessionTtlMinutes() {
  const configuredValue = process.env.CHECKOUT_SESSION_TTL_MINUTES;
  if (configuredValue === undefined) {
    return DEFAULT_SESSION_TTL_MINUTES;
  }

  const value = Number(configuredValue);
  if (!Number.isInteger(value) || value < 1 || value > MAX_SESSION_TTL_MINUTES) {
    throw new Error(
      `Invalid CHECKOUT_SESSION_TTL_MINUTES configuration; use an integer from 1 to ${MAX_SESSION_TTL_MINUTES}`,
    );
  }
  return value;
}

function toSnapshot(summary) {
  return {
    address: {
      id: String(summary.address._id),
      name: summary.address.name,
      phone: summary.address.phone,
      street: summary.address.street,
      addressLine2: summary.address.addressLine2 || null,
      city: summary.address.city,
      state: summary.address.state,
      pincode: summary.address.pincode,
    },
    items: summary.items.map((item) => ({
      cartItemId: String(item._id),
      product: {
        id: String(item.product._id),
        name: item.product.name,
        slug: item.product.slug,
        images: [...(item.product.images || [])],
      },
      variant: item.variant
        ? {
            id: String(item.variant._id),
            size: item.variant.size,
            color: item.variant.color,
            sku: item.variant.sku,
          }
        : null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    subtotal: summary.subtotal,
    shippingFee: summary.shippingFee,
    shipping: {
      fee: summary.shipping.fee,
      freeShippingThreshold: summary.shipping.freeShippingThreshold,
      isFree: summary.shipping.isFree,
    },
    tax: {
      rate: summary.tax.rate,
      amount: summary.tax.amount,
    },
    grandTotal: summary.grandTotal,
    currency: summary.currency,
  };
}

function canonicalizeSnapshot(snapshot) {
  const address = snapshot.address;
  return {
    address: {
      id: String(address.id?._id || address.id),
      name: address.name,
      phone: address.phone,
      street: address.street,
      addressLine2: address.addressLine2 ?? null,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    },
    items: snapshot.items.map((item) => ({
      cartItemId: String(item.cartItemId?._id || item.cartItemId),
      product: {
        id: String(item.product.id?._id || item.product.id),
        name: item.product.name,
        slug: item.product.slug,
        images: [...(item.product.images || [])],
      },
      variant: item.variant?.id
        ? {
            id: String(item.variant.id?._id || item.variant.id),
            size: item.variant.size,
            color: item.variant.color,
            sku: item.variant.sku,
          }
        : null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    subtotal: snapshot.subtotal,
    shippingFee: snapshot.shippingFee,
    shipping: {
      fee: snapshot.shipping.fee,
      freeShippingThreshold: snapshot.shipping.freeShippingThreshold,
      isFree: snapshot.shipping.isFree,
    },
    tax: {
      rate: snapshot.tax.rate,
      amount: snapshot.tax.amount,
    },
    grandTotal: snapshot.grandTotal,
    currency: snapshot.currency,
  };
}

function createSignature({ id, user, address, status, expiresAt, snapshot }) {
  const payload = JSON.stringify({
    id: String(id),
    user: String(user),
    address: String(address),
    status,
    expiresAt: new Date(expiresAt).toISOString(),
    snapshot: canonicalizeSnapshot(snapshot),
  });
  return crypto.createHmac('sha256', sessionSecret).update(payload).digest('hex');
}

function hasValidSnapshotShape(snapshot) {
  return Boolean(
    snapshot &&
    typeof snapshot === 'object' &&
    snapshot.address &&
    typeof snapshot.address === 'object' &&
    Array.isArray(snapshot.items) &&
    snapshot.items.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        item.product &&
        typeof item.product === 'object' &&
        Array.isArray(item.product.images) &&
        (item.variant === null ||
          (item.variant && typeof item.variant === 'object' && item.variant.id !== undefined)),
    ) &&
    snapshot.shipping &&
    typeof snapshot.shipping === 'object' &&
    snapshot.tax &&
    typeof snapshot.tax === 'object',
  );
}

function hasValidSignature(session) {
  if (
    typeof session.signature !== 'string' ||
    !/^[a-f\d]{64}$/i.test(session.signature) ||
    !hasValidSnapshotShape(session.snapshot)
  ) {
    return false;
  }

  const expected = Buffer.from(
    createSignature({
      id: session._id,
      user: session.user,
      address: session.address,
      status: session.status,
      expiresAt: session.expiresAt,
      snapshot: session.snapshot,
    }),
    'hex',
  );
  const actual = Buffer.from(session.signature, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

async function createSession(userId, addressId) {
  const ownerId = normalizeObjectId(userId, 'User ID');
  const selectedAddressId = normalizeObjectId(addressId, 'Address ID');
  const ttlMinutes = readSessionTtlMinutes();
  const now = new Date();

  await CheckoutSession.updateMany(
    { user: ownerId, status: 'open', expiresAt: { $lte: now } },
    { $set: { status: 'expired' } },
  );

  const existingSession = await CheckoutSession.findOne({ user: ownerId, status: 'open' });
  if (existingSession) {
    throw createSessionError(
      409,
      'OPEN_CHECKOUT_SESSION_EXISTS',
      'An open checkout session already exists for this user',
    );
  }

  const summary = await checkoutService.createSummary(ownerId, selectedAddressId);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const snapshot = toSnapshot(summary);
  const session = new CheckoutSession({
    user: ownerId,
    address: selectedAddressId,
    status: 'open',
    expiresAt,
    snapshot,
  });
  session.signature = createSignature({
    id: session._id,
    user: session.user,
    address: session.address,
    status: session.status,
    expiresAt: session.expiresAt,
    snapshot: session.snapshot,
  });

  try {
    await session.save();
  } catch (error) {
    if (error.code === 11000) {
      throw createSessionError(
        409,
        'OPEN_CHECKOUT_SESSION_EXISTS',
        'An open checkout session already exists for this user',
      );
    }
    throw error;
  }

  return {
    sessionId: String(session._id),
    expiresAt: session.expiresAt,
    snapshot: session.snapshot,
  };
}

async function validateSession(userId, sessionId) {
  const ownerId = normalizeObjectId(userId, 'User ID');
  const checkoutSessionId = normalizeObjectId(sessionId, 'Checkout session ID');
  let sessionQuery = CheckoutSession.findOne({ _id: checkoutSessionId, user: ownerId });
  if (typeof sessionQuery.select === 'function') {
    sessionQuery = sessionQuery.select('+signature');
  }
  const session = await sessionQuery;

  if (!session) {
    throw createSessionError(404, 'CHECKOUT_SESSION_NOT_FOUND', 'Checkout session was not found');
  }
  if (session.status !== 'open') {
    throw createSessionError(409, 'CHECKOUT_SESSION_NOT_OPEN', 'Checkout session is not open');
  }
  const expiresAt = new Date(session.expiresAt).getTime();
  if (!Number.isFinite(expiresAt)) {
    throw createSessionError(
      409,
      'CHECKOUT_SESSION_TAMPERED',
      'Checkout session data failed integrity validation',
    );
  }
  if (expiresAt <= Date.now()) {
    throw createSessionError(410, 'CHECKOUT_SESSION_EXPIRED', 'Checkout session has expired');
  }
  if (!hasValidSignature(session)) {
    throw createSessionError(
      409,
      'CHECKOUT_SESSION_TAMPERED',
      'Checkout session data failed integrity validation',
    );
  }

  const address = await Address.findOne({ _id: session.address, user: ownerId });
  if (!address) {
    throw createSessionError(
      409,
      'CHECKOUT_ADDRESS_UNAVAILABLE',
      'The selected checkout address is no longer available',
    );
  }

  return {
    sessionId: String(session._id),
    expiresAt: session.expiresAt,
    snapshot: session.snapshot,
  };
}

module.exports = {
  DEFAULT_SESSION_TTL_MINUTES,
  MAX_SESSION_TTL_MINUTES,
  createSession,
  validateSession,
};
