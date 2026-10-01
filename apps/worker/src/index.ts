import { loadEnvironment } from "@roaswell/config";
import { createExampleWorker } from "./worker.js";

loadEnvironment("worker", process.env);
const { worker, close } = await createExampleWorker(process.env);
try {
  await worker.run();
} finally {
  await close();
}
