/**
 * @module Session
 * @hidden
 */

export interface IDrac6Session {
    sessionId: string;
    st1?: string;
    st2?: string;
    username: string;
    ssl: boolean;
    host: string;
    port: number;
}
