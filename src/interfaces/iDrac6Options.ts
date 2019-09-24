/**
 * @module Options
 */

/**
 * @internal
 */
export interface IDrac6Options {
    username: string;
    password: string;
    address: string;
    validateSSL?: boolean;
    sessionOptions?: IDrac6SessionStoreOptions;
    timeout?: number;
}

/**
 * @internal
 */
export interface IDrac6SessionStoreOptions {
    saveSession: boolean;
    path?: string;
}
