import JSZip from 'jszip';

let sqlPromise = null;

function getSql() {
  if (!sqlPromise) {
    sqlPromise = import('sql.js').then((mod) =>
      mod.default({
        locateFile: (f) => `https://sql.js.org/dist/${f}`,
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

export async function parseApkg(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Anki 2.1 uses .anki21, Anki 2.0 uses .anki2
  const dbFile = zip.file('collection.anki21') || zip.file('collection.anki2');
  if (!dbFile) throw new Error('Invalid .apkg file — no Anki database found inside.');

  const dbBytes = await dbFile.async('uint8array');
  const SQL = await getSql();
  const db = new SQL.Database(dbBytes);

  let cards = [];
  try {
    const result = db.exec('SELECT flds FROM notes');
    if (result.length && result[0].values.length) {
      cards = result[0].values
        .map(([flds]) => {
          // Fields are separated by the ASCII unit separator \x1f
          const parts = String(flds).split('\x1f');
          if (parts.length < 2) return null;
          return {
            question: stripHtml(parts[0]),
            answer: stripHtml(parts[1]),
          };
        })
        .filter((c) => c && c.question && c.answer);
    }
  } finally {
    db.close();
  }

  return cards;
}
