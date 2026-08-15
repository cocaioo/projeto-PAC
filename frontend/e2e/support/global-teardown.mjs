import { cleanupManagedServers } from "./server-manager.mjs";

export default async function globalTeardown() {
  cleanupManagedServers();
}
