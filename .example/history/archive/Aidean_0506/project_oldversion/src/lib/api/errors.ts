export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export const Errors = {
  notFound: (resource: string) => new ApiError(404, `${resource} not found`),
  unauthorized: () => new ApiError(401, "Unauthorized"),
  badRequest: (message: string) => new ApiError(400, message),
  insufficientBalance: () => new ApiError(400, "Insufficient balance"),
  internalError: (message: string) => new ApiError(500, message),
};

export const InternalError = (message: string) => new ApiError(500, message);

export function fromZodError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Validation error";
}
