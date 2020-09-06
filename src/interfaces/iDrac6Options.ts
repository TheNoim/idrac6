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
    /**
     * On newer idrac6 versions you need to use a different auth method. Set newAuth to true if login fails.
     */
    newAuth?: boolean;
}

/**
 * @internal
 */
export interface IDrac6SessionStoreOptions {
    saveSession: boolean;
    path?: string;
}
