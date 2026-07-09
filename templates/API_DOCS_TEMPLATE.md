# API Reference — <Product Name>

Base URL: `<https://api.example.com>` (production) / `http://localhost:<port>/api` (dev)

Conventions follow [`standards/api.md`](../../standards/api.md) — error
shape, pagination, auth, and status codes are not repeated per-route below
unless a route deviates.

## Authentication

<How requests authenticate — session cookie / bearer token / API key.
Where to get credentials in each environment.>

## Routes

### `GET /api/<resource>`

<One-line purpose.>

**Auth:** required | public
**Query params:**

| Param | Type | Required | Description |
|---|---|---|---|
| `cursor` | string | no | Pagination cursor |
| `limit` | number | no | Max 100, default 20 |

**Response `200`:**

```json
{
  "data": [ { "id": "...", "...": "..." } ],
  "pagination": { "nextCursor": "...", "hasMore": false }
}
```

**Errors:** `401` unauthenticated · `403` unauthorized

---

### `POST /api/<resource>`

<One-line purpose.>

**Auth:** required
**Body:**

```json
{ "field": "value" }
```

**Response `201`:**

```json
{ "data": { "id": "...", "...": "..." } }
```

**Errors:** `400` validation (`VALIDATION_ERROR`, per-field `details`) ·
`401` unauthenticated · `403` unauthorized · `409` conflict

---

<Repeat per route. Prefer generating this file from zod schemas /
OpenAPI once the product has enough routes to make hand-maintenance
error-prone — see `standards/api.md`.>
