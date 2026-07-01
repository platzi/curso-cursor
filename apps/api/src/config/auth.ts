export type AuthConfig = {
  demoUsername: string;
  demoPassword: string;
  sessionSecret: string;
  sessionCookieName: string;
  cookieMaxAge: number;
  secure: boolean;
};

export function getAuthConfig(): AuthConfig {
  const isProd = process.env.NODE_ENV === "production";
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret && isProd) {
    throw new Error("SESSION_SECRET is required in production");
  }

  if (!sessionSecret && !isProd) {
    console.warn(
      "[auth] SESSION_SECRET no definido; usando secreto de desarrollo inseguro.",
    );
  }

  return {
    demoUsername: process.env.DEMO_USERNAME ?? "admin",
    demoPassword: process.env.DEMO_PASSWORD ?? "demo123",
    sessionSecret: sessionSecret ?? "dev-only-insecure-secret-change-me",
    sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "ff_session",
    cookieMaxAge: 60 * 60 * 24,
    secure: isProd,
  };
}
