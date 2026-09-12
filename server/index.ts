import 'dotenv/config'
import express from 'express'
import nodemailer from 'nodemailer'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const contactEmail = process.env.CONTACT_EMAIL ?? 'ritabratadasown@gmail.com'
const gmailUser = process.env.GMAIL_USER ?? contactEmail
const gmailAppPass = process.env.GMAIL_APP_PASS?.replace(/\s/g, '')

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailAppPass,
  },
})

app.use(express.json({ limit: '20kb' }))

app.post('/api/contact', async (request, response) => {
  const { name, email, subject, message } = request.body as Record<string, unknown>
  if (![name, email, subject, message].every(value => typeof value === 'string' && value.trim())) {
    response.status(400).json({ message: 'Please complete all fields.' })
    return
  }
  const nameValue = name as string
  const emailValue = email as string
  const subjectValue = subject as string
  const messageValue = message as string

  try {
    if (!gmailAppPass) {
      response.status(503).json({ message: 'Email is not configured. Add GMAIL_APP_PASS to .env and restart the backend.' })
      return
    }
    const nameText = nameValue.trim()
    const emailText = emailValue.trim()
    const subjectText = subjectValue.trim()
    const messageText = messageValue.trim()
    const messageHtml = escapeHtml(messageText).replace(/\r?\n/g, '<br>')

    const ownerMessage = {
      from: gmailUser,
      to: contactEmail,
      replyTo: emailText,
      subject: `[Portfolio] ${subjectText}`,
      text: `Name: ${nameText}\nEmail: ${emailText}\n\n${messageText}`,
      html: `<div style="margin:0;background:#f4f1eb;padding:32px 16px;font-family:Arial,sans-serif;color:#18201d">
        <div style="max-width:620px;margin:0 auto;background:#fffdf8;border:1px solid #d8d1c4">
          <div style="background:#18201d;padding:24px 28px;color:#fffdf8">
            <p style="margin:0 0 8px;color:#f2b84b;font-size:12px;letter-spacing:2px;text-transform:uppercase">Portfolio contact</p>
            <h1 style="margin:0;font-size:26px;font-weight:600">${escapeHtml(subjectText)}</h1>
          </div>
          <div style="padding:28px">
            <p style="margin:0 0 18px;font-size:16px;line-height:1.6">You received a new message from your portfolio contact form.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:22px;font-size:14px">
              <tr><td style="padding:10px 0;border-bottom:1px solid #e6e0d5;color:#6d756f;width:90px">Name</td><td style="padding:10px 0;border-bottom:1px solid #e6e0d5">${escapeHtml(nameText)}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #e6e0d5;color:#6d756f">Email</td><td style="padding:10px 0;border-bottom:1px solid #e6e0d5"><a href="mailto:${escapeHtml(emailText)}" style="color:#18794e">${escapeHtml(emailText)}</a></td></tr>
            </table>
            <h2 style="margin:0 0 10px;font-size:14px;color:#6d756f;text-transform:uppercase;letter-spacing:1px">Message</h2>
            <div style="padding:18px;background:#f4f1eb;font-size:15px;line-height:1.7">${messageHtml}</div>
          </div>
        </div>
      </div>`,
    }
    const confirmationMessage = {
      from: gmailUser,
      to: emailText,
      subject: `We received your message, ${nameText}`,
      text: `Hi ${nameText},\n\nThank you for contacting Ritabrata. Your message has been received and I will get back to you soon.\n\nSubject: ${subjectText}\n\nYour message:\n${messageText}`,
      html: `<div style="margin:0;background:#f4f1eb;padding:32px 16px;font-family:Arial,sans-serif;color:#18201d">
        <div style="max-width:620px;margin:0 auto;background:#fffdf8;border:1px solid #d8d1c4">
          <div style="background:#18201d;padding:24px 28px;color:#fffdf8">
            <p style="margin:0 0 8px;color:#f2b84b;font-size:12px;letter-spacing:2px;text-transform:uppercase">Message received</p>
            <h1 style="margin:0;font-size:26px;font-weight:600">Thanks for reaching out, ${escapeHtml(nameText)}.</h1>
          </div>
          <div style="padding:28px;font-size:15px;line-height:1.7">
            <p style="margin:0 0 16px">Your message has been received. I will review it and get back to you soon.</p>
            <p style="margin:0 0 8px;color:#6d756f;font-size:12px;letter-spacing:1px;text-transform:uppercase">Subject</p>
            <p style="margin:0 0 20px">${escapeHtml(subjectText)}</p>
            <div style="padding:18px;background:#f4f1eb">${messageHtml}</div>
          </div>
        </div>
      </div>`,
    }

    await Promise.all([
      transporter.sendMail(ownerMessage),
      transporter.sendMail(confirmationMessage),
    ])
    response.json({ message: 'Message sent successfully.' })
  } catch (error) {
    console.error('Contact email failed:', error)
    response.status(500).json({ message: 'Unable to send your message right now.' })
  }
})

app.listen(port, () => {
  console.log(`Contact API running at http://localhost:${port}`)
  if (!gmailAppPass) console.warn('Gmail is not configured. Add GMAIL_APP_PASS to .env before sending mail.')
})