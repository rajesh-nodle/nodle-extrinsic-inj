import program from "commander";
import logger from "./logger";
import ApiHandler from "./ApiHandler";

import { sleep } from "./util";
import { loadConfigDir } from "./config";
import { startTestSetup } from "./misc/testSetup";

import {
  SIXTEEN_HOURS,
  KusamaEndpoints,
  PolkadotEndpoints,
  LocalEndpoints,
} from "./constants";

const version = "v2.4.22";

const catchAndQuit = async (fn: any) => {
  try {
    await fn;
  } catch (e) {
    console.error(e.toString());
    process.exit(1);
  }
};

const start = async (cmd: { config: string }) => {
  const config = loadConfigDir(cmd.config);

  logger.info(`{Start} Starting the backend services.`);

  logger.info(`{Start} Network prefix: ${config.global.networkPrefix}`);

  // Create the API handler.
  const endpoints =
    config.global.networkPrefix == 2
      ? KusamaEndpoints
      : config.global.networkPrefix == 0
      ? PolkadotEndpoints
      : LocalEndpoints;
  const handler = await ApiHandler.create(endpoints);

  logger.info(
    `{Start::testSetup} chain index is ${config.global.networkPrefix}, starting init script...`
  );
  await startTestSetup();
  await sleep(1500);
  logger.info(
    `{Start::testSetup} init script done ----------------------------------------------------`
  );
};

program
  .option("--config <directory>", "The path to the config directory.", "config")
  .action((cmd: { config: string }) => catchAndQuit(start(cmd)));

program.version(version);
program.parse(process.argv);
