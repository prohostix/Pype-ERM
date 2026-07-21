import jwt from 'jsonwebtoken';
function requireEnv(key) {
    const val = process.env[key];
    if (!val)
        throw new Error(`Missing required environment variable: ${key}`);
    return val;
}
export const generateToken = (id) => {
    const secret = requireEnv('JWT_SECRET');
    const options = {
        expiresIn: (process.env.JWT_EXPIRE || '7d'),
    };
    return jwt.sign({ id }, secret, options);
};
export const generateRefreshToken = (id) => {
    const secret = requireEnv('JWT_REFRESH_SECRET');
    const options = {
        expiresIn: (process.env.JWT_REFRESH_EXPIRE || '30d'),
    };
    return jwt.sign({ id }, secret, options);
};
export const verifyToken = (token) => {
    const secret = requireEnv('JWT_SECRET');
    return jwt.verify(token, secret);
};
export const verifyRefreshToken = (token) => {
    const secret = requireEnv('JWT_REFRESH_SECRET');
    return jwt.verify(token, secret);
};
//# sourceMappingURL=jwt.js.map