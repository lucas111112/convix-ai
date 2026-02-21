# Authentication & Authorization

## Strategy

Stateless JWT access tokens + rotating refresh tokens stored server-side.

| Token | Lifetime | Transport | Storage |
|---|---|---|---|
| **Access token** | 15 minutes | `Authorization: Bearer <token>` header | In-memory (frontend JS) |
| **Refresh token** | 30 days | `Set-Cookie: refresh_token=...` | httpOnly, Secure, SameSite=Strict cookie |

The access token carries `{ userId, workspaceId, role }` in its payload. The frontend never stores the refresh token — the browser handles the cookie automatically.

---

## Registration Flow

```
POST /v1/auth/register
Body: { name, email, password }

1. Validate with Zod (name min 2, email valid, password min 8)
2. Check email not already taken → 409 Conflict
3. bcrypt.hash(password, BCRYPT_ROUNDS=12)
4. prisma.user.create(...)
5. prisma.workspace.create({ name: `${name}'s Workspace`, slug: nanoid(8) })
6. prisma.workspaceMember.create({ userId, workspaceId, role: OWNER })
7. Issue access token + refresh token
8. Set refresh cookie
9. Return { user, workspace, accessToken }
```

## Login Flow

```
POST /v1/auth/login
Body: { email, password }

1. Find user by email → 401 if not found (generic message)
2. bcrypt.compare(password, passwordHash) → 401 if mismatch
3. Issue new access token
4. Rotate refresh token:
   a. Invalidate old token (if present in cookie)
   b. Create new RefreshToken record (store SHA-256 hash)
5. Set refresh cookie
6. Return { user, workspace, accessToken }
```

## Token Refresh Flow

```
POST /v1/auth/refresh
Cookie: refresh_token=<token>

1. Read refresh_token cookie
2. SHA-256 hash the token value
3. Find RefreshToken by tokenHash, check not expired and not revoked
4. Issue new access token
5. Rotate refresh token (invalidate old, create new)
6. Return { accessToken }
```

## Logout Flow

```
POST /v1/auth/logout
Cookie: refresh_token=<token>

1. Find and revoke RefreshToken (set revokedAt = now)
2. Clear refresh_token cookie (Set-Cookie: ...; Max-Age=0)
3. Return 204 No Content
```

---

## JWT Payload

```ts
interface AccessTokenPayload {
  sub: string;         // userId
  workspaceId: string;
  role: UserRole;
  iat: number;
  exp: number;
}
```

Signed with `HS256` using `JWT_SECRET`. Refresh tokens signed separately with `JWT_REFRESH_SECRET`.

---

## `authenticate` Middleware

```ts
// src/middleware/authenticate.ts
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AppError('MISSING_TOKEN', 401);

  const token = header.slice(7);
  const payload = verifyAccessToken(token);  // throws on invalid/expired

  req.user = {
    id: payload.sub,
    workspaceId: payload.workspaceId,
    role: payload.role,
  };
  next();
}
```

## `requireWorkspace` Middleware

```ts
// src/middleware/requireWorkspace.ts
export async function requireWorkspace(req: Request, res: Response, next: NextFunction) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: req.user.workspaceId },
  });
  if (!workspace) throw new AppError('WORKSPACE_NOT_FOUND', 404);
  req.workspace = workspace;
  next();
}
```

Routes that need workspace data apply both: `[authenticate, requireWorkspace]`.

---

## Role-Based Access Control

Three roles, checked inline in service functions:

| Role | Permissions |
|---|---|
| `OWNER` | Full access — billing, deleting workspace, managing members |
| `ADMIN` | Create/edit/delete agents, channels, knowledge |
| `MEMBER` | Read-only on most resources |

```ts
function requireRole(minRole: UserRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const roleOrder = { MEMBER: 0, ADMIN: 1, OWNER: 2 };
    if (roleOrder[req.user.role] < roleOrder[minRole]) {
      throw new AppError('FORBIDDEN', 403, 'Insufficient role');
    }
    next();
  };
}

// Usage:
router.delete('/:id', authenticate, requireWorkspace, requireRole('ADMIN'), handler);
```

---

## Refresh Token Rotation

Every `/auth/refresh` call invalidates the previous refresh token and issues a new one. This means:

- If a leaked refresh token is used, the legitimate user's next refresh will fail (their token was rotated away)
- The backend detects the "double use" attempt — both tokens are now stale — and can revoke the entire session

```ts
async function rotateRefreshToken(oldTokenHash: string | null, userId: string): Promise<string> {
  // Revoke old token if present
  if (oldTokenHash) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: oldTokenHash },
      data: { revokedAt: new Date() },
    });
  }

  // Generate new token
  const raw = crypto.randomBytes(40).toString('hex');
  const hash = sha256(raw);
  const expiresAt = addDays(new Date(), 30);

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hash, expiresAt },
  });

  return raw; // sent to client as cookie value
}
```

---

## Cookie Settings

```ts
res.cookie('refresh_token', rawToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  path: '/v1/auth',  // only sent on auth routes
});
```

Scoping to `/v1/auth` means the browser won't attach the cookie to every API request — only refresh calls.

---

## Rate Limiting on Auth Routes

```
POST /v1/auth/login    → 10 attempts per IP per 15 minutes (sliding window)
POST /v1/auth/register → 5 attempts per IP per hour
POST /v1/auth/refresh  → 30 attempts per IP per 15 minutes
```

Implemented with `rate-limiter-flexible` backed by Redis.

---

## Password Reset (Future)

Not in v1 scope. When added:
1. `POST /v1/auth/forgot-password` → generate a short-lived signed URL, send via Resend
2. `POST /v1/auth/reset-password` → verify token, update passwordHash, revoke all refresh tokens

---

## Express Type Augmentation

```ts
// src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        workspaceId: string;
        role: import('@prisma/client').UserRole;
      };
      workspace: import('@prisma/client').Workspace;
    }
  }
}
```
