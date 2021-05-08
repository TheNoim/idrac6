/**
 * @module iDrac6
 */

import { IDrac6Options } from "./interfaces/iDrac6Options.js";
import { get } from "lodash-es";
import { URL, URLSearchParams } from "url";
import {
    iDrac6ConfigError,
    iDrac6MissingConfigError,
} from "./errors/ConfigErrors.js";
import { IDrac6Session } from "./interfaces/iDrac6Session.js";
import { join } from "path";
import fsExtra from "fs-extra";
import { unlink } from "fs/promises";
import ky from "ky-universal";
import { iDrac6LoginError } from "./errors/iDrac6Error.js";
import { Agent } from "https";
import { homedir } from "os";
import { IDrac6DataTypes, PowerActions, PowerState } from "./enums/iDrac6.js";
import debug from "debug";
import {
    iDracMultipleDataResult,
    iDracTemperature,
} from "./interfaces/idrac.js";
import * as parser from "fast-xml-parser";
import { NormalizedOptions } from "ky/distribution/types/options.js";

const { pathExists, readJSON, writeJSON } = fsExtra;

/**
 * Main iDrac6 Class
 */
export class iDrac6 {
    /**
     * Static Exports
     */

    /**
     * Export all iDrac Data Types you can request currently
     */
    static IDRAC_DATA_TYPES = IDrac6DataTypes;

    /**
     * All power states this library could return
     */
    static POWER_STATES = PowerState;

    /**
     * All power actions you can send with this library
     */
    static POWER_ACTIONS = PowerActions;

    /**
     * Internal data
     */

    private options?: IDrac6Options;
    private host?: string;
    private port?: number;
    private ssl?: boolean;
    private localSession?: IDrac6Session;
    private sessionDebug = debug("iDrac6 Session");
    private idracDebug = debug("iDrac6");
    private idracAction = debug("iDrac6 Actions");
    private CookieRegex = new RegExp(/_appwebSessionId_=(.*?);/gm);

    /**
     * Initial this library.
     * @param options
     */
    constructor(options?: IDrac6Options) {
        this.options = options;
    }

    /**
     * Update current instance options.
     * *Note*: This function also validates them. So make sure they are correct.
     * @param options
     */
    public updateOptions(options?: IDrac6Options): void {
        this.options = options;
        this.validateOptions();
    }

    /**
     * Get multiple idrac data types at once to save some time
     * @param data
     */
    public async getMultipleData(
        data: IDrac6DataTypes[]
    ): Promise<iDracMultipleDataResult> {
        this.idracAction("Get multiple data types %O", data);
        const rawData = await this.getData(data);
        const idracResult: iDracMultipleDataResult = {};
        for (const type of data) {
            if (type === IDrac6DataTypes.PowerState) {
                idracResult[IDrac6DataTypes.PowerState] = this._getPowerState(
                    rawData
                );
            } else if (type === IDrac6DataTypes.Temperature) {
                idracResult[IDrac6DataTypes.Temperature] = this._getTemperature(
                    rawData
                );
            } else if (
                [
                    IDrac6DataTypes.BiosVersion,
                    IDrac6DataTypes.FirmwareVersion,
                    IDrac6DataTypes.LifecycleControllerFirmwareVersion,
                    IDrac6DataTypes.SystemRevision,
                    IDrac6DataTypes.HostName,
                    IDrac6DataTypes.SystemDescription,
                ].includes(type)
            ) {
                idracResult[type] = this.extractKey(data, type);
            }
        }
        return idracResult;
    }

    private extractKey(data: any, key: string) {
        return get(data, "root." + key, null);
    }

    /**
     * Get current idrac power state
     */
    public async getPowerState(): Promise<PowerState> {
        this.idracAction("Get power state");
        const result = await this.getData([IDrac6DataTypes.PowerState]);
        const pwState = this._getPowerState(result);
        this.idracAction("Got power state: %d", pwState);
        return pwState;
    }

    /**
     *
     * @param data
     */
    private _getPowerState(data: any) {
        return get(data, "root.pwState", PowerState.INVALID) as PowerState;
    }

