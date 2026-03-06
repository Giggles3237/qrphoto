import QRCode from "qrcode";

export async function generateQRPng(
  url: string,
  size: number = 512
): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

export async function generateQRSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}
