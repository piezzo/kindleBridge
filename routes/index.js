var express = require('express');
var router = express.Router();
const memCache = require('../helpers/memCache.js').memCache;
// const getEventLog = require('../helpers/memCache.js').getEventLog;
var captureWebsite = require('../helpers/captureWebsite.js');
var email = require('../helpers/email.js');
var gitLog = require('../helpers/gitLog.js')


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'kindleBridge', gitLog: gitLog.getLatest(), config: { contact: process.env.CONTACT_EMAILADDR, domain: process.env.EMAIL_DOMAIN}});
});

router.post('/addToKindle', function(req, res, next) {
  // parse content
  if (process.env.NODE_ENV === 'development') console.log('DEBUG req.body: ' + JSON.stringify(req.body));
  let body = req.body;
  let mailEvent = req.body.event

  if (mailEvent) {
    // it's a status update about outgoing email
    email.validateWebhook(body)
    .then(() => {
      console.log('Update on outgoing email: ' + body["original_id"] + ' ' + mailEvent + ' for ' + body["original-sender"]);
      // Promise.resolve(email.sendUpdate(body)) // Amazon sends an email by default.
      addToMemCache({eventType: 'delivered', messageId: body["original_id"]});
      res.status(200).send('thanks! :)')
    })
  } else {
    // it's probably new content
    email.validateWebhook(body)
    .then(() => {
      console.log('Calling captureWebsite.capture(Url: ' + body['stripped-text'] + ')');
      addToMemCache({eventType: 'capturing', messageId: body["Message-Id"]});
      return captureWebsite.capture(body)
    })
    .then(() => {
      console.log('Calling email.sendArticle()');
      addToMemCache({eventType: 'sending email', messageId: body["Message-Id"]});
      return email.sendArticle(body)
    })
    .then(() => {
      console.log('Sending HTTP response status: 200')
      // addToMemCache('HTTP response status: 200', req.body["Message-Id"]);
      addToMemCache({eventType: 'HTTP response status: 200', messageId: body["Message-Id"]});
      console.log('successfully completed ' + body["Message-Id"])
      res.status(200).send('thanks! :)')
    })
    .catch(reason => {
      console.log(reason);
      addToMemCache({eventType: 'error', messageId: body["Message-Id"]});
      res.status(500).send('Request was valid. But the server was not able to fulfill the request (try another output format.).')
    })
  }

  function addToMemCache (data) {
    memCache.set('event-' + Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), {messageId: data.messageId, date: new Date, 'event': data.eventType}, function(key, value) {
      console.log('--> eventLog: ' + key + ' : ' + value);
    })
  }
});

module.exports = router;
