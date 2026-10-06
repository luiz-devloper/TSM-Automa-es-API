import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const LOG_DIR = process.env.LOG_DIR ?? path.resolve(process.cwd(), "./log");

function serializeError(error) {
    if (!(error instanceof Error)) return error;
    return { name: error.name, message: error.message, stack: error.stack };
}

/**
 * Logger em arquivo, uma linha JSON por entrada (fácil de filtrar com grep/jq).
 * Nunca lança exceção: se a gravação falhar, cai para console.error,
 * para que um problema de log não derrube o fluxo principal.
 */
export class FileLogger {
    #filePath;
    #dirReady = null;

    constructor(fileName = "errors.log") {
        this.#filePath = path.join(LOG_DIR, fileName);
    }

    async error(message, context = {}) {
        const { error, ...rest } = context;

        const entry = {
            timestamp: new Date().toISOString(),
            level: "error",
            message,
            ...rest,
            ...(error !== undefined && { error: serializeError(error) }),
        };

        try {
            this.#dirReady ??= mkdir(LOG_DIR, { recursive: true });
            await this.#dirReady;
            await appendFile(this.#filePath, JSON.stringify(entry) + "\n", "utf8");
        } catch (logError) {
            console.error("[FileLogger] falha ao gravar log:", logError);
            console.error(entry);
        }
    }
}

export const logger = new FileLogger();