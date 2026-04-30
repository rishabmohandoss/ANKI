'use client';

import { useState } from 'react';
import styles from './DatasetUploader.module.css';

const SAMPLE_JSON_CS = [
  { question: "What is a variable in programming?", answer: "A named storage location in memory that holds a value which can be changed during program execution." },
  { question: "What is the difference between a stack and a queue?", answer: "A stack is LIFO (Last In, First Out). A queue is FIFO (First In, First Out)." },
  { question: "What is Big O notation?", answer: "A mathematical notation describing the upper bound of an algorithm's time or space complexity." },
  { question: "What is recursion?", answer: "A technique where a function calls itself to solve smaller instances of the same problem, with a base case to stop." },
  { question: "What is a hash table?", answer: "A data structure mapping keys to values using a hash function, providing average O(1) lookups." },
  { question: "What is polymorphism in OOP?", answer: "The ability of different objects to respond to the same method call in different ways through a common interface." },
  { question: "What is a binary search tree?", answer: "A tree where each node has at most two children, left smaller and right larger than parent." },
  { question: "What is the difference between compiled and interpreted languages?", answer: "Compiled languages are translated entirely to machine code before execution. Interpreted languages are executed line by line at runtime." },
];

const SAMPLE_JSON_BIO = [
  { question: "What is mitosis?", answer: "Cell division producing two genetically identical daughter cells: prophase, metaphase, anaphase, telophase." },
  { question: "What is DNA?", answer: "Deoxyribonucleic acid — a double-helix molecule carrying genetic instructions for all known organisms." },
  { question: "What is the function of mitochondria?", answer: "The powerhouse of the cell — generates ATP (adenosine triphosphate) for chemical energy." },
  { question: "What is natural selection?", answer: "Organisms with favorable traits survive and reproduce more, making those traits more common over time." },
  { question: "Prokaryotic vs eukaryotic cells?", answer: "Prokaryotic cells lack a nucleus (bacteria). Eukaryotic cells have a nucleus and membrane-bound organelles." },
];

const SAMPLES = {
  'Computer Science': SAMPLE_JSON_CS,
  'Biology': SAMPLE_JSON_BIO,
};

const BINARY_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const BINARY_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx']);

function isBinaryFile(file) {
  if (BINARY_TYPES.has(file.type)) return true;
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

export default function DatasetUploader({ onDatasetParsed }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);

  const readFile = async (file) => {
    setError('');
    setPreview(null);

    const ext = '.' + file.name.split('.').pop().toLowerCase();

    // Anki deck
    if (ext === '.apkg') {
      setLoading(true);
      try {
        const { parseApkg } = await import('@/lib/apkgParser');
        const { extractTopics } = await import('@/lib/parsers');
        const cards = await parseApkg(file);
        if (cards.length === 0) {
          setError('No cards found in this Anki deck.');
          return;
        }
        const topics = extractTopics(cards);
        setPreview({ cards, topics, format: 'anki', count: cards.length });
      } catch (err) {
        setError(err.message || 'Failed to parse Anki deck.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Known binary formats
    if (isBinaryFile(file)) {
      setError(`"${file.name}" is a binary file that can't be read as text. Open it, select all, copy, and paste the content into the text area below.`);
      return;
    }

    // Text-based files
    const reader = new FileReader();
    reader.onload = (ev) => {
      setContent(ev.target.result);
      handleParse(ev.target.result);
    };
    reader.readAsText(file);
  };

  const handleParse = async (text) => {
    if (!text || text.trim().length === 0) {
      setError('Please provide some content to parse.');
      return;
    }
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      const res = await fetch('/api/parse-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse');
      setPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleParse(content);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) readFile(file);
  };

  const loadSample = (name) => {
    const json = JSON.stringify(SAMPLES[name], null, 2);
    setContent(json);
    handleParse(json);
  };

  return (
    <div className={styles.uploader}>
      {/* Sample Decks */}
      <div className={styles.samples}>
        <span className={styles.samplesLabel}>Try a sample</span>
        <div className={styles.sampleBtns}>
          {Object.keys(SAMPLES).map((name) => (
            <button key={name} className={styles.sampleBtn} onClick={() => loadSample(name)} type="button">
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`${styles.dropZone} ${dragActive ? styles.dropActive : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <div className={styles.dropContent}>
          <svg className={styles.dropSvg} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className={styles.dropTitle}>Drop a file here</p>
          <p className={styles.dropSub}>
            or{' '}
            <label className={styles.browseLabel}>
              choose a file
              <input type="file" onChange={handleFileInput} className={styles.fileInput} />
            </label>
          </p>
          <p className={styles.dropFormats}>JSON · CSV · .apkg · Plain text · and more</p>
        </div>
      </div>

      {/* Text Area */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <textarea
          className={styles.textarea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Or paste your study material here..."
          rows={6}
        />
        <button
          type="submit"
          className={styles.parseBtn}
          disabled={loading || !content.trim()}
        >
          {loading ? 'Parsing...' : 'Parse'}
        </button>
      </form>

      {/* Error */}
      {error && <p className={styles.error}>{error}</p>}

      {/* Preview */}
      {preview && (
        <div className={`${styles.preview} animate-fade-in`}>
          <div className={styles.previewHead}>
            <div>
              <span className={styles.previewCount}>{preview.count} cards</span>
              <span className={styles.previewFormat}>{preview.format}</span>
            </div>
          </div>

          {preview.topics.length > 0 && (
            <div className={styles.topics}>
              {preview.topics.slice(0, 5).map((t) => (
                <span key={t} className={styles.topic}>{t}</span>
              ))}
            </div>
          )}

          <div className={styles.previewCards}>
            {preview.cards.slice(0, 3).map((card, i) => (
              <div key={i} className={styles.previewCard}>
                <p className={styles.previewQ}>{card.question}</p>
                <p className={styles.previewA}>{card.answer.length > 100 ? card.answer.slice(0, 100) + '…' : card.answer}</p>
              </div>
            ))}
          </div>

          <button className={styles.startBtn} onClick={() => onDatasetParsed(preview)}>
            Begin studying
          </button>
        </div>
      )}
    </div>
  );
}
