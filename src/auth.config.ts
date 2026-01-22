import type { NextAuthConfig } from "next-auth"

// 🚀 Custom Cookie Configuration for Firebase Hosting
// Firebase Hosting terminates SSL, so the internal server sees HTTP (not HTTPS).
// We must ensure Cookies are still treated as secure/SameSite if needed, 
// OR relax them if the mismatch causes issues.
const useSecureCookies = process.env.NODE_ENV === "production";
const cookiePrefix = useSecureCookies ? "__Secure-" : "";
// 🔥 FORCE PRODUCTION URL: If environment variable fails, use the known Firebase App URL
const productionUrl = "https://tts2004evaluation.web.app";
const authUrl = process.env.AUTH_URL || (process.env.NODE_ENV === "production" ? productionUrl : "http://localhost:3000");
const hostName = new URL(authUrl).hostname;

export const authConfig = {
    trustHost: true,
    // 🔥 RESTORED: Manual Cookie Config is REQUIRED for Firebase Hosting
    // because SSL is terminated at the proxy, so the app sees 'http'.
    // We must FORCE the cookie to be Secure and have the correct name.
    cookies: {
        sessionToken: {
            name: `__session`, // 🔥 FIREBASE HOSTING REQUIREMENT: Only cookies named '__session' are passed to the backend.
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: true, // Always secure for production/firebase
            }
        },
    },
    callbacks: {
        async redirect({ url, baseUrl }) {
            // FIREBASE FIX: If the url is 0.0.0.0, replace it with our authUrl
            if (url.includes('0.0.0.0')) {
                const fixedUrl = url.replace('https://0.0.0.0:8080', authUrl).replace('http://0.0.0.0:8080', authUrl);
                return fixedUrl;
            }

            // ✅ Allow relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`;

            // ✅ Allow callback URLs on the same origin
            if (new URL(url).origin === baseUrl) return url;

            // Default to baseUrl
            return baseUrl;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.employeeId = (user as any).employeeId
                token.role = (user as any).role
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).employeeId = token.employeeId;
                (session.user as any).role = token.role;
            }
            return session
        }
    },
    pages: {
        signIn: "/login",
    },
    // 🔥 Fixed: Fallback secret for dev environment
    // HARDCODED SECRET FOR DEBUGGING: To rule out env var mismatch
    secret: "TTSen2004",
    debug: true, // Enable debug logs
    providers: [], // Providers added in auth.ts (Node only)
} satisfies NextAuthConfig
