import { getDataProvider } from "@/lib/data/provider-factory";
import { DataProvider } from "@/lib/data/types";


export function useDataProvider(): DataProvider {
    return getDataProvider();
}
