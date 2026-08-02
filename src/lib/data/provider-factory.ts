import { LocalProvider } from "./local-provider";
import { DataProvider } from "./types";

let providerInstance: DataProvider | null = null;

export function getDataProvider(): DataProvider {
    if (!providerInstance) {
        providerInstance = new LocalProvider();
    }
    return providerInstance;
}


