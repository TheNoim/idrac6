/**
 * @module Enums
 */

/**
 * @internal
 */
export enum PowerState {
    OFF,
    ON,
    INVALID,
}

/**
 * @internal
 */
export enum PowerActions {
    OFF,
    ON,
    RESTART,
    RESET,
    NMI,
    SHUTDOWN,
}

/**
 * @internal
 */
export enum IDrac6DataTypes {
    PowerState = "pwState",
    Temperature = "temperatures",
    SystemDescription = "sysDesc",
    SystemRevision = "sysRev",
    HostName = "hostName",
    FirmwareVersion = "fwVersion",
    BiosVersion = "biosVer",
    LifecycleControllerFirmwareVersion = "LCCfwVersion",
}
