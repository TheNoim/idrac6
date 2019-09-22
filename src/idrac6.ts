import { IDrac6Options } from "./interfaces/iDrac6Options";
import get from "lodash.get";
import { URL, URLSearchParams } from "url";
import {
    iDrac6ConfigError,
    iDrac6MissingConfigError,
} from "./errors/ConfigErrors";
import { IDrac6Session } from "./interfaces/iDrac6Session";
import { join } from "path";
import { pathExists, readJSON, unlink, writeJSON } from "fs-extra";
import ky, { AfterResponseHook, BeforeRequestHook } from "ky-universal";
import { iDrac6LoginError } from "./errors/iDrac6Error";
import { Agent } from "https";
import { homedir } from "os";
import { IDrac6DataTypes, PowerActions, PowerState } from "./enums/iDrac6";
import debug from "debug";
import parser = require("fast-xml-parser");
import { iDracTemperature } from "./interfaces/idrac";

const CookieRegex = new RegExp(/_appwebSessionId_=(.*?);/gm);

class iDrac6 {
    private options?: IDrac6Options;
    private host?: string;
    private port?: number;
    private ssl?: boolean;
    private localSession?: IDrac6Session;
    private sessionDebug = debug("iDrac6 Session");
    private idracDebug = debug("iDrac6");
    private idracAction = debug("iDrac6 Actions");

    constructor(options?: IDrac6Options) {
        this.options = options;
    }

    /**
     * Get current idrac power state
     */
    public async getPowerState() {
        this.idracAction("Get power state");
        const result = await this.getData([IDrac6DataTypes.PowerState]);
        const pwState = this._getPowerState(result);
        this.idracAction("Got power state: %d", pwState);
        return pwState;
    }

    private _getPowerState(data: any) {
        return get(data, "root.pwState", PowerState.INVALID) as PowerState;
    }

    /**
     * Send an action to set a new power state
     * @param action
     */
    public async sendPowerAction(action: PowerActions = PowerActions.ON) {
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
     * Check whether the options are valid
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
                        const data = await readJSON(path, { throws: false });
                        if (data) {
                            return data as IDrac6Session;
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

    public async login() {
        this.validateOptions();
        if (!this.options) return;
        const searchParams = new URLSearchParams();
        searchParams.append("user", this.options.username);
        searchParams.append("password", this.options.password);
        this.sessionDebug("Try to login.");
        const response = await this.baseKy("data/login", {
            method: "post",
            body: searchParams,
        });
        const text = await response.text();
        const tObj = parser.getTraversalObj(text);
        const parsed = parser.convertToJson(tObj);
        const result: number = get(parsed, "root.authResult", 1);
        this.sessionDebug("Login response: %O", parsed);
        if (result === 0) {
            // Success
            const setCookieString = response.headers.get("Set-Cookie");
            if (setCookieString) {
                const regexArray = CookieRegex.exec(setCookieString);
                if (regexArray && regexArray.length >= 2) {
                    const sessionString: string = regexArray[1];
                    const session: IDrac6Session = {
                        port: this.port!,
                        host: this.host!,
                        ssl: this.ssl!,
                        username: this.options && this.options.username,
                        sessionId: sessionString,
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

    private async getData(actions: IDrac6DataTypes[]) {
        const searchParams = new URLSearchParams();
        searchParams.set("get", actions.join(","));
        const response = await this.ky("data", {
            searchParams,
        });
        const text = await response.text();
        const tObj = parser.getTraversalObj(text);
        const parsed = parser.convertToJson(tObj);
        return parsed;
    }

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

    private get ky() {
        return this.baseKy.extend({
            hooks: {
                afterResponse: [
                    (async (input, options, response) => {
                        if (response.status === 401) {
                            this.sessionDebug(
                                "Response status is 401. Try to login."
                            );
                            await this.login();
                            const session = await this.getSession();
                            if (session) {
                                options.headers.set(
                                    "Cookie",
                                    `_appwebSessionId_=${session.sessionId}`
                                );
                                return this.baseKy(input, options);
                            }
                        }
                        this.sessionDebug("Got idrac 6 response %j", response);
                        return response;
                    }) as AfterResponseHook,
                ],
                beforeRequest: [
                    (async (input, options) => {
                        const session = await this.getSession();
                        if (session) {
                            this.sessionDebug(
                                "Session exists. Set headers. Session: %O",
                                session
                            );
                            options.headers.set(
                                "Cookie",
                                `_appwebSessionId_=${session.sessionId}`
                            );
                        }
                    }) as BeforeRequestHook,
                ],
            },
        });
    }

    private get urlBase(): string | void {
        if (!this.host || !this.port) return;
        return `${this.ssl ? "https" : "http"}://${this.host}:${this.port}`;
    }
}

export { iDrac6 };
