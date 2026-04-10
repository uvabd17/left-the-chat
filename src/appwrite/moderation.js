const BLACKLIST_EN = [
  'fuck', 'shit', 'bitch', 'ass', 'dick', 'pussy', 'cock', 'cunt',
  'whore', 'slut', 'bastard', 'nigger', 'faggot', 'retard',
  'kill yourself', 'kys', 'rape', 'molest'
]

const BLACKLIST_TE = [
  'dengey', 'pooku', 'modda', 'lanja', 'lanjakodaka',
  'gudda', 'sulli', 'erripuku', 'nakodaka', 'denga'
]

const BLACKLIST = [...BLACKLIST_EN, ...BLACKLIST_TE]

export async function moderateMessage(text) {
  const lower = text.toLowerCase()
  for (const word of BLACKLIST) {
    if (lower.includes(word)) {
      return { blocked: true, reason: 'Message contains inappropriate language.' }
    }
  }
  return { blocked: false }
}
