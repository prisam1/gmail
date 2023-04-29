require("dotenv").config() 
const {google} = require('googleapis')
const express = require('express')
const app = express()

app.use(express.json())

 

let client_id = process.env.CLIENT_ID
let client_secret = process.env.CLIENT_SECRET
let redirect_uri = process.env.REDIRECT_URI



const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri

);

oAuth2Client.setCredentials({
  access_token: process.env.ACCESS_TOKEN ,
  refresh_token: process.env.REFRESH_TOKEN,
  scope:process.env.SCOPE,
});

const gmail = google.gmail({
  version: 'v1',
  auth: oAuth2Client
});

async function checkNewEmails() {
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: '-from:me is:unread'
  });
  const messages = res.data.messages;
  if (messages.length === 0) {
    console.log('No new messages');
  } else {
    console.log(`${messages.length} new message(s)`);
    messages.forEach(async (message) => {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id
      });
      const headers = msg.data.payload.headers;
      const from = headers.find(h => h.name === 'From').value;
      const threadId = msg.data.threadId;
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: threadId
      });
      const labels = thread.data.messages[0].labelIds;
      if (!labels.includes('REPLIED')) {
        const reply = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            threadId: threadId,
            message: {
              raw: Buffer.from(`From: ${from}\r\nTo: me\r\nSubject: Re: ${headers.find(h => h.name === 'Subject').value}\r\n\r\nThanks for your email!`).toString('base64')
            }
          }
        });
        console.log('Reply sent');
        await gmail.users.messages.modify({
          userId: 'me',
          id: message.id,
          requestBody: {
            addLabelIds: ['REPLIED']
          }
        });
        console.log('Label added to message');
      } else {
        console.log('Message already replied to');
      }
    });
  }
}
function generateRandomInterval() {
  return Math.floor(Math.random() * (120 - 45 + 1) + 45) * 1000;
}

setInterval(checkNewEmails, generateRandomInterval())


app.listen(process.env.PORT, function (){console.log("Application is connected")})