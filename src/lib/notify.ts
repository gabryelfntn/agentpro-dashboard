export function notifyDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("agentpro-data-changed"));
  }
}

export function notifyProfileChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("agentpro-profile-changed"));
  }
}
