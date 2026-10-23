import { sendGoogleSheetsAction } from "./googleSheetsService";

export async function createProductRequest({ productName, shortDescription, usageDescription }) {
  return sendGoogleSheetsAction("submitProductRequest", {
    productName: productName || "",
    shortDescription: shortDescription || "",
    usageDescription: usageDescription || "",
  });
}
