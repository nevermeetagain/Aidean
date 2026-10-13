export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateRequired(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

export interface ValidationResult {
  success: boolean;
  errors?: string[];
}

export async function validateBody(body: unknown): Promise<ValidationResult> {
  return { success: true };
}

export async function validateQuery(query: unknown): Promise<ValidationResult> {
  return { success: true };
}
