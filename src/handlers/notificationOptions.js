import { buildTryitCoverageSignature, hasSectionData } from "../utils/farmState.js";

export async function initializeNotificationOptionsFromInventory({
  getPricesWithOutcome,
  dataSetFarmRef,
  getTryitRequestPayload,
  sectionPayloadKeys,
  sectionTablePaths,
  refreshDataSet,
  setOptions,
  dataSet,
}) {
  const requestFarm = dataSetFarmRef.current || {};
  const farmId = String(requestFarm?.frmid || dataSet?.options?.farmId || "").trim();
  const tryitSignature = buildTryitCoverageSignature(getTryitRequestPayload(requestFarm));
  const outcome = await getPricesWithOutcome(false, true, ["inventory"], false, "inv", true, "OPTIONS_NOTIFICATIONS");
  const currentFarm = dataSetFarmRef.current || {};
  const canInitialize = outcome?.status === "applied"
    && String(outcome.requestedFarmId || "").trim() === farmId
    && String(currentFarm?.frmid || "").trim() === farmId
    && outcome.requestedPage === "inv"
    && outcome.requestedSections?.includes("inventory")
    && outcome.confirmedSections?.includes("inventory")
    && !outcome.rejectedTablePaths?.length
    && buildTryitCoverageSignature(getTryitRequestPayload(currentFarm)) === tryitSignature
    && hasSectionData(currentFarm, "inventory", sectionPayloadKeys, sectionTablePaths);
  if (!canInitialize) return false;
  refreshDataSet(currentFarm);
  setOptions({ ...dataSet.options });
  return true;
}
