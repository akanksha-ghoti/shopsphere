# ADR 001: System Architecture

## Status
Accepted

## Context
ShopSphere needs a maintainable architecture for its full-stack e-commerce application.

## Decision
- React and TypeScript will power the frontend.
- Node.js and Express will provide the REST API.
- MongoDB Atlas will store application data.
- An authentication provider will manage user identity.
- Authentication, catalog, cart, orders, payments, and admin will have clear module boundaries.

## Consequences
This architecture separates responsibilities and supports future development. Authentication and payment provider integrations will be selected and implemented in later tasks.