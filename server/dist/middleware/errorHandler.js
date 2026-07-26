export const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    // Log to console for dev
    if (process.env.NODE_ENV === 'development') {
        console.error(err);
    }
    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = { name: 'CastError', message, statusCode: 404 };
    }
    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = { name: 'DuplicateError', message, statusCode: 400 };
    }
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors)
            .map((val) => val.message)
            .join(', ');
        error = { name: 'ValidationError', message, statusCode: 400 };
    }
    // Multer Errors (e.g., file size limit)
    if (err.name === 'MulterError') {
        const message = err.message;
        error = { name: 'MulterError', message, statusCode: 400 };
    }
    // Custom File Extension Error from upload middleware
    if (err.message && err.message.startsWith('Invalid file type')) {
        error = { name: 'FileTypeError', message: err.message, statusCode: 400 };
    }
    // File System Errors (e.g. from multer/fs directory creation)
    if (err.code === 'EACCES' || err.code === 'ENOENT') {
        error = { name: 'FileSystemError', message: 'Storage access error on server.', statusCode: 500 };
    }
    // Prisma unique constraint violation
    if (err.code === 'P2002') {
        const target = err.meta?.target;
        const field = Array.isArray(target) ? target.join(', ') : 'field';
        const message = `An account with this ${field} already exists.`;
        error = { name: 'PrismaUniqueError', message, statusCode: 400 };
    }
    // Prisma foreign key constraint violation
    if (err.code === 'P2003') {
        const message = `Invalid reference provided for a related record.`;
        error = { name: 'PrismaForeignKeyError', message, statusCode: 400 };
    }
    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};
//# sourceMappingURL=errorHandler.js.map