require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

resend.emails.send({
  from: process.env.MAIL_FROM,
  to: 'ayolawal19@gmail.com',
  subject: 'Shopa Email Test',
  html: '<p>If you see this, the email service is working.</p>',
}).then((result) => {
  console.log('Result:', JSON.stringify(result, null, 2));
}).catch((err) => {
  console.error('Error:', err.message);
});
