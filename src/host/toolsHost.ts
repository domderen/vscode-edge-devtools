// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { encodeMessageForChannel, ITelemetryData, WebSocketEvent, WebviewEvent } from "../common/webviewEvents";
import ToolsWebSocket from "./toolsWebSocket";

export default class ToolsHost {
    private getStateNextId: number = 0;
    private getStateCallbacks: Map<number, (preferences: object) => void> = new Map();

    public isHostedMode() {
        // DevTools will always be inside a webview
        return true;
    }

    public getPreferences(callback: (preferences: any) => void) {
        // Load the preference via the extension workspaceState
        const id = this.getStateNextId++;
        this.getStateCallbacks.set(id, callback);
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "getState", [{ id }]);
    }

    public setPreference(name: string, value: string) {
        // Save the preference via the extension workspaceState
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "setState", [{ name, value }]);
    }

    public recordEnumeratedHistogram(actionName: string, actionCode: number, bucketSize: number) {
        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data: actionCode,
            event: "enumerated",
            name: actionName,
        });
    }

    public recordPerformanceHistogram(histogramName: string, duration: number) {
        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data: duration,
            event: "performance",
            name: histogramName,
        });
    }

    public onMessageFromChannel(e: WebviewEvent, args: string): boolean {
        switch (e) {
            case "getState": {
                const { id, preferences } = JSON.parse(args);
                this.fireGetStateCallback(id, preferences);
                break;
            }

            case "getUrl": {
                const { id, content } = JSON.parse(args);
                this.fireGetUrlCallback(id, content);
                break;
            }

            case "websocket": {
                const [webSocketEvent, message] = JSON.parse(args);
                this.fireWebSocketCallback(webSocketEvent, message);
                break;
            }
        }
        return true;
    }

    private sendTelemetry(telemetry: ITelemetryData) {
        // Forward the data to the extension
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "telemetry", [telemetry]);
    }

    private fireGetStateCallback(id: number, preferences: object) {
        if (this.getStateCallbacks.has(id)) {
            this.getStateCallbacks.get(id)!(preferences);
            this.getStateCallbacks.delete(id);
        }
    }

    private fireGetUrlCallback(id: number, content: string) {
        // TODO: Send response content to DevTools
    }

    private fireWebSocketCallback(e: WebSocketEvent, message: string) {
        // Send response message to DevTools
        ToolsWebSocket.instance.onMessageFromChannel(e, message);
    }
}