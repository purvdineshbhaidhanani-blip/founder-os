import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const platformPrismaClientPath = path.join(__dirname, "..", "..", "shared", "platform", "node_modules", "@prisma", "client");

/**
 * This codebase writes explicit `.js` extensions on relative TypeScript
 * imports throughout (the spec-correct convention for `"type": "module"`
 * packages, matching @founder-os/platform and @founder-os/ui) — Next.js's
 * webpack build doesn't resolve those to `.ts`/`.tsx` source files by
 * default, so every product needs this alias rather than stripping
 * extensions from every local import.
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // This codebase's own eslint.config.js (flat config) isn't compatible
  // with Next 14's built-in build-time lint step; `npm run lint` already
  // covers this product with the real config, so build-time linting here
  // would just be a broken duplicate, not a second layer of safety.
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };

    // argon2 (password hashing, via @founder-os/platform/auth) and both
    // Prisma Client instances (@founder-os/platform's own, and this
    // product's self-contained ".prisma/spendgov-client") load a native
    // .node binary relative to their own package directory at runtime —
    // webpack bundling them into a chunk breaks that relative lookup, so
    // they must stay plain runtime `require()`s on the server instead of
    // being bundled. Resolved to an absolute path (not a bare specifier)
    // because @founder-os/platform's compiled dist/ code and this
    // product's own code are in sibling directories with separate
    // node_modules trees (no npm workspace hoisting), so a bare
    // `require("@prisma/client")` from inside a bundled chunk would walk
    // up spendgov's own ancestor directories and never reach
    // shared/platform/node_modules at all.
    if (isServer) {
      config.externals.push(
        "argon2",
        ({ request }, callback) => {
          if (request === "@prisma/client") {
            return callback(null, `commonjs ${platformPrismaClientPath}`);
          }
          if (request && request.startsWith(".prisma/")) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      );
    }
    return config;
  },
};

export default nextConfig;
