import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pipeline } from '@xenova/transformers';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const KB_DIR = path.join(ROOT_DIR, 'data', 'knowledge_base');

const COMPLETE_CORPUS_PATH = path.join(KB_DIR, 'complete_rigveda_corpus.json');
const METADATA_JSON_PATH = path.join(KB_DIR, 'metadata.json');
const EMBEDDINGS_NPY_PATH = path.join(KB_DIR, 'embeddings.npy');
const FAISS_INDEX_PATH = path.join(KB_DIR, 'faiss.index');
const KB_CONFIG_PATH = path.join(KB_DIR, 'kb_config.json');

const CONFIGURED_MODEL = (
  process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2'
).trim();

export function resolveTransformersModelId(modelName: string): string {
  const clean = modelName.trim();
  if (clean === 'sentence-transformers/all-MiniLM-L6-v2' || clean === 'all-MiniLM-L6-v2') {
    return 'Xenova/all-MiniLM-L6-v2';
  }
  if (clean.startsWith('sentence-transformers/')) {
    return clean.replace(/^sentence-transformers\//, 'Xenova/');
  }
  return clean;
}

function createNpyBuffer(vectors: Float32Array, numRows: number, numCols: number): Buffer {
  const dictStr = `{'descr': '<f4', 'fortran_order': False, 'shape': (${numRows}, ${numCols}), }`;
  const preambleLen = 10; // 6 magic + 2 version + 2 header_len
  const totalHeaderLen = 128;
  const headerDataLen = totalHeaderLen - preambleLen;
  const paddedDict = dictStr.padEnd(headerDataLen - 1, ' ') + '\n';

  const headerBuf = Buffer.alloc(totalHeaderLen);
  headerBuf[0] = 0x93;
  headerBuf.write('NUMPY', 1, 'ascii');
  headerBuf[6] = 1; // major version 1
  headerBuf[7] = 0; // minor version 0
  headerBuf.writeUInt16LE(headerDataLen, 8);
  headerBuf.write(paddedDict, 10, 'ascii');

  const payloadBuf = Buffer.from(vectors.buffer, vectors.byteOffset, vectors.byteLength);
  return Buffer.concat([headerBuf, payloadBuf]);
}

function createFaissIndexFlatIPBuffer(
  vectors: Float32Array,
  numRows: number,
  dim: number
): Buffer {
  const headerBuf = Buffer.alloc(45);
  headerBuf.write('IxFI', 0, 'ascii'); // IndexFlatIP fourcc
  headerBuf.writeInt32LE(dim, 4); // d = 384
  headerBuf.writeBigInt64LE(BigInt(numRows), 8); // ntotal = 10546
  headerBuf.writeBigInt64LE(BigInt(1048576), 16); // dummy1
  headerBuf.writeBigInt64LE(BigInt(1048576), 24); // dummy2
  headerBuf.writeUInt8(1, 32); // is_trained = true
  headerBuf.writeInt32LE(0, 33); // metric_type = 0 (METRIC_INNER_PRODUCT)
  headerBuf.writeBigInt64LE(BigInt(numRows * dim), 37); // codes vector length in float32 elements

  const payloadBuf = Buffer.from(vectors.buffer, vectors.byteOffset, vectors.byteLength);
  return Buffer.concat([headerBuf, payloadBuf]);
}

async function main() {
  if (!fs.existsSync(COMPLETE_CORPUS_PATH)) {
    throw new Error(`Complete corpus not found at ${COMPLETE_CORPUS_PATH}`);
  }

  const raw = JSON.parse(fs.readFileSync(COMPLETE_CORPUS_PATH, 'utf-8'));
  const mandalas = raw.mandalas || [];

  const metadata: Array<{
    index: number;
    verse_id: string;
    mandala: number;
    sukta: number;
    verse: number;
    english_translation: string;
    sanskrit?: string;
    transliteration?: string;
    deity?: string;
    hymn_title?: string;
    translator: string;
    edition: string;
    source: string;
    source_file: string;
  }> = [];

  let globalIdx = 0;
  for (const mRec of mandalas) {
    for (const hRec of mRec.hymns) {
      for (const v of hRec.verses) {
        metadata.push({
          index: globalIdx++,
          verse_id: v.verse_id,
          mandala: v.mandala,
          sukta: v.sukta,
          verse: v.verse,
          english_translation: v.english_translation,
          sanskrit: v.sanskrit,
          transliteration: v.transliteration,
          deity: hRec.deity,
          hymn_title: hRec.title,
          translator: v.translator || 'Ralph T. H. Griffith',
          edition: '1896',
          source: 'Sacred Texts Archive',
          source_file: `RV_${v.mandala}_${String(v.sukta).padStart(3, '0')}.html`,
        });
      }
    }
  }

  const totalVerses = metadata.length;
  const dim = 384;
  const onnxModelId = resolveTransformersModelId(CONFIGURED_MODEL);

  console.log(
    `[build_dense_index] Encoding ${totalVerses} verses using ${CONFIGURED_MODEL} (ONNX: ${onnxModelId}, dim=${dim})...`
  );

  const extractor = await pipeline('feature-extraction', onnxModelId, {
    quantized: true,
  });

  const allVectors = new Float32Array(totalVerses * dim);
  const batchSize = 64;
  const startTime = Date.now();

  for (let start = 0; start < totalVerses; start += batchSize) {
    const end = Math.min(start + batchSize, totalVerses);
    const batchTexts = metadata.slice(start, end).map((m) => m.english_translation);
    const output = await extractor(batchTexts, { pooling: 'mean', normalize: true });
    const batchData = output.data as Float32Array;

    // Normalize and verify each 384-d vector
    for (let i = 0; i < end - start; i++) {
      const rowOffset = i * dim;
      const destOffset = (start + i) * dim;
      let normSq = 0;
      for (let d = 0; d < dim; d++) {
        const val = batchData[rowOffset + d];
        normSq += val * val;
      }
      const norm = Math.sqrt(normSq) || 1;
      for (let d = 0; d < dim; d++) {
        allVectors[destOffset + d] = batchData[rowOffset + d] / norm;
      }
    }

    if ((start / batchSize) % 25 === 0 || end === totalVerses) {
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[build_dense_index] Progress: ${end}/${totalVerses} verses (${((end / totalVerses) * 100).toFixed(1)}%) in ${elapsedSec}s`
      );
    }
  }

  // Write embeddings.npy
  const npyBuffer = createNpyBuffer(allVectors, totalVerses, dim);
  fs.writeFileSync(EMBEDDINGS_NPY_PATH, npyBuffer);

  // Write faiss.index (IndexFlatIP)
  const faissBuffer = createFaissIndexFlatIPBuffer(allVectors, totalVerses, dim);
  fs.writeFileSync(FAISS_INDEX_PATH, faissBuffer);

  // Write aligned metadata.json (all 10,546 verses)
  fs.writeFileSync(METADATA_JSON_PATH, JSON.stringify(metadata, null, 2), 'utf-8');

  // Write kb_config.json
  const kbConfig = {
    model_name: CONFIGURED_MODEL,
    onnx_model_name: onnxModelId,
    embedding_dimension: dim,
    similarity_metric: 'cosine',
    index_type: 'IndexFlatIP',
    normalization: 'L2',
    total_verses: totalVerses,
    source_corpus: 'data/knowledge_base/complete_rigveda_corpus.json',
    created_at: new Date().toISOString(),
  };
  fs.writeFileSync(KB_CONFIG_PATH, JSON.stringify(kbConfig, null, 2), 'utf-8');

  console.log(`[build_dense_index] Successfully wrote:`);
  console.log(`  - ${EMBEDDINGS_NPY_PATH} (${npyBuffer.length} bytes, shape=(${totalVerses}, ${dim}))`);
  console.log(`  - ${FAISS_INDEX_PATH} (${faissBuffer.length} bytes, IndexFlatIP ntotal=${totalVerses}, d=${dim})`);
  console.log(`  - ${METADATA_JSON_PATH} (${metadata.length} aligned verse records)`);
  console.log(`  - ${KB_CONFIG_PATH}`);
}

main().catch((err) => {
  console.error('[build_dense_index] Fatal error:', err);
  process.exit(1);
});
