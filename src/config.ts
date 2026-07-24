const PRODUCTION_API_URL = "https://lumida.app";

function isLocalDevelopmentUrl(url: URL): boolean {
  return (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]"
  );
}

export function parseApiBaseUrl(value: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("The Lumida API URL is invalid.");
  }

  if (url.username || url.password) {
    throw new Error("The API URL must not contain credentials.");
  }

  if (url.protocol !== "https:" && !isLocalDevelopmentUrl(url)) {
    throw new Error("The Lumida API must use HTTPS, except on localhost.");
  }

  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("The API URL must contain only a protocol and host.");
  }

  return url;
}

export function getApiBaseUrl(): URL {
  return parseApiBaseUrl(
    process.env.LUMIDA_API_URL?.trim() || PRODUCTION_API_URL,
  );
}
