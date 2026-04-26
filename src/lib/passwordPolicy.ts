import { supabase } from "@/integrations/supabase/client";

export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_number: boolean;
  require_special: boolean;
  expiration_days: number;
  force_change_on_first_login: boolean;
}

export const DEFAULT_POLICY: PasswordPolicy = {
  min_length: 8,
  require_uppercase: true,
  require_lowercase: true,
  require_number: true,
  require_special: true,
  expiration_days: 0,
  force_change_on_first_login: true,
};

let cached: PasswordPolicy | null = null;

export async function getPasswordPolicy(): Promise<PasswordPolicy> {
  if (cached) return cached;
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "password_policy")
    .maybeSingle();
  cached = { ...DEFAULT_POLICY, ...((data?.value as Partial<PasswordPolicy>) ?? {}) };
  return cached;
}

export function clearPolicyCache() {
  cached = null;
}

export function validatePassword(
  password: string,
  policy: PasswordPolicy
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < policy.min_length) {
    errors.push(`Mínimo de ${policy.min_length} caracteres`);
  }
  if (policy.require_uppercase && !/[A-Z]/.test(password)) {
    errors.push("Pelo menos uma letra maiúscula");
  }
  if (policy.require_lowercase && !/[a-z]/.test(password)) {
    errors.push("Pelo menos uma letra minúscula");
  }
  if (policy.require_number && !/[0-9]/.test(password)) {
    errors.push("Pelo menos um número");
  }
  if (policy.require_special && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push("Pelo menos um caractere especial (ex: !@#$%)");
  }
  return { valid: errors.length === 0, errors };
}

export function describePolicy(policy: PasswordPolicy): string[] {
  const rules: string[] = [`Mínimo de ${policy.min_length} caracteres`];
  if (policy.require_uppercase) rules.push("Letra maiúscula");
  if (policy.require_lowercase) rules.push("Letra minúscula");
  if (policy.require_number) rules.push("Número");
  if (policy.require_special) rules.push("Caractere especial");
  return rules;
}