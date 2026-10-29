export async function request<T>(path: string, data?: unknown, csrf = ''): Promise<T> {
  const response = await fetch(path, data === undefined ? { signal: AbortSignal.timeout(15000) } : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(data), signal: AbortSignal.timeout(15000) });
  let result: T & { error?: string };
  try { result = await response.json(); } catch { throw new Error('The server could not complete this request. Check the connection and try again.'); }
  if (!response.ok) throw new Error(result.error ?? 'Request failed');
  return result;
}
