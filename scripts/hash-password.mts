// Prints the password_hash value for app_user. Usage: node scripts/hash-password.mts '<password>'

import { hashPassword } from "../src/lib/password.ts";

const password = process.argv[2];
if (password === undefined) {
  console.error("Usage: node scripts/hash-password.mts '<password>'");
  process.exit(1);
}
console.log(await hashPassword(password));
