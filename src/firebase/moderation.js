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

function checkBlacklist(text) {
  const lower = text.toLowerCase()
  for (const word of BLACKLIST) {
    if (lower.includes(word)) {
      return { blocked: true, reason: `Message contains inappropriate language.` }
    }
  }
  return { blocked: false }
}

export async function moderateMessage(text) {
  const blacklistCheck = checkBlacklist(text)
  if (blacklistCheck.blocked) return blacklistCheck

  try {
    const apiKey = import.meta.env.VITE_GEMMA_API_KEY
    if (!apiKey) return { blocked: false }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a content moderator for a college farewell app. Check if this message is appropriate. The message should not contain: harassment, bullying, threats, sexual content, hate speech, or personally attacking someone in a hurtful way. Playful roasts and friendly banter are OK. Reply with ONLY "SAFE" or "BLOCKED: [reason]". Message: "${text}"`
            }]
          }]
        })
      }
    )

    if (!response.ok) return { blocked: false }

    const data = await response.json()
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

    if (result.startsWith('BLOCKED')) {
      const reason = result.replace('BLOCKED:', '').replace('BLOCKED', '').trim()
      return { blocked: true, reason: reason || 'Message flagged as inappropriate.' }
    }

    return { blocked: false }
  } catch {
    return { blocked: false }
  }
}
