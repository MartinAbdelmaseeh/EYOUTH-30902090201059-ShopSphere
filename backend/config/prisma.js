const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

const prisma = globalForPrisma.prismaClient ?? new PrismaClient();

globalForPrisma.prismaClient = prisma;

module.exports = prisma;