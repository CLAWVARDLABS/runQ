import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { importOpenClawSessionFile } from '../openclaw-session-import.js';

export { importOpenClawSessionFile };

export function listOpenClawSessionFiles(homeDir = process.env.HOME) {
  const sessionsDir = join(homeDir ?? '', '.openclaw', 'agents', 'main', 'sessions');
  if (!existsSync(sessionsDir)) return [];
  const files = [];
  for (const entry of readdirSync(sessionsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
    const path = join(sessionsDir, entry.name);
    try {
      const stat = statSync(path);
      if (stat.size === 0) continue;
      files.push({ path, size: stat.size, mtime: stat.mtimeMs });
    } catch {
      // ignore
    }
  }
  return files.sort((a, b) => a.mtime - b.mtime);
}
