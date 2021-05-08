import { IDrac6Options, iDrac6, IDrac6DataTypes } from "./index.js";
import { readFile } from "fs/promises";
import { URL } from "url";

const config = JSON.parse(
    (await readFile(new URL("../testConfig.json", import.meta.url))).toString()
) as IDrac6Options;

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
