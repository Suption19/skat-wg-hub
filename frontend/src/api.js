export async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = 'API-Anfrage fehlgeschlagen';
    try {
      const body = await response.json();
      if (body && body.error) {
        message = body.error;
      }
    } catch (error) {
      // Ignore parse errors for empty responses.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

