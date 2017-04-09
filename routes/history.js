var express = require('express');
var router = express.Router();
var gitLog = require('../helpers/gitLog.js')
const getEventLog = require('../helpers/memCache.js').getEventLog;


router.get('/', function(req, res, next) {
  res.render('history', { title: 'kindleBridge', gitLog: gitLog.getLatest(), history: getEventLog(), config: { contact: process.env.CONTACT_EMAILADDR, domain: process.env.EMAIL_DOMAIN}});
});

module.exports = router;
