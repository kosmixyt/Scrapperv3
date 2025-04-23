import { Page } from "rebrowser-puppeteer-core"





export interface BrowserResponse {
    session_id?: string;
    url: string;
    status: number;
    headers: Record<string, string>;
    body: string | Buffer;
    error?: string;
    userAgent?: string;
    cookies?: string[];
}
