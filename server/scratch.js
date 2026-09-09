"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
prisma.user.findUnique({ where: { email: 'medgare@gmail.com' } }).then(function (u) { return console.log('ROLE IS:', u === null || u === void 0 ? void 0 : u.role); }).finally(function () { return prisma.$disconnect(); });
