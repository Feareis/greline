// Minimal ZIP reader for GTFS archives: central directory + deflate, through the web-standard
// DecompressionStream (available in Node and browsers), so no dependency and no Node import.
// ponytail: no ZIP64 (archives over 4 GB) nor encryption; GTFS feeds of a city need neither.

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const END_RECORD_SIZE = 22;
const MAX_COMMENT_SIZE = 0xffff;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

interface ZipEntry {
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

function findEndOfCentralDirectory(view: DataView): number {
  const lowest = Math.max(0, view.byteLength - END_RECORD_SIZE - MAX_COMMENT_SIZE);
  for (let offset = view.byteLength - END_RECORD_SIZE; offset >= lowest; offset--) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new Error("Not a zip archive: end of central directory not found");
}

function readCentralDirectory(bytes: Uint8Array, view: DataView): Map<string, ZipEntry> {
  const end = findEndOfCentralDirectory(view);
  const entryCount = view.getUint16(end + 10, true);
  const decoder = new TextDecoder();
  const entries = new Map<string, ZipEntry>();
  let offset = view.getUint32(end + 16, true);
  for (let i = 0; i < entryCount; i++) {
    if (view.getUint32(offset, true) !== CENTRAL_DIRECTORY_ENTRY) throw new Error("Corrupted zip archive: bad central directory");
    const nameLength = view.getUint16(offset + 28, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    entries.set(name, {
      method: view.getUint16(offset + 10, true),
      compressedSize: view.getUint32(offset + 20, true),
      localHeaderOffset: view.getUint32(offset + 42, true),
    });
    offset += 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  return entries;
}

async function readEntry(bytes: Uint8Array, view: DataView, name: string, entry: ZipEntry): Promise<Uint8Array> {
  const header = entry.localHeaderOffset;
  if (view.getUint32(header, true) !== LOCAL_FILE_HEADER) throw new Error(`Corrupted zip archive: bad header for ${name}`);
  const start = header + 30 + view.getUint16(header + 26, true) + view.getUint16(header + 28, true);
  const data = bytes.slice(start, start + entry.compressedSize);
  if (entry.method === METHOD_STORED) return data;
  if (entry.method !== METHOD_DEFLATE) throw new Error(`Unsupported zip compression method ${entry.method} for ${name}`);
  const inflated = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(inflated).arrayBuffer());
}

/** Extracts the named files of a zip archive as UTF-8 text; throws if one is missing. */
export async function readZipText(bytes: Uint8Array, names: readonly string[]): Promise<Map<string, string>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = readCentralDirectory(bytes, view);
  const decoder = new TextDecoder();
  const files = new Map<string, string>();
  for (const name of names) {
    const entry = entries.get(name);
    if (!entry) throw new Error(`Zip archive has no ${name}`);
    files.set(name, decoder.decode(await readEntry(bytes, view, name, entry)));
  }
  return files;
}
