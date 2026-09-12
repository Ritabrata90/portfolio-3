import type { VercelRequest, VercelResponse } from '@vercel/node'
import nodemailer from 'nodemailer'

type ContactPayload = {
  name?: unknown
  email?: unknown
  subject?: unknown
  message?: unknown
}

const contactEmail = process.env.CONTACT_EMAIL ?? 'ritabratadasown@gmail.com'
const gmailUser = process.env.GMAIL_USER ?? contactEmail
const gmailAppPass = process.env.GMAIL_APP_PASS?.replace(/\s/g, '')

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
}

function emailTemplates(name: string, email: string, subject: string, message: string) {
  const messageHtml = escapeHtml(message).replace(/\r?\n/g, '<br>')
  const ownerHtml = `<div style="margin:0;background:#f4f1eb;padding:32px 16px;font-family:Arial,sans-serif;color:#18201d"><div style="max-width:620px;margin:0 auto;background:#fffdf8;border:1px solid #d8d1c4"><div style="background:#18201d;padding:24px 28px;color:#fffdf8"><p style="margin:0 0 8px;color:#f2b84b;font-size:12px;letter-spacing:2px;text-transform:uppercase">Portfolio contact</p><h1 style="margin:0;font-size:26px;font-weight:600">${escapeHtml(subject)}</h1></div><div style="padding:28px"><p style="margin:0 0 18px;font-size:16px;line-height:1.6">You received a new message from your portfolio contact form.</p><table style="width:100%;border-collapse:collapse;margin-bottom:22px;font-size:14px"><tr><td style="padding:10px 0;border-bottom:1px solid #e6e0d5;color:#6d756f;width:90px">Name</td><td style="padding:10px 0;border-bottom:1px solid #e6e0d5">${escapeHtml(name)}</td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #e6e0d5;color:#6d756f">Email</td><td style="padding:10px 0;border-bottom:1px solid #e6e0d5"><a href="mailto:${escapeHtml(email)}" style="color:#18794e">${escapeHtml(email)}</a></td></tr></table><h2 style="margin:0 0 10px;font-size:14px;color:#6d756f;text-transform:uppercase;letter-spacing:1px">Message</h2><div style="padding:18px;background:#f4f1eb;font-size:15px;line-height:1.7">${messageHtml}</div></div></div></div>`
  const confirmationHtml = `<div style="margin:0;background:#f4f1eb;padding:32px 16px;font-family:Arial,sans-serif;color:#18201d"><div style="max-width:620px;margin:0 auto;background:#fffdf8;border:1px solid #d8d1c4"><div style="background:#18201d;padding:24px 28px;color:#fffdf8"><p style="margin:0 0 8px;color:#f2b84b;font-size:12px;letter-spacing:2px;text-transform:uppercase">Message received</p><h1 style="margin:0;font-size:26px;font-weight:600">Thanks for reaching out, ${escapeHtml(name)}.</h1></div><div style="padding:28px;font-size:15px;line-height:1.7"><p style="margin:0 0 16px">Your message has been received. I will review it and get back to you soon.</p><p style="margin:0 0 8px;color:#6d756f;font-size:12px;letter-spacing:1px;text-transform:uppercase">Subject</p><p style="margin:0 0 20px">${escapeHtml(subject)}</p><div style="padding:18px;background:#f4f1eb">${messageHtml}</div></div></div></div>`
  return { ownerHtml, confirmationHtml }
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ message: 'Method not allowed.' })
  }

  const { name, email, subject, message } = (request.body ?? {}) as ContactPayload
  if (![name, email, subject, message].every(value => typeof value === 'string' && value.trim())) {
    return response.status(400).json({ message: 'Please complete all fields.' })
  }
  if (!gmailAppPass) {
    return response.status(503).json({ message: 'Email is not configured on the server.' })
  }

  const nameText = (name as string).trim()
  const emailText = (email as string).trim()
  const subjectText = (subject as string).trim()
  const messageText = (message as string).trim()
  const { ownerHtml, confirmationHtml } = emailTemplates(nameText, emailText, subjectText, messageText)
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailAppPass } })

  try {
    await Promise.all([
      transporter.sendMail({ from: gmailUser, to: contactEmail, replyTo: emailText, subject: `[Portfolio] ${subjectText}`, text: `Name: ${nameText}\nEmail: ${emailText}\n\n${messageText}`, html: ownerHtml }),
      transporter.sendMail({ from: gmailUser, to: emailText, subject: `We received your message, ${nameText}`, text: `Hi ${nameText},\n\nThank you for contacting Ritabrata. Your message has been received and I will get back to you soon.\n\nSubject: ${subjectText}\n\nYour message:\n${messageText}`, html: confirmationHtml }),
    ])
    return response.status(200).json({ message: 'Message sent successfully.' })
  } catch (error) {
    console.error('Contact email failed:', error)
    return response.status(500).json({ message: 'Unable to send your message right now.' })
  }
}
