/** Hash de senha com PBKDF2 (Web Crypto) — sem dependências extras. */

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function gerarSaltHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

export async function hashSenhaPbkdf2(
  senha: string,
  saltHex: string,
  iterations = 100_000
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(senha),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: fromHex(saltHex) as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return toHex(bits);
}

export async function verificarSenhaPbkdf2(
  senha: string,
  saltHex: string,
  hashHex: string
): Promise<boolean> {
  const calc = await hashSenhaPbkdf2(senha, saltHex);
  if (calc.length !== hashHex.length) return false;
  let ok = 0;
  for (let i = 0; i < calc.length; i++) {
    ok |= calc.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return ok === 0;
}
