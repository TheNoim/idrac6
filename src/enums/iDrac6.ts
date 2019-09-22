/**
 * @module Enums
 */

export enum PowerState {
    OFF,
    ON,
    INVALID,
}

export enum PowerActions {
    OFF,
    ON,
    RESTART,
    RESET,
    NMI,
    SHUTDOWN,
}

export enum IDrac6DataTypes {
    PowerState = "pwState",
    Temperature = "temperatures",
}
