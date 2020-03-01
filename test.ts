import { IDrac6Options } from "./src/interfaces/iDrac6Options";
import { iDrac6, IDrac6DataTypes } from "./src";

const config = require("./testConfig.json") as IDrac6Options;

console.log({ config });

(async () => {
    const idrac = new iDrac6(config);

    console.log({
        pwState: await idrac.getPowerState(),
        temp: await idrac.getTemperature(),
    });
    console.log("Refetch");
    console.log({
        pwState: await idrac.getPowerState(),
        temp: await idrac.getTemperature(),
    });

    console.log("Multi");
    console.log(
        await idrac.getMultipleData([
            IDrac6DataTypes.PowerState,
            IDrac6DataTypes.Temperature,
        ])
    );
})().catch(console.trace);
