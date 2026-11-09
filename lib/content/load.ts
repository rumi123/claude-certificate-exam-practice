import fs from 'node:fs';
import path from 'node:path';

export interface RawFile {
  file: string;
  data: unknown;
}

export interface RawContent {
  syllabus: RawFile;
  traps: RawFile;
  questionFiles: RawFile[];
  flashcards: RawFile;
  cheatsheet: RawFile;
}

function readJson(dir: string, file: string): RawFile {
  const full = path.join(dir, file);
  let text: string;
  try {
    text = fs.readFileSync(full, 'utf8');
  } catch (e) {
    throw new Error(`Cannot read ${full}: ${(e as Error).message}`);
  }
  try {
    return { file, data: JSON.parse(text) };
  } catch (e) {
    throw new Error(`Invalid JSON in ${full}: ${(e as Error).message}`);
  }
}

export function loadContent(dir: string = process.env.CONTENT_DIR ?? 'content'): RawContent {
  const qdir = path.join(dir, 'questions');
  let names: string[];
  try {
    names = fs
      .readdirSync(qdir)
      .filter((n) => n.endsWith('.json'))
      .sort();
  } catch (e) {
    throw new Error(`Cannot read ${qdir}: ${(e as Error).message}`);
  }
  return {
    syllabus: readJson(dir, 'syllabus.json'),
    traps: readJson(dir, 'traps.json'),
    questionFiles: names.map((n) => {
      const f = readJson(qdir, n);
      return { file: `questions/${n}`, data: f.data };
    }),
    flashcards: readJson(dir, 'flashcards.json'),
    cheatsheet: readJson(dir, 'cheatsheet.json'),
  };
}
