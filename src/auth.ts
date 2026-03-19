import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { LibsqlDialect } from "@libsql/kysely-libsql";

export const auth = betterAuth({
  baseURL: process.env.AUTH_URL,
  secret: process.env.AUTH_SECRET,
  database: {
    dialect: new LibsqlDialect({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    }),
    type: "sqlite",
  },
  plugins: [nextCookies()],
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh session expiry daily
  },
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET!,
      scope: [
       "openid",
       "email",
       "profile",
       "https://www.googleapis.com/auth/calendar",
       "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/contacts.readonly",
      ],
      accessType: "offline",
    },
  },
});
