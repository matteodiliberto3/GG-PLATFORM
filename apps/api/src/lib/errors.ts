import { ZodError } from "zod";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

export class ApiError extends Error {
  code: ApiErrorCode;
  statusCode: number;
  details?: unknown;

  constructor(opts: { code: ApiErrorCode; message: string; statusCode: number; details?: unknown }) {
    super(opts.message);
    this.code = opts.code;
    this.statusCode = opts.statusCode;
    this.details = opts.details;
  }
}

export function fromZod(err: ZodError) {
  return new ApiError({
    code: "BAD_REQUEST",
    statusCode: 400,
    message: "Invalid request body",
    details: err.flatten(),
  });
}

