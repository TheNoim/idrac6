/**
 * @internal
 */
export class iDrac6ConfigError extends Error {
    public iDrac6ConfigError: boolean = true;
    public iDrac6InvalidConfigError: boolean = true;
    public prop: string;
    public missing: boolean;

    public constructor(prop: string, missing: boolean, message?: string) {
        super(message);
        this.prop = prop;
        this.missing = missing;
    }
}

/**
 * @internal
 */
export class iDrac6MissingConfigError extends Error {
    public iDrac6ConfigError: boolean = true;
    public iDrac6MissingConfigError: boolean = true;
}
