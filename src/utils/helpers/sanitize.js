/**
 * Remove campos internos de documentos Mongoose.
 * @param {object|null} doc
 * @param {string[]} extraFields - campos adicionais a remover (ex: ['senha'])
 */
export function sanitizeDoc(doc, extraFields = []) {
  if (!doc) return null;
  const raw = typeof doc?.toObject === 'function' ? doc.toObject() : { ...doc };
  delete raw.__v;
  for (const field of extraFields) {
    delete raw[field];
  }
  return raw;
}
