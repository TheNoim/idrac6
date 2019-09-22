# iDrac6 NodeJS Library

A basic library to interact with an idrac6 remote managment system written in TypeScript for JavaScript and TypeScript usage.

```javascript
const { iDrac6 } = require("idrac6");

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
    await idrac.getPowerState();
    await idrac.getTemperature();
})();
```
