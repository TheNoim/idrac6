/**
 * @module iDracInterfaces
 */
import { IDrac6DataTypes, PowerState } from "../enums/iDrac6";

/**
 * @internal
 */
export interface iDracTemperature {
    unit: string;
    temperature: number;
    id: number;
    name: string;
}

/**
 * @internal
 */
export interface iDracMultipleDataResult {
    [IDrac6DataTypes.PowerState]?: PowerState;
    [IDrac6DataTypes.Temperature]?: iDracTemperature;
    [IDrac6DataTypes.BiosVersion]?: string;
    [IDrac6DataTypes.FirmwareVersion]?: string;
    [IDrac6DataTypes.HostName]?: string;
    [IDrac6DataTypes.SystemDescription]?: string;
    [IDrac6DataTypes.SystemRevision]?: string;
    [IDrac6DataTypes.LifecycleControllerFirmwareVersion]?: string;
}
