const DEFAULT_DEV_API_URL = "http://localhost:5051/api";

const normalizeUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\/+$/, "");
};

const isAbsoluteHttpUrl = (value) => /^https?:\/\//i.test(value);

export const getSameOriginApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return "/api";
};

export const isAbsoluteUrl = (value) => isAbsoluteHttpUrl(value);

export const resolveApiBaseUrl = () => {
  const configuredApiUrl = normalizeUrl(import.meta.env.VITE_API_URL);

  // In development, always use Vite proxy to avoid CORS and env drift.
  if (import.meta.env.DEV) {
    return "/api";
  }

  if (!configuredApiUrl) {
    return "/api";
  }

  // Cloudflare tunnel hostnames are ephemeral and often expire.
  const isTryCloudflare = /trycloudflare\.com/i.test(configuredApiUrl);
  const allowTunnelInProd = import.meta.env.VITE_ALLOW_TUNNEL_URL === "true";
  if (isTryCloudflare && !allowTunnelInProd) {
    console.warn(
      "Ignoring ephemeral trycloudflare API URL in production; falling back to same-origin /api.",
    );
    return "/api";
  }

  return configuredApiUrl;
};

export const resolveSocketServerUrl = () => {
  const configuredSocketUrl = normalizeUrl(import.meta.env.VITE_SOCKET_URL);
  if (configuredSocketUrl) {
    return configuredSocketUrl;
  }

  const apiBaseUrl = resolveApiBaseUrl();

  if (isAbsoluteHttpUrl(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api\/?$/, "");
  }

  // Relative API base means same-origin deployment.
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return DEFAULT_DEV_API_URL.replace(/\/api\/?$/, "");
};
