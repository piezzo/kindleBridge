var api_key = process.env.MAILGUN_API_KEY || 'key-XXXXXXXXXXXXXXXXXXXXXXX';
var domain = process.env.EMAIL_DOMAIN || 'www.mydomain.com';
var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

var fs = require('fs');
var path = require('path');
var glob  = require('glob');
var crypto = require('crypto');
var flags = ['.pdf', '.mobi', '.txt', '.cc']; // Supported options in Subject:-line
var formats = ['.pdf', '.mobi', '.txt']; // Supported formats

if (process.env.MAILGUN_API_KEY && process.env.EMAIL_DOMAIN && process.env.NODE_ENV && process.env.SEED) {
  console.log('Configuration read from env: \n'
  + 'MAILGUN_API_KEY: ' + process.env.MAILGUN_API_KEY.replace(/['"]/g, '').replace(/.....$/, '#####') + '\n'
  + 'MAIL_DOMAIN: ' + process.env.EMAIL_DOMAIN.replace(/['"]/g, '').replace(/.....$/, '#####') + '\n'
  + 'NODE_ENV: ' + process.env.NODE_ENV + '\n'
  + 'SEED length: ' + process.env.SEED.length + ' characters');
} else {
  console.log('Did not find a complete configuration.');
}

function getReceiver(recipient) {
  var cleanLocalPart = recipient.substring(0, recipient.indexOf('@')).replace(/-.*/,'');
  var hash = getHash(cleanLocalPart);
  var newRecipient = cleanLocalPart + '-' + hash;
  return newRecipient;
}

function getHash(recipient) {
  return crypto.createHmac('sha256', process.env.SEED || Math.random().toString(36).substring(7)).update( // Use seed to gain persistance of use random seed if none provided. This is neccessary to assure the user has access to the kindle-account for direct delivery.
    recipient.substring(0, recipient.indexOf('@')).substring(0, recipient.indexOf('-'))
  ).digest('hex').substring(0, 6)
}


function sendArticle(body) {
  console.log('aquireing HMAC for ' + body.recipient);
  var now = new Date;
  var format = '.pdf'; // sets a default
  var recipientHMAC = getReceiver(body.recipient);
  flags.map((value) => { // parses subject for desired format
    if (body.subject && body.subject.indexOf(value) > -1) {
      if (formats.indexOf(value) >-1) format = value; // If the Flag matches a format, set format.
      console.log(`Flag ${value} is present.`);
    }
  })
  var newFilename = (body.subject && body.subject.length >1) ? (body.subject.replace(/[!@#$%^&*/'"´`]/g, "")) : now;
  var newPath = path.join(__dirname, '../temp/' + newFilename + format);
  var oldPath = path.join(__dirname, '../temp/article' + format);
  fs.rename(oldPath, newPath, (error) => {if (error) console.log();(error); console.log('Renamed tempfile to ' + newPath)})
  console.log('newPath: ' + newFilename);
  var testmode = (process.env.NODE_ENV === 'development') ? 'yes' : 'no';
  var data = {
    from: 'kindleBridge <me@' + domain +'>',
    to: body.recipient.replace(/@.*$/g, '') + '@free.kindle.com',
    subject: body.subject.replace(/.pdf|.txt|.mobi|.cc/g, '').trim() || 'Hello from kindleBridge ' + now,
    'o:testmode': testmode, // sets testmode: yes header when process.env.NODE_ENV === 'development'. emails will not be delivered then.
    'v:original-sender': body.sender,
    'v:input-url': body['stripped-text'],
    'v:filename': newFilename,
    'v:original-message-id': body['Message-Id'],
    'x:X-Mailgun-Variables': JSON.stringify({'original_id': body['Message-Id']}),
    text: `Hey!

You find the requested pdf or mobi attached. You can directly forward this email to the kindle-address or equivalent to add it.

If you have already done the following steps, it is not neccessary to repeat them.

If you are new to this and would like to furter automate this process, within Amazons' kindle setup section, please add the email address
 "${recipientHMAC + '(@kindle.com)'}" as a device's address and
 "@${domain}" as a valid email-address for sending documents. This allows me to push the result directly to the eReader by veryfing that you are the one who controls the device.

Emails sent to ${recipientHMAC + '@kindlegridge.isnogood.de'} will then be pushed to the eReader immediately.

 `,// newline needed for attachment˝
    attachment: newPath
  };
  console.log(`HMAC match local parts: body.recipient ${body.recipient.replace(/@.*$/, '')} vs recipientHMAC ${recipientHMAC}: ${body.recipient.replace(/@.*$/, '') === recipientHMAC}`);
  // if (body.subject && body.subject.indexOf('.cc') > -1) data.cc = body.sender; // TODO reenable
  if (body.recipient === recipientHMAC + '@kindlebridge.isnogood.de') { // HMAC ist valid (User has the correct signature)
    data.to = body.recipient.replace(/@.*$/g, '') + '@free.kindle.com'
    console.log('New email for ' + data.to + ', o:testmode: ' + testmode)
  } else {
    data.to = body.sender
    console.log('New email for ' + data.to + ', o:testmode: ' + testmode)
  }

  mailgun.messages().send(data, function (error, body) {
    if (error) console.log('Error queuing email: ' + error);
    console.log('Email dispatch status: ' + JSON.stringify(body));
    if ( process.env.NODE_ENV === 'development') {

      glob('temp/[!.thisDirectoryIsNeeded]*', {dot:true}, (err, files) => {
        files.forEach(function(item){
          fs.unlink(item, (error) => {
            if (error) {
              console.log('error removing tempfile: ' + item + ' - ' + error)
            } else {
              console.log('Removed tempfile ' + item);
            }
          });
        })
      })
    }
  });
}

function sendUpdate (body) {
  if (body['original-sender']) {// if it does not refer to an input, do not continue.
    var testmode = (process.env.NODE_ENV === 'development') ? 'yes' : 'no';
    var data = {
      from: 'Kindle-forwarder <me@' + domain +'>',
      to: body['original-sender'],
      subject: 'New article ' + body.event + ': ' + body.filename,
      'o:testmode': testmode, // sets testmode: yes header when process.env.NODE_ENV === 'development'. emails will not be delivered then.
      //  'v:original-sender': body.sender,
      'v:original-message-id': body['Message-Id'],
      text: 'Your new article has been delivered!\n' + body.filename + ' has been ' + body.event + ' to ' + body.recipient + ' at ' + new Date(body.timestamp * 1000) + '. Input url was: ' + body['input-url']
    };
    mailgun.messages().send(data, function (error, body) {
      if (error) console.log('Error queuing email: ' + error);
      console.log('Email dispatch status: ' + JSON.stringify(body));
    });
    console.log(`New email for ${data.to}, o:testmode: ${testmode}`)
  } else {
    console.log('Neither new content, nor delivery update. Ignoring request.')
  }
}

function validateWebhook (body) {
  if (process.env.NODE_ENV === 'development') {
    console.log('Skipping verification.')
    return Promise.resolve()
  } else {
    if (!mailgun.validateWebhook(body.timestamp, body.token, body.signature)) {
      console.error('Request came, but not from Mailgun');
      Promise.reject('invalid signature.').catch(reason => console.log('Error validating Webhook: ' + reason));
    } else {
      console.log('New incoming valid request.')
      return Promise.resolve('valid');
    }
  }
}

exports.validateWebhook = validateWebhook;
exports.sendArticle = sendArticle;
exports.sendUpdate = sendUpdate;
