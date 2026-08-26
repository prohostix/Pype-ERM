"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = require("../generated/client/index.js");
var adapter_pg_1 = require("@prisma/adapter-pg");
var pg_1 = __importDefault(require("pg"));
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
var pg_connection_string_1 = require("pg-connection-string");
var pgConfig = (0, pg_connection_string_1.parse)(process.env.DATABASE_URL || '');
var poolConfig = {
    host: pgConfig.host || undefined,
    port: pgConfig.port ? parseInt(pgConfig.port, 10) : undefined,
    database: pgConfig.database || undefined,
    user: pgConfig.user || undefined,
    password: pgConfig.password || undefined,
    ssl: { rejectUnauthorized: false }
};
var pool = new pg_1.default.Pool(poolConfig);
var adapter = new adapter_pg_1.PrismaPg(pool);
var prismaClientSingleton = function () {
    return new index_js_1.PrismaClient({
        adapter: adapter,
        log: ['error', 'warn'],
    });
};
var prisma = (_a = globalThis.prismaGlobal) !== null && _a !== void 0 ? _a : prismaClientSingleton();
exports.default = prisma;
if (process.env.NODE_ENV !== 'production')
    globalThis.prismaGlobal = prisma;
