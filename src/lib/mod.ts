import { DexError, ErrorName, isError, Result } from "./error.ts";
import { DexEvents } from "./events.ts";
import { Dex } from "./Dex.ts";
import { DexTargetBuilder } from "./DexTarget.ts";

export type { DexEvents, DexTargetBuilder, ErrorName, Result };
export { Dex, DexError, isError };

// a ready-to-use instance to reduce the need for boilerplate code
const dexInstance = new Dex();
const { target, set, get, run } = dexInstance;
const { execute, exists } = dexInstance.context;
export { dexInstance as dex, target, set, get, run, execute, exists }
