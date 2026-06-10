import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The data layer uses Node's built-in `node:sqlite` module (Node 22+), so
  // there are no native packages to externalize. Route Handlers run on the
  // Node.js runtime where this builtin is available.
};

export default nextConfig;
