import JSZip from 'jszip';

let sqlPromise = null;

function getSql() {
  if (!sqlPromise) {
    sqlPromise = import('sql.js').then((mod) =>
      mod.default({
        locateFile: () => '/sql-wasm.wasm',
      })
    );
  }
  return sqlPromise;
}

const stripHtml = (html) =>
  String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .trim();

const CLOZE_RE = /\{\{c(\d+)::(.+?)(?:::(.+?))?\}\}/g;

// Expand a cloze note into one Q&A card per unique cloze number.
// e.g. "{{c2::Growth hormone}} treats {{c1::Prader-Willi}} syndrome"
// → card 1: Q="Growth hormone treats _____ syndrome"  A="Prader-Willi"
// → card 2: Q="_____ treats Prader-Willi syndrome"    A="Growth hormone"
function parseClozeNote(text) {
  const groups = new Map();
  let m;
  const re = new RegExp(CLOZE_RE.source, 'g');
  while ((m = re.exec(text)) !== null) {
    const num = parseInt(m[1]);
    if (!groups.has(num)) groups.set(num, m[2]); // keep first occurrence per number
  }
  if (groups.size === 0) return [];

  return [...groups.entries()].map(([num, answer]) => {
    const question = text.replace(new RegExp(CLOZE_RE.source, 'g'), (_, n, txt, hint) =>
      parseInt(n) === num ? (hint ? `[${hint}]` : '_____') : txt
    );
    return {
      question: stripHtml(question),
      answer: stripHtml(answer),
    };
  });
}

export async function parseApkg(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const dbFile = zip.file('collection.anki21') || zip.file('collection.anki2');
  if (!dbFile) throw new Error('Invalid .apkg file — no Anki database found inside.');

  const dbBytes = await dbFile.async('uint8array');
  const SQL = await getSql();
  const db = new SQL.Database(dbBytes);

  let cards = [];
  try {
    const result = db.exec('SELECT flds FROM notes');
    if (result.length && result[0].values.length) {
      cards = result[0].values.flatMap(([flds]) => {
        const parts = String(flds).split('\x1f');
        const first = parts[0];

        // Cloze note — expand into one card per blank
        if (/\{\{c\d+::/.test(first)) {
          return parseClozeNote(first);
        }

        // Basic note — first field = question, second = answer
        if (parts.length < 2) return [];
        const q = stripHtml(first);
        const a = stripHtml(parts[1]);
        return q && a ? [{ question: q, answer: a }] : [];
      }).filter((c) => c.question && c.answer);
    }
  } finally {
    db.close();
  }

  return cards;
}
