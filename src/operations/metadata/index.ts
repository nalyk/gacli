import type { AnyOperation } from '../../core/operation.js';
import { metadataCheckCompatibility } from './check-compatibility.op.js';

/** Metadata ops beyond metadata.get (registered separately). */
export const metadataExtraOps: AnyOperation[] = [metadataCheckCompatibility];
