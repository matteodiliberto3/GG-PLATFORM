import type { FastifyReply } from "fastify";

export function ok<T>(reply: FastifyReply, data: T) {
  return reply.send({ status: "success", data });
}

export function fail(
  reply: FastifyReply,
  opts: { code: string; message: string; details?: unknown },
  statusCode: number,
) {
  return reply.status(statusCode).send({
    status: "error",
    error: {
      code: opts.code,
      message: opts.message,
      details: opts.details,
    },
  });
}

