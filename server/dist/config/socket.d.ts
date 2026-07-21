import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
export declare const initializeSocket: (httpServer: HTTPServer) => Server;
export declare const getIO: () => Server;
export declare const emitToOrganization: (organizationId: string, event: string, data: any) => void;
export declare const emitToRole: (organizationId: string, role: string, event: string, data: any) => void;
export declare const emitToDepartment: (organizationId: string, departmentId: string, event: string, data: any) => void;
export declare const emitToUser: (userId: string, event: string, data: any) => void;
//# sourceMappingURL=socket.d.ts.map