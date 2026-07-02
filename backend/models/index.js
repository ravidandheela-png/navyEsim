/**
 * Prisma client singleton.
 * Import this wherever DB access is needed.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
