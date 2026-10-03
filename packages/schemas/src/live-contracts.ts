import { accessOperationContracts } from "./access-contracts.js";
import { catalogOperationContracts } from "./catalog.js";
import { operationContracts } from "./contracts.js";
// Only implemented contracts are advertised by the running API.
export const liveOperationContracts = [
  ...operationContracts,
  accessOperationContracts[0],
  ...catalogOperationContracts,
] as const;