    /**
     * Send an action to set a new power state
     * @param action
     */
    public async sendPowerAction(
        action: PowerActions = PowerActions.ON
    ): Promise<void> {
        this.idracAction("Send power state: %d", action);
        const searchParams = new URLSearchParams();
        searchParams.set("set", "pwState:" + action);
        await this.ky("data", {
            searchParams,
        });
    }

    /**
     *
     */
    public async getTemperature() {
        this.idracAction("Get temperature");
        const result = await this.getData([IDrac6DataTypes.Temperature]);
        const tempData = this._getTemperature(result);
        this.idracAction("Got temperature data %O", tempData);
        return tempData;
    }

    /**
     *
     * @param data
     */
    private _getTemperature(data: any): iDracTemperature {
        const sensorData = get(
            data,
            "root.sensortype.thresholdSensorList.sensor"
        );
        return {
            name: get(sensorData, "name"),
            id: 1,
            temperature: get(sensorData, "reading"),
            unit: get(sensorData, "units"),
        };
    }

    /**
     * Validate current instance options.
     * Method also gets called if you invoke updateOptions()
     */
    public validateOptions() {
        if (!this.options)
            throw new iDrac6MissingConfigError(
                "You forgot to provide a config"
            );
        if (!this.options.username)
            throw new iDrac6ConfigError("username", true, "Missing username");
        if (!this.options.password)
            throw new iDrac6ConfigError("password", true, "Missing password");
        if (!this.options.address)
            throw new iDrac6ConfigError("address", true, "Missing address");

        const url = new URL(this.options.address);
        this.host = url.hostname;
        const port = parseInt(url.port, 10);
        this.port = Number.isFinite(port) ? port : 443;
        this.ssl = url.protocol === "https:";
    }

    /**
     *
     * @param session
     */
    private async saveSession(session?: IDrac6Session) {
        if (this.options) {
            if (this.options.sessionOptions) {
                if (this.options.sessionOptions.saveSession) {
                    const path =
                        this.options.sessionOptions.path ||
                        join(join(homedir(), "./idrac6/"), "./session.json");
                    if (!session) {
                        await unlink(path);
                    } else {
                        await writeJSON(path, session);
                    }
                }
            }
        }
        this.localSession = session;
    }

    private async getSession(): Promise<IDrac6Session | false> {
        this.validateOptions();
        if (this.options) {
            if (this.options.sessionOptions) {
                if (this.options.sessionOptions.saveSession) {
                    const path =
                        this.options.sessionOptions.path ||
                        join(join(homedir(), "./idrac6/"), "./session.json");
                    if (await pathExists(path)) {
                        const data: IDrac6Session = await readJSON(path, {
                            throws: false,
                        });
                        if (data && !this.options.newAuth) {
                            return data;
                        } else if (data && this.options.newAuth) {
                            if (data.st1 && data.st2) {
                                return data;
                            }
                        }
                    }
                }
            }
        }
        if (this.localSession) {
            return this.localSession;
        }
        return false;
    }

