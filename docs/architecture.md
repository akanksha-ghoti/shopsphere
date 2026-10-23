# ShopSphere — System Architecture

## 1. Overview

ShopSphere is a full-stack e-commerce application built with React, TypeScript, Tailwind CSS, Node.js, Express, and MongoDB Atlas.

The architecture separates the frontend, backend API, database, and authentication provider to keep the application modular and maintainable.

## 2. Architecture Diagram

```text
+-----------------------------+
|       Customer / Admin      |
+--------------+--------------+
               |
               v
+-----------------------------+
| Client: React + TypeScript  |
|       Tailwind CSS          |
+--------------+--------------+
               |
               | HTTPS / REST API
               v
+-----------------------------+
| Express API (Node.js)       |
| Routes, Middleware, Services|
+--------------+--------------+
               |
       +-------+-------+
       |               |
       v               v
+--------------+ +----------------+
| MongoDB Atlas| | Auth Provider   |
| Application  | | Authentication  |
| Data         | | and Identity    |
+--------------+ +----------------+
```

## 3. Technology Stack

* Frontend: React, TypeScript, Tailwind CSS, Vite
* Backend: Node.js and Express
* Database: MongoDB Atlas
* Database access: Mongoose
* Authentication: External authentication provider (to be selected)
* API style: REST over HTTP/HTTPS

## 4. Module Boundaries

### Authentication

* Responsibility: User identity, registration, login, and authorization.
* Collection ownership: Application user profiles may be stored in `users`; authentication credentials remain with the auth provider.
* Example endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.

### Catalog

* Responsibility: Product listings, categories, and product details.
* Collections: `products`, `categories`.
* Example endpoints: `GET /api/products`, `GET /api/products/:id`, `POST /api/products`.

### Cart

* Responsibility: Managing a customer's shopping cart.
* Collection: `carts`.
* Example endpoints: `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:itemId`, `DELETE /api/cart/items/:itemId`.

### Orders

* Responsibility: Order creation, order history, and order status.
* Collection: `orders`.
* Example endpoints: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`.

### Payments

* Responsibility: Payment initiation and payment status tracking.
* Collection: `payments`.
* Example endpoints: `POST /api/payments/create`, `GET /api/payments/:id`.
* Card details must be handled by a payment provider, not stored directly by ShopSphere.

### Admin

* Responsibility: Administrative product management and order oversight.
* Collection ownership: No separate collection required initially; authorized operations use catalog and order data.
* Example endpoints: `GET /api/admin/overview`, `PATCH /api/admin/orders/:id`.

## 5. Key Design Decisions

* Keep frontend and backend in separate directories within one repository.
* Use REST endpoints to communicate between the frontend and backend.
* Use MongoDB Atlas as the cloud database.
* Keep authentication credentials with the selected authentication provider.
* Keep business logic organized into modules with clear responsibilities.
* Never commit secrets or actual environment files.

## 6. Health Monitoring

* Endpoint: `GET /api/health`
* Reports API status, server uptime, and MongoDB connection state.

## 7. Future Considerations

* Select and integrate an authentication provider.
* Add request validation and role-based authorization.
* Integrate a payment provider.
* Add automated tests and API documentation.
