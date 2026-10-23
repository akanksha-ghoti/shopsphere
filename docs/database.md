# ShopSphere Database Design

## 1. Overview

ShopSphere uses MongoDB Atlas as its database and Mongoose as its ODM. The database contains eight main collections: Users, Categories, Products, Carts, Orders, Payments, Reviews, and Coupons.

**Conventions:**

* `_id`: MongoDB ObjectId, automatically generated.
* `createdAt` and `updatedAt`: Dates managed by Mongoose timestamps.
* Required fields must be provided when creating a document.
* Optional fields may be omitted when not applicable.

## 2. ER Diagram

Refer to [`er-diagram.png`](./er-diagram.png) for the database relationships and embedding decisions.

## 3. Collection Schemas

### 3.1 Users

Stores customer and administrator accounts.

| Field       | Type     | Required | Default / Constraint                  |
| ----------- | -------- | -------- | ------------------------------------- |
| `_id`       | ObjectId | Yes      | Auto-generated                        |
| `name`      | String   | Yes      | Trimmed                               |
| `email`     | String   | Yes      | Unique, lowercase                     |
| `password`  | String   | Yes      | Store password hash only              |
| `role`      | String   | Yes      | `customer`; enum: `customer`, `admin` |
| `isActive`  | Boolean  | Yes      | `true`                                |
| `createdAt` | Date     | Yes      | Managed by timestamps                 |
| `updatedAt` | Date     | Yes      | Managed by timestamps                 |

### 3.2 Categories

Groups products into categories.

| Field         | Type     | Required | Default / Constraint  |
| ------------- | -------- | -------- | --------------------- |
| `_id`         | ObjectId | Yes      | Auto-generated        |
| `name`        | String   | Yes      | Trimmed               |
| `slug`        | String   | Yes      | Unique                |
| `description` | String   | No       | Optional              |
| `isActive`    | Boolean  | Yes      | `true`                |
| `createdAt`   | Date     | Yes      | Managed by timestamps |
| `updatedAt`   | Date     | Yes      | Managed by timestamps |

### 3.3 Products

Stores product details and references a category.

| Field         | Type             | Required | Default / Constraint               |
| ------------- | ---------------- | -------- | ---------------------------------- |
| `_id`         | ObjectId         | Yes      | Auto-generated                     |
| `name`        | String           | Yes      | Trimmed                            |
| `slug`        | String           | Yes      | Unique                             |
| `description` | String           | Yes      | Product description                |
| `price`       | Number           | Yes      | Must be greater than or equal to 0 |
| `stock`       | Number           | Yes      | `0`; must be non-negative          |
| `category`    | ObjectId         | Yes      | Reference to Category              |
| `images`      | Array of Strings | No       | `[]`                               |
| `isActive`    | Boolean          | Yes      | `true`                             |
| `createdAt`   | Date             | Yes      | Managed by timestamps              |
| `updatedAt`   | Date             | Yes      | Managed by timestamps              |

### 3.4 Carts

Stores a user's active shopping cart.

| Field            | Type             | Required      | Default / Constraint       |
| ---------------- | ---------------- | ------------- | -------------------------- |
| `_id`            | ObjectId         | Yes           | Auto-generated             |
| `user`           | ObjectId         | Yes           | Unique reference to User   |
| `items`          | Array of Objects | Yes           | `[]`                       |
| `items.product`  | ObjectId         | Yes, per item | Reference to Product       |
| `items.quantity` | Number           | Yes, per item | Must be a positive integer |
| `createdAt`      | Date             | Yes           | Managed by timestamps      |
| `updatedAt`      | Date             | Yes           | Managed by timestamps      |

Cart items are embedded in the Cart document. Product details can be retrieved using the product reference.

### 3.5 Orders

Stores placed orders and historical item snapshots.

