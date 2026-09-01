declare const prismaClientSingleton: () => import("../generated/client/runtime/client.js").DynamicClientExtensionThis<import("../generated/client/index.js").Prisma.TypeMap<import("../generated/client/runtime/client.js").InternalArgs & {
    result: {};
    model: {};
    query: {};
    client: {};
}, {}>, import("../generated/client/index.js").Prisma.TypeMapCb<{
    adapter: any;
    log: ("warn" | "error")[];
}>, {
    result: {};
    model: {};
    query: {};
    client: {};
}>;
declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}
declare const prisma: import("../generated/client/runtime/client.js").DynamicClientExtensionThis<import("../generated/client/index.js").Prisma.TypeMap<import("../generated/client/runtime/client.js").InternalArgs & {
    result: {};
    model: {};
    query: {};
    client: {};
}, {}>, import("../generated/client/index.js").Prisma.TypeMapCb<{
    adapter: any;
    log: ("warn" | "error")[];
}>, {
    result: {};
    model: {};
    query: {};
    client: {};
}>;
export default prisma;
//# sourceMappingURL=prisma.d.ts.map