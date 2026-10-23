# ShopSphere API Standards

## 1. Base URL

Local development:

`http://localhost:5000/api`

## 2. Success Response Format

All successful API responses should follow this format:

```json
{
  "success": true,
  "message": "Request successful",
  "data": {}
}
```

* `success`: Indicates whether the request succeeded.
* `message`: A short description of the result.
* `data`: The response payload.

## 3. Error Response Format

All API errors should follow this format:

```json
{
  "success": false,
  "message": "Resource not found"
}
```

Common HTTP status codes:

| Status Code | Meaning               |
| ----------- | --------------------- |
| 200         | OK                    |
| 201         | Resource created      |
| 400         | Bad request           |
| 401         | Unauthorized          |
| 403         | Forbidden             |
| 404         | Resource not found    |
| 500         | Internal server error |
| 503         | Service unavailable   |

## 4. Pagination Standards

List endpoints should support these query parameters:

| Parameter | Default     | Description                  |
| --------- | ----------- | ---------------------------- |
| `page`    | 1           | Page number, starting from 1 |
| `limit`   | 10          | Number of records per page   |
| `sort`    | `createdAt` | Field used to sort results   |

Example request:

`GET /api/products?page=2&limit=10&sort=createdAt`

Example paginated response:

```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [],
  "pagination": {
    "page": 2,
    "limit": 10,
    "total": 35,
    "totalPages": 4
  }
}
```

## 5. Health and Ping Endpoints

### Health

`GET /api/health`

Checks application and database health.

### Ping

`GET /api/ping`

Checks whether the API is responding.

## 6. General Conventions

* Use HTTP methods according to their intended purpose.
* Use JSON for request and response bodies.
* Return appropriate HTTP status codes.
* Keep response structures consistent across endpoints.
* Never commit secrets, passwords, or database credentials.
* Validate query parameters before using them.
