// RFC-4180 compliant CSV parser and UTF-8 BOM CSV exporter (preserves Bangla in Excel)

export function parseCSV(csvText = '') {
  if (!csvText) return [];
  const text = String(csvText).replace(/^\uFEFF/, ''); // strip BOM if present

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((ch === '\r' || ch === '\n') && !inQuotes) {
      if (ch === '\r' && next === '\n') {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((cell) => cell.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const objects = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx].trim() : '';
    });
    objects.push(obj);
  }

  return objects;
}

export function escapeCSVCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCSVWithBOM(headers = [], rows = []) {
  const headerLine = headers.map(escapeCSVCell).join(',');
  const bodyLines = rows.map((row) => row.map(escapeCSVCell).join(','));
  // Prepend \uFEFF UTF-8 Byte Order Mark so Microsoft Excel renders Bangla script cleanly
  return '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');
}

