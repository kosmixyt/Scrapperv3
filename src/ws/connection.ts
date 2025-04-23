import { wss } from "..";
import { Request } from "express";

wss.on("connection", async (ws: WebSocket, req: Request) => {
    ws.send("Hello from server!");
    ws.close()
});
