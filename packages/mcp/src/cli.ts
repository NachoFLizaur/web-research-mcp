import { startServer } from "./server/index.js";

startServer().catch((error) => {
  process.stderr.write(
    `Fatal error: ${error instanceof Error ? error.stack || error.message : String(error)}\n`,
  );
  process.exit(1);
});
