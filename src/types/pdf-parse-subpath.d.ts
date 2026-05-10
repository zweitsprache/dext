declare module "pdf-parse/lib/pdf-parse.js" {
  export interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    text: string;
    version: string;
  }

  export interface PDFParseOptions {
    pagerender?: (pageData: unknown) => Promise<string>;
    max?: number;
    version?: string;
  }

  export default function pdfParse(
    dataBuffer: Buffer | Uint8Array | ArrayBuffer,
    options?: PDFParseOptions
  ): Promise<PDFParseResult>;
}
