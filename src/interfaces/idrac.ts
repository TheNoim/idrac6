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
}
