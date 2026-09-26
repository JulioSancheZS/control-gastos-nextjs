import { useContext } from "react";
import { DataProviderContext } from "@/components/providers/app-provider";
import { DataProvider } from "@/lib/data/types";

export function useDataProvider(): DataProvider {
    const context = useContext(DataProviderContext);
    if (!context) {
        throw new Error("useDataProvider must be used within AppProvider");
    }
    return context;
}
