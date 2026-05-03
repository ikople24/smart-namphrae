/**
 * @param {'en'|'th'} language
 * @param {string} thaiLabel
 * @param {string} [labelEn]
 * @param {Record<string, string>} [problemMap]
 */
export function getProblemDisplayLabel(language, thaiLabel, labelEn, problemMap) {
  const label = typeof thaiLabel === "string" ? thaiLabel : "";
  if (language !== "en") return label;

  const en = labelEn != null ? String(labelEn).trim() : "";
  if (en && !/^\[TH\]/i.test(en)) return en;

  const map = problemMap && typeof problemMap === "object" ? problemMap : {};
  const key = label.trim();
  return map[label] || map[key] || label;
}
