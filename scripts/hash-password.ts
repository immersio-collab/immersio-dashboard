#!/usr/bin/env npx tsx

/**
 * One-shot utility to generate a bcrypt hash for the dashboard admin password.
 *
 * Usage:
 *   npx tsx scripts/hash-password.ts <password>
 *
 * Output:
 *   Prints the hash to stdout in a format ready to paste into .env.local as
 *   DASHBOARD_PASSWORD_HASH=<hash>
 *
 * Uses bcryptjs with a cost factor of 12 (strong, slow, well-suited for a
 * single-password admin scenario where hashing performance is irrelevant).
 */

import bcrypt from "bcryptjs";
import process from "node:process";

const BCRYPT_COST = 12;

function usage(message?: string): never {
  if (message) {
    process.stderr.write(`error: ${message}\n\n`);
  }
  process.stderr.write(
    "Usage: npx tsx scripts/hash-password.ts <password>\n\n" +
      "Example:\n" +
      "  npx tsx scripts/hash-password.ts my-secret-password\n" +
      "  DASHBOARD_PASSWORD_HASH=$2a$12$...\n"
  );
  process.exit(message ? 1 : 0);
}

function main(): void {
  const args = process.argv.slice(2);

  // Support --help / -h as a safety net.
  if (args.includes("--help") || args.includes("-h")) {
    usage();
  }
  if (args.length === 0) {
    usage("missing password argument");
  }
  if (args.length > 1) {
    usage("too many arguments; password must be passed as a single value");
  }

  const [password] = args;

  if (password.length === 0) {
    usage("password cannot be empty");
  }
  if (password.length < 6) {
    usage("password must be at least 6 characters");
  }
  if (password.length > 128) {
    // bcrypt truncates after 72 bytes; reject obviously oversized inputs.
    usage("password must be 128 characters or less");
  }

  const hash = bcrypt.hashSync(password, BCRYPT_COST);
  process.stdout.write(`DASHBOARD_PASSWORD_HASH=${hash}\n`);
}

main();
