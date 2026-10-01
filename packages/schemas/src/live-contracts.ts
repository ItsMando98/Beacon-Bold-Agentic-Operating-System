import { accessOperationContracts } from "./access-contracts.js";
import { operationContracts } from "./contracts.js";
// Only implemented contracts are advertised by the running API.
export const liveOperationContracts = [
  ...operationContracts,
  accessOperationContracts[0],
] as const;
