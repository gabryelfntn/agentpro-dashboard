/** URL publique (authentification locale implicite) pour un fichier sous data/uploads. */
export function uploadPublicUrl(relPath: string) {
  return `/api/uploads/${relPath
    .replace(/\\/g, "/")
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")}`;
}
