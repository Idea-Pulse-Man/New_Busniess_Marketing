// Admin account management. Uses DATABASE_URL from .env.
//
//   npm run admin -- set-password <email> <password>   create the account, or change its password
//   npm run admin -- reset-2fa <email>                  lost phone: authenticator is set up again on next login
//   npm run admin -- list                               show admin accounts
//
// Quote passwords with special characters, e.g. 'p@ss!word' (single quotes).
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const [cmd, rawEmail, password] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();

function usage() {
  console.log("Usage:\n  npm run admin -- set-password <email> <password>\n  npm run admin -- reset-2fa <email>\n  npm run admin -- list");
  process.exit(1);
}

try {
  if (cmd === "set-password") {
    if (!email || !password) usage();
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await db.admin.upsert({
      where: { email },
      update: { passwordHash, failedLogins: 0, lockedUntil: null },
      create: { email, passwordHash },
    });
    console.log(`Password set for ${admin.email}. Authenticator: ${admin.totpEnabled ? "set up" : "set up on next login"}.`);
    console.log("Note: the email must also be in ADMIN_EMAILS in src/lib/session.ts to log in.");
  } else if (cmd === "reset-2fa") {
    if (!email) usage();
    await db.admin.update({
      where: { email },
      data: { totpSecret: null, totpEnabled: false, totpLastStep: null, failedLogins: 0, lockedUntil: null },
    });
    console.log(`Authenticator reset for ${email}. They will scan a new QR code on next login.`);
  } else if (cmd === "list") {
    const admins = await db.admin.findMany({ orderBy: { createdAt: "asc" } });
    if (!admins.length) console.log("No admin accounts.");
    for (const a of admins) {
      const locked = a.lockedUntil && a.lockedUntil > new Date() ? " (locked)" : "";
      console.log(`${a.email}  authenticator: ${a.totpEnabled ? "on" : "not set up"}${locked}`);
    }
  } else {
    usage();
  }
} catch (e) {
  console.error(e.code === "P2025" ? `No admin account for ${email}.` : e.message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
