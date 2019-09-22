import { IDrac6Options } from "./src/interfaces/iDrac6Options";
import { iDrac6 } from "./src";

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
})().catch(console.trace);
