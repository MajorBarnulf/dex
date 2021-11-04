import { DexTargetBuilder } from "./DexTarget.ts";
import { Dex } from "./Dex.ts";

const dex = new Dex();
const execute = (...command: string[]) => dex.context.execute(...command);
const exists = (path: string) => dex.context.exists(path);
const get = (name: string) => dex.get(name);
const run = () => dex.run();
const set = (name: string, value: string) => dex.set(name, value);
const target = (...targets: DexTargetBuilder[]) => dex.target(...targets);

export { dex, execute, exists, get, run, set, target };
