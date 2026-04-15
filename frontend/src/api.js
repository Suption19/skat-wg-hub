export async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
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
    const error = new Error(`${message} (${response.status})`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

