/**
 * Domain error types — controllers/models throw these, routes stay HTTP-
 * agnostic, and index.ts's single onError handler maps them to status
 * codes. Adding a new error kind later never requires touching an
 * existing route (open/closed).
 */
export class NotFoundError extends Error {}
export class UnauthorizedError extends Error {}
