const { PrismaClient } = require("@prisma/client");

// Reuse a single PrismaClient instance across the app (and across hot
// reloads in dev) instead of opening a new connection pool per request.
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.__nocturnePrisma) {
    global.__nocturnePrisma = new PrismaClient();
  }
  prisma = global.__nocturnePrisma;
}

module.exports = prisma;
