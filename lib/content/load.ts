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
  mockFiles: RawFile[];
  lessonFiles: RawFile[];
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

export function loadContent(dir: string = process.env.CONTENT_DIR ?? 'content-aicert'): RawContent {
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
  const mdir = path.join(dir, 'mocks');
  const mockNames = fs.existsSync(mdir)
    ? fs
        .readdirSync(mdir)
        .filter((n) => n.endsWith('.json'))
        .sort()
    : [];
  const ldir = path.join(dir, 'lessons');
  const lessonNames = fs.existsSync(ldir)
    ? fs
        .readdirSync(ldir)
        .filter((n) => n.endsWith('.json'))
        .sort()
    : [];
  return {
    syllabus: readJson(dir, 'syllabus.json'),
    traps: readJson(dir, 'traps.json'),
    questionFiles: names.map((n) => {
      const f = readJson(qdir, n);
      return { file: `questions/${n}`, data: f.data };
    }),
    mockFiles: mockNames.map((n) => {
      const f = readJson(mdir, n);
      return { file: `mocks/${n}`, data: f.data };
    }),
    lessonFiles: lessonNames.map((n) => {
      const f = readJson(ldir, n);
      return { file: `lessons/${n}`, data: f.data };
    }),
    flashcards: readJson(dir, 'flashcards.json'),
    cheatsheet: readJson(dir, 'cheatsheet.json'),
  };
}
