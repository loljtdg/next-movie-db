import { loadConfig } from "../../config/file";
import { db } from "../../db/db";
import { MoviesChecker } from "./check";
import { scanLogger } from "./log";
import { MoviesScanner } from "./scan-movies";
import { MoviesSearcher } from "./search";

export async function doScan(signal: AbortSignal) {
  const config = await loadConfig();
  const scanResults = await new MoviesScanner(signal, db).scanMovies(
    config.scanPaths,
  );
  const searchResults = await new MoviesSearcher(signal, db).searchMovies();
  const checkResults = await new MoviesChecker(signal, db).runCheck();
  scanLogger.log("doScan end", { scanResults, ...searchResults, checkResults });
}
