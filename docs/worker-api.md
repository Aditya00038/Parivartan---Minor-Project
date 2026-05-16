# Worker API

These routes are available under `/api/worker` and are designed for the worker dashboard or a future native mobile app.

## Authentication

Send either:

- `Authorization: Bearer <firebase-id-token>`
- or a `worker_session` cookie created by `POST /api/worker/session`

## Routes

- `POST /api/worker/session`
- `DELETE /api/worker/session`
- `GET /api/worker/profile`
- `PUT /api/worker/profile`
- `GET /api/worker/dashboard-summary`
- `GET /api/worker/tasks/assigned`
- `GET /api/worker/tasks/open-low-priority`
- `GET /api/worker/tasks/:id`
- `POST /api/worker/tasks/:id/accept`
- `POST /api/worker/tasks/:id/self-assign`
- `POST /api/worker/tasks/:id/reject`
- `PATCH /api/worker/tasks/:id/status`
- `POST /api/worker/tasks/:id/upload/before`
- `POST /api/worker/tasks/:id/upload/after`
- `GET /api/worker/history`
- `GET /api/worker/performance-summary`

## Example bodies

### Create session

```json
{
  "idToken": "FIREBASE_ID_TOKEN"
}
```

### Update profile

```json
{
  "name": "Worker Name",
  "employeeId": "SMC/FW/001",
  "department": "Roads"
}
```

### Update status

```json
{
  "status": "Resolved",
  "remarks": "Work completed successfully."
}
```

### Upload before/after proof

```json
{
  "mediaUrl": "data:image/jpeg;base64,...",
  "mediaType": "image",
  "notes": "Site reached and inspection done."
}
```
