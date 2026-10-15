/**
 * `zitejs/backend` stand-in.
 *
 * Upstream these helpers describe a hosted HTTP endpoint (input/output schemas + a server
 * handler). Here the same endpoint modules are executed locally, so `createEndpoint` is a
 * typed identity function and `ZiteError` keeps the platform's error contract
 * (`code`, `message`, `userFacingMessage`) so the existing UI error mapping keeps working.
 */

export type EndpointContext = Record<string, never>;

export type EndpointArgs<TInput> = {
  input: TInput;
  ctx?: EndpointContext;
  env?: Record<string, string | undefined>;
};

export type EndpointConfig<TInput = any, TOutput = any> = {
  description?: string;
  inputSchema?: { safeParse: (v: unknown) => { success: boolean; data?: any; error?: any } } | any;
  outputSchema?: any;
  execute: (args: EndpointArgs<TInput>) => Promise<TOutput> | TOutput;
};

/** Identity helper: keeps endpoint definitions declarative, exactly like upstream. */
export function createEndpoint<TInput = any, TOutput = any>(
  config: EndpointConfig<TInput, TOutput>,
): EndpointConfig<TInput, TOutput> {
  return config;
}

export type ZiteErrorInit = {
  code: string;
  message: string;
  userFacingMessage?: string;
  status?: number;
  details?: unknown;
};

const STATUS_BY_CODE: Record<string, number> = {
  BAD_REQUEST: 400,
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class ZiteError extends Error {
  code: string;
  userFacingMessage?: string;
  status: number;
  details?: unknown;

  constructor(init: ZiteErrorInit) {
    super(init.message);
    this.name = 'ZiteError';
    this.code = init.code;
    this.userFacingMessage = init.userFacingMessage;
    this.status = init.status ?? STATUS_BY_CODE[init.code] ?? 500;
    this.details = init.details;
  }
}

/** Extra platform helpers the app may import (kept minimal). */
export const defineBackend = (x: unknown) => x;
export const createApiEndpoint = createEndpoint;
