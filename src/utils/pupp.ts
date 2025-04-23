import { Options } from "puppeteer-real-browser";

export function DefaultPuppeteerOptions(): Options {
    return {
        headless: false,
        turnstile: true
    }
}
