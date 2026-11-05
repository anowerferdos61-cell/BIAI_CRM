// Bangladeshi phone number normalization & extraction utilities

export function normalizeBDPhone(raw = '') {
  if (!raw) return '';
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return '';

  // +8801XXXXXXXXX or 8801XXXXXXXXX -> 01XXXXXXXXX (11 digits)
  if (digits.startsWith('8801') && digits.length === 13) {
    return '0' + digits.slice(3);
  }
  // 1XXXXXXXXX (10 digits starting with 1[3-9]) -> 01XXXXXXXXX
  if (/^1[3-9]\d{8}$/.test(digits)) {
    return '0' + digits;
  }
  // Standard 01[3-9]XXXXXXXX (11 digits)
  if (/^01[3-9]\d{8}$/.test(digits)) {
    return digits;
  }
  return digits;
}

export function formatBDPhoneForWhatsApp(phone = '') {
  const norm = normalizeBDPhone(phone);
  if (/^01[3-9]\d{8}$/.test(norm)) {
    return '88' + norm;
  }
  return norm;
}

export function extractPhoneFromText(text = '') {
  if (!text) return '';
  // Convert Bengali digits ০-৯ to ASCII 0-9 before matching
  const asciiText = String(text).replace(/[০-৯]/g, (d) =>
    String('০১২৩৪৫৬৭৮৯'.indexOf(d))
  );
  const match = asciiText.match(/(?:\+?880[\s-]?|0)?1[3-9]\d{2}[\s-]?\d{6}\b/);
  if (!match) return '';
  return normalizeBDPhone(match[0]);
}