    /**
     * You don't need to invoke this function by yourself.
     * It gets invoked automatically, if there is no session or the current is not valid anymore.
     */
    public async login() {
        this.validateOptions();
        if (!this.options) return;
        const searchParams = new URLSearchParams();
        searchParams.append("user", this.options.username);
        searchParams.append("password", this.options.password);
        this.sessionDebug("Try to login.");
        const response = await this.baseKy("data/login", {
            method: this.options.newAuth ? "POST" : "post",
            body: this.options.newAuth ? searchParams.toString() : searchParams,
            headers: this.options.newAuth
                ? {
                      "Content-Type": "application/x-www-form-urlencoded",
                      "Content-Length": `${searchParams.toString().length}`,
                  }
                : {},
        });
        const text = await response.text();
        this.sessionDebug("Login response xml: %s", text);
        const tObj = parser.getTraversalObj(text, { arrayMode: false });
        const parsed = parser.convertToJson(tObj, { arrayMode: false });
        const result: number = get(parsed, "root.authResult", 1);
        const forwardUrl = get(parsed, "root.forwardUrl");
        this.sessionDebug("Login response: %O", parsed);
        if (result === 0) {
            // Success
            const setCookieString = response.headers.get("set-cookie");
            let ST1;
            let ST2;
            if (this.options.newAuth) {
                let stString = forwardUrl?.split?.("?")?.[1];
                let stStrings = stString?.split?.(",");
                if (stStrings?.length >= 2) {
                    for (const stValueString of stStrings) {
                        const [key, value] = stValueString?.split?.("=") ?? [
                            null,
                            null,
                        ];
                        if (key && value) {
                            if (key === "ST1") {
                                ST1 = value;
                            } else if (key === "ST2") {
                                ST2 = value;
                            }
                        }
                    }
                }
            }
            if (setCookieString && (this.options.newAuth ? ST1 && ST2 : true)) {
                if (this.options.newAuth)
                    this.sessionDebug("ST1: %s ST2: %s", ST1, ST2);
                const regexArray = this.CookieRegex.exec(setCookieString);
                if (regexArray && regexArray.length >= 2) {
                    const sessionString: string = regexArray[1];
                    const session: IDrac6Session = {
                        port: this.port!,
                        host: this.host!,
                        ssl: this.ssl!,
                        username: this.options && this.options.username,
                        sessionId: sessionString,
                        ...(this.options.newAuth ? { st2: ST2, st1: ST1 } : {}),
                    };
                    this.sessionDebug(
                        "Create session and save it: %O",
                        session
                    );
                    await this.saveSession(session);
                    return true;
                }
            }
        }
        throw new iDrac6LoginError("Invalid login data");
    }

    /**
     *
     * @param actions
     */
    private async getData(actions: IDrac6DataTypes[]) {
        const searchParams = new URLSearchParams();
        searchParams.set("get", actions.join(","));
        const response = await this.ky("data", {
            searchParams,
        });
        const text = await response.text();
        const tObj = parser.getTraversalObj(text, { arrayMode: false });
        const parsed = parser.convertToJson(tObj, { arrayMode: false });
        return parsed;
    }

    /**
     *
     * @readonly
     * @private
     * @memberof iDrac6
     */
    private get baseKy() {
        this.validateOptions();
        const agent = new Agent({
            rejectUnauthorized: false,
        });
        return ky.create({
            prefixUrl: this.urlBase || undefined,
            timeout: (this.options && this.options.timeout) || 6000,
            // @ts-ignore
            agent: this.options && this.options.validateSSL ? undefined : agent,
        });
    }

    /**
     *
     * @readonly
     * @private
     * @memberof iDrac6
     */
    private get ky() {
        return this.baseKy.extend({
            hooks: {
                afterResponse: [
                    async (
                        request: Request,
                        options: NormalizedOptions,
                        response: Response
                    ) => {
                        if (response.status === 401) {
                            this.sessionDebug(
                                "Response status is 401. Try to login."
                            );
                            await this.login();
                            const session = await this.getSession();
                            if (session) {
                                request.headers.set(
                                    "Cookie",
                                    `_appwebSessionId_=${session.sessionId}`
                                );
                                return this.baseKy(request, options);
                            }
                        }
                        this.sessionDebug("Got idrac 6 response %j", response);
                        return response;
                    },
                ],
                beforeRequest: [
                    async (request: Request) => {
                        const session = await this.getSession();
                        if (session) {
                            this.sessionDebug(
                                "Session exists. Set headers. Session: %O",
                                session
                            );
                            request.headers.set(
                                "Cookie",
                                `_appwebSessionId_=${session.sessionId}`
                            );
                            if (
                                this.options?.newAuth ||
                                (session.st1 && session.st2)
                            ) {
                                this.sessionDebug(
                                    "Session exists. Set ST2: %s",
                                    session.st2
                                );
                                request.headers.set(
                                    "ST2",
                                    session.st2 as string
                                );
                            }
                        }
                    },
                ],
            },
        });
    }

    /**
     *
     * @readonly
     * @private
     * @type {(string | void)}
     * @memberof iDrac6
     */
    private get urlBase(): string | void {
        if (!this.host || !this.port) return;
        return `${this.ssl ? "https" : "http"}://${this.host}:${this.port}`;
    }
}
