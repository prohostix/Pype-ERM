/**
 * Hash a plain text password
 */
export declare const hashPassword: (password: string) => Promise<string>;
/**
 * Compare plain text password with hashed password
 */
export declare const comparePassword: (password: string, hashed: string) => Promise<boolean>;
export declare const generateUserId: () => Promise<string>;
//# sourceMappingURL=authUtils.d.ts.map