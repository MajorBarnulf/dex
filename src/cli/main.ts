import { Dex, dirname, join } from "./deps.ts";

// deno-lint-ignore no-explicit-any
type DexConfig = any;

async function main() {
	const configPath = await findConfig();
	if (configPath == undefined) configNotFound();

	console.log(`found config: ${configPath}`);

	const dex = await tryParseConfig(configPath);
	if (dex == undefined) failedToParse();

	const args = Deno.args;
	dex.run(args);
}

async function findConfig(): Promise<string | undefined> {
	const configName = "dex.ts";
	const currentPath = Deno.cwd();

	let path = currentPath;
	let old = path;
	do {
		const potentialPath = join(path, configName);
		if (await fileExists(potentialPath)) return potentialPath;
		old = path;
		path = dirname(path);
	} while (old != path);

	return undefined;
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await Deno.stat(path);
		return true;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) return false;
		else throw error;
	}
}

function configNotFound(): never {
	throw "please, create a 'dex.ts' file at the root of your project that imports";
}

async function tryParseConfig(path: string): Promise<Dex | undefined> {
	const explicitPath = join(`file://`, path);
	const mod = await importConfig(explicitPath);
	const dex = mod["dex"];
	if (isDex(dex)) return dex;
	else return undefined;
}

async function importConfig(path: string): Promise<DexConfig> {
	const result = await import(path);
	return result;
}

// TODO: better type checking
function isDex(some: any): some is Dex {
	if (typeof some["targets"] != "object") return false;
	if (typeof some["context"] != "object") return false;
	return true;
}

function failedToParse(): never {
	throw "please, export an instance of 'Dex' from your 'dex.ts' file, one is already exported for you";
}

await main();