| Field            | Type             | Required      | Default / Constraint                                                         |
| ---------------- | ---------------- | ------------- | ---------------------------------------------------------------------------- |
| `_id`            | ObjectId         | Yes           | Auto-generated                                                               |
| `user`           | ObjectId         | Yes           | Reference to User                                                            |
| `items`          | Array of Objects | Yes           | Must contain at least one item                                               |
| `items.product`  | ObjectId         | Yes, per item | Reference to Product                                                         |
| `items.name`     | String           | Yes, per item | Product name snapshot                                                        |
| `items.price`    | Number           | Yes, per item | Price snapshot at purchase                                                   |
| `items.quantity` | Number           | Yes, per item | Positive integer                                                             |
| `totalAmount`    | Number           | Yes           | Non-negative                                                                 |
| `status`         | String           | Yes           | `pending`; enum: `pending`, `confirmed`, `shipped`, `delivered`, `cancelled` |
| `coupon`         | ObjectId         | No            | Optional reference to Coupon                                                 |
| `createdAt`      | Date             | Yes           | Managed by timestamps                                                        |
| `updatedAt`      | Date             | Yes           | Managed by timestamps                                                        |

Order item snapshots preserve product names and prices as they were when the order was placed.

### 3.6 Payments

Stores payment details associated with orders.

| Field           | Type     | Required | Default / Constraint                                        |
| --------------- | -------- | -------- | ----------------------------------------------------------- |
| `_id`           | ObjectId | Yes      | Auto-generated                                              |
| `order`         | ObjectId | Yes      | Unique reference to Order                                   |
| `method`        | String   | Yes      | Enum: `razorpay`, `cod`, `other`                            |
| `transactionId` | String   | No       | Optional; unique when present                               |
| `amount`        | Number   | Yes      | Non-negative                                                |
| `status`        | String   | Yes      | `pending`; enum: `pending`, `success`, `failed`, `refunded` |
| `paidAt`        | Date     | No       | Set after successful payment                                |
| `createdAt`     | Date     | Yes      | Managed by timestamps                                       |
| `updatedAt`     | Date     | Yes      | Managed by timestamps                                       |

Payment records must not store card numbers, CVVs, or other sensitive payment credentials.

### 3.7 Reviews

Stores customer reviews of products.

| Field       | Type     | Required | Default / Constraint  |
| ----------- | -------- | -------- | --------------------- |
| `_id`       | ObjectId | Yes      | Auto-generated        |
| `user`      | ObjectId | Yes      | Reference to User     |
| `product`   | ObjectId | Yes      | Reference to Product  |
| `rating`    | Number   | Yes      | Integer from 1 to 5   |
| `comment`   | String   | No       | Optional              |
| `isActive`  | Boolean  | Yes      | `true`                |
| `createdAt` | Date     | Yes      | Managed by timestamps |
| `updatedAt` | Date     | Yes      | Managed by timestamps |

A unique compound index on `user` and `product` can enforce one review per user per product.

### 3.8 Coupons

Stores discount codes and their validity rules.

| Field            | Type     | Required | Default / Constraint        |
| ---------------- | -------- | -------- | --------------------------- |
| `_id`            | ObjectId | Yes      | Auto-generated              |
| `code`           | String   | Yes      | Unique, uppercase           |
| `discountType`   | String   | Yes      | Enum: `percentage`, `fixed` |
| `discountValue`  | Number   | Yes      | Positive                    |
| `minOrderAmount` | Number   | Yes      | `0`                         |
| `maxDiscount`    | Number   | No       | Optional maximum discount   |
| `startDate`      | Date     | Yes      | Coupon activation date      |
| `endDate`        | Date     | Yes      | Must be after `startDate`   |
| `isActive`       | Boolean  | Yes      | `true`                      |
| `usageLimit`     | Number   | No       | Optional maximum usage      |
| `usedCount`      | Number   | Yes      | `0`                         |
| `createdAt`      | Date     | Yes      | Managed by timestamps       |
| `updatedAt`      | Date     | Yes      | Managed by timestamps       |

