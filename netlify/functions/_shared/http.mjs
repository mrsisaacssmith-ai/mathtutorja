export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message, status = 400) {
  return json({ error: message }, status);
}

export function redirect(url) {
  return new Response(null, { status: 302, headers: { Location: url } });
}

// Wraps a handler so thrown errors (including HttpError below) become clean
// JSON error responses instead of a raw 500 with a stack trace leaking out.
export function withErrorHandling(handler) {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (err) {
      console.error(err);
      const status = err.status || 500;
      const message = status === 500 ? 'Something went wrong on our end. Please try again.' : err.message;
      return errorResponse(message, status);
    }
  };
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, 'Invalid JSON body.');
  }
}
