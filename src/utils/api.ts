export async function postJson(
  path: string,
  payload: Record<string, unknown>
): Promise<{ response: Response; data: any }> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  try {
    return { response, data: await response.json() };
  } catch {
    throw new Error(
      `API returned an empty or non-JSON response (HTTP ${response.status}). Check that Netlify Functions deployed successfully.`
    );
  }
}