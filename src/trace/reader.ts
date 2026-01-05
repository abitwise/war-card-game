import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import type { TraceEventRecord, TraceMetaRecord, TraceRecord, TraceSnapshotRecord } from './trace.js';

export type LoadedTrace = {
  meta: TraceMetaRecord;
  events: TraceEventRecord[];
  snapshots: TraceSnapshotRecord[];
};

const parseLine = (line: string): TraceRecord => {
  try {
    return JSON.parse(line) as TraceRecord;
  } catch (error) {
    const maxPreviewLength = 100;
    const isTruncated = line.length > maxPreviewLength;
    const preview = isTruncated ? `${line.slice(0, maxPreviewLength)}...` : line;
    throw new Error(
      `Failed to parse trace line (length=${line.length}${isTruncated ? ', truncated' : ''}): ${preview}`,
    );
  }
};

export const readTraceFile = async (filePath: string): Promise<LoadedTrace> => {
  if (!existsSync(filePath)) {
    throw new Error(`Trace file not found at ${filePath}`);
  }

  const stream = createReadStream(filePath, 'utf8');
  const reader = createInterface({ input: stream, crlfDelay: Infinity });

  let meta: TraceMetaRecord | undefined;
  const events: TraceEventRecord[] = [];
  const snapshots: TraceSnapshotRecord[] = [];

  for await (const line of reader) {
    if (!line.trim()) continue;

    const record = parseLine(line);
    if (record.type === 'meta') {
      if (meta) {
        throw new Error('Trace contains multiple meta records; expected one per file.');
      }
      meta = record;
    } else if (record.type === 'event') {
      events.push(record);
    } else if (record.type === 'snapshot') {
      snapshots.push(record);
    }
  }

  if (!meta) {
    throw new Error('Trace file is missing a meta record.');
  }

  return { meta, events, snapshots };
};
