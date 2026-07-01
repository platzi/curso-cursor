/**
 * FNV-1a 32-bit hash estable. Entrada típica: `${user_id}:${flag_key}`.
 * Devuelve un bucket en [0, 100) para stickiness porcentual.
 */
export function hashToBucket(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}
