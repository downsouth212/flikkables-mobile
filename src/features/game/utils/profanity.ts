const BLOCKED = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'whore', 'slut', 'bastard', 'nigger', 'nigga', 'fag', 'retard', 'asshole', 'wank', 'twat', 'piss'];

export function isProfane(text: string) {
  const t = text.toLowerCase().replace(/[^a-z]/g, '');
  return BLOCKED.some((w) => t.includes(w));
}