## 4. References vs Embedding

### Referencing

Use ObjectId references when related documents should be managed independently.

* Product → Category
* Cart → User
* Cart item → Product
* Order → User
* Order → Coupon
* Order item → Product
* Payment → Order
* Review → User
* Review → Product

### Embedding

Embed data when it belongs to the parent document and should be retrieved with it.

* Cart items are embedded in Cart.
* Order items are embedded in Order.
* Order item names and prices are snapshots so later product changes do not alter historical order details.

## 5. Relationship Summary

| Relationship          | Cardinality            |
| --------------------- | ---------------------- |
| Category → Product    | One-to-many            |
| User → Cart           | One-to-one active cart |
| User → Order          | One-to-many            |
| Order → Payment       | One-to-one             |
| User → Review         | One-to-many            |
| Product → Review      | One-to-many            |
| Coupon → Order        | One-to-many, optional  |
| Product → Cart items  | One-to-many references |
| Product → Order items | One-to-many references |

## 6. Index Plan

Indexes support frequent lookups and help enforce uniqueness.

| Collection | Index                                       | Type                   | Purpose                               |
| ---------- | ------------------------------------------- | ---------------------- | ------------------------------------- |
| Users      | `email`                                     | Unique                 | Login and duplicate prevention        |
| Users      | `{ role: 1, isActive: 1 }`                  | Compound               | Filter active users by role           |
| Categories | `slug`                                      | Unique                 | Category lookup                       |
| Categories | `{ isActive: 1, name: 1 }`                  | Compound               | Active category listing               |
| Products   | `slug`                                      | Unique                 | Product lookup                        |
| Products   | `{ category: 1, isActive: 1 }`              | Compound               | Browse active products by category    |
| Products   | `{ price: 1 }`                              | Single                 | Price sorting and range filtering     |
| Products   | `{ name: "text", description: "text" }`     | Text                   | Basic product text search             |
| Carts      | `user`                                      | Unique                 | Retrieve a user's active cart         |
| Orders     | `{ user: 1, createdAt: -1 }`                | Compound               | User order history                    |
| Orders     | `{ status: 1, createdAt: -1 }`              | Compound               | Filter and sort orders by status      |
| Payments   | `order`                                     | Unique                 | Find payment for an order             |
| Payments   | `transactionId`                             | Unique, sparse/partial | Lookup transactions when an ID exists |
| Reviews    | `{ user: 1, product: 1 }`                   | Unique compound        | Prevent duplicate user reviews        |
| Reviews    | `{ product: 1, createdAt: -1 }`             | Compound               | List product reviews                  |
| Coupons    | `code`                                      | Unique                 | Coupon lookup                         |
| Coupons    | `{ isActive: 1, startDate: 1, endDate: 1 }` | Compound               | Check coupon availability             |

Indexes should be confirmed against actual query patterns. Avoid creating duplicate indexes for fields already covered by another index.

## 7. Validation and Integrity Rules

* Emails, slugs, coupon codes, and other unique identifiers must not be duplicated.
* Product prices and stock quantities must be non-negative.
* Cart and order quantities must be positive integers.
* Review ratings must be integers between 1 and 5.
* Coupon end dates must be later than start dates.
* Coupon usage must respect configured limits.
* Order totals must be calculated on the server, not trusted from client input.
* Check that referenced documents exist before creating related records.
* Inventory updates and payment/order transitions should be handled safely in the relevant business logic.

## 8. Mongoose Implementation Notes

* Use `timestamps: true` for schemas that require `createdAt` and `updatedAt`.
* Declare unique and compound indexes explicitly in the schema.
* Validate data at the schema level and at API boundaries.
* Treat the tables in this document as the planned schema design; actual defaults, required fields, and indexes must match the Mongoose model definitions when those models are implemented.
* The schema models will be introduced in the subsequent implementation tasks.
