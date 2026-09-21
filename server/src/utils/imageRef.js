// Accepts either a full URL (https://...) or the relative path our own
// /api/*/upload endpoints return (/images/uploads/...). Shared by the
// seller product validator and the profile/avatar validator so both
// accept the output of the same upload feature.
function isValidImageRef(value) {
  const v = String(value).trim();
  return /^https?:\/\//i.test(v) || v.startsWith("/images/");
}

module.exports = { isValidImageRef };
