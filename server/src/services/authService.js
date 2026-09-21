const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");
const ApiError = require("../utils/ApiError");
const { signToken } = require("../utils/jwt");

const SALT_ROUNDS = 12;

async function register({ name, email, password, role, businessName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "An account with that email already exists.");
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      role: role === "SELLER" ? "SELLER" : "CUSTOMER",
      businessName: role === "SELLER" ? businessName : null,
    },
  });

  const token = signToken({ sub: user.id });
  return { user, token };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Same message as a bad password — never reveal which part was wrong.
    throw new ApiError(401, "Incorrect email or password.");
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    throw new ApiError(401, "Incorrect email or password.");
  }

  const token = signToken({ sub: user.id });
  return { user, token };
}

module.exports = { register, login };
