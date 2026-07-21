import { PrismaClient } from '../generated/client/index.js';
declare const prismaClientSingleton: () => PrismaClient<{
    adapter: any;
    log: ("warn" | "error")[];
}, "warn" | "error", import("../generated/client/runtime/client.js").DefaultArgs>;
declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}
declare const prisma: PrismaClient<{
    adapter: any;
    log: ("warn" | "error")[];
}, "warn" | "error", import("../generated/client/runtime/client.js").DefaultArgs>;
export default prisma;
//# sourceMappingURL=prisma.d.ts.map