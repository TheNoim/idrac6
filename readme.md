# iDrac6 NodeJS Library

A basic library to interact with an idrac6 remote managment system written in TypeScript for JavaScript and TypeScript usage.

## JavaScript Example:

```javascript
import { iDrac6 } from 'idrac6';

const idrac = new iDrac6({
    username: "",
    pasword: "",
    address: "https://ip",
    newAuth: true, // On older idrac6 version you can set this to false. On the newest idrac6 version (2.92) you need to set this to true.
    sessionOptions: {
        saveSession: true, // This module can save your session and reuse it automatically
        path: "./session.json",
    },
});

(async () => {
    const powerState = await idrac.getPowerState();
    if (powerState === iDrac6.POWER_STATES.ON) {
        // Server is currently on
        await idrac.sendPowerAction(iDrac6.POWER_ACTIONS.SHUTDOWN); // Shutdown the server
    } else if (powerState === iDrac6.POWER_STATES.OFF) {
        // Server is currently offline
        await idrac.sendPowerAction(iDrac6.POWER_ACTIONS.ON); // Turn the server on
    } else if (powerState === iDrac6.POWER_STATES.INVALID) {
        // Server returned invalid power state
        await idrac.sendPowerAction(iDrac6.POWER_ACTIONS.OFF); // Force turn off the server. Is like pressing the button for 5 seconds.
    }
    const temperature = await idrac.getTemperature();
})();
```

## TypeScript Example

```typescript
import { iDrac6, PowerActions, PowerState, iDracTemperature } from 'idrac6';

const idrac = new iDrac6({
    username: "",
    pasword: "",
    address: "https://ip",
    sessionOptions: {
        saveSession: true, // This module can save your session and reuse it automatically
        path: "./session.json",
    },
});

(async () => {
    const powerState: PowerState = await idrac.getPowerState();
    if (powerState === PowerState.ON) {
        // Server is currently on
        await idrac.sendPowerAction(PowerActions.SHUTDOWN); // Shutdown the server
    } else if (powerState === PowerState.OFF) {
        // Server is currently offline
        await idrac.sendPowerAction(PowerActions.ON); // Turn the server on
    } else if (powerState === PowerState.INVALID) {
        // Server returned invalid power state
        await idrac.sendPowerAction(PowerActions.OFF); // Force turn off the server. Is like pressing the button for 5 seconds.
    }
    const temperature: iDracTemperature = await idrac.getTemperature();
})();
```
