export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { message } = req.body || {}
  if (!message?.text) return res.status(200).end()

  const chatId = message.chat.id
  const text = message.text

  if (text === '/play' || text === '/play@PadelScBot' || text === '/start' || text === '/start@PadelScBot') {
    const BOT_TOKEN = process.env.BOT_TOKEN
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '🏸 Padel Americano Score Tracker',
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🎮 Открыть Padel Score',
              web_app: { url: 'https://padel-americano-sigma.vercel.app' }
            }
          ]]
        }
      })
    })
  }

  res.status(200).end()
}
