var fs = require('fs');
var path = require('path');
var filepath = path.join(__dirname, '../temp/article');

var createMobi = require('./createMobi.js');

function getUrlFromBody (body) {
  var regexp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;
  var cleanUrl = body['stripped-text'].match(regexp)[0];
  return cleanUrl;
}

function capture (body) {
  var url = getUrlFromBody(body);
  var formats = ['.pdf', '.mobi', '.txt']; // TODO: duplicate in email.js
  var format = '.pdf'; // sets a default
  formats.map((value) => { // parses subject for desired format
    if (body.subject && body.subject.indexOf(value) > -1) {
      format = value;
      console.log(`desired format is ${value}`);
    }
  })
  if (format === '.mobi') {
    return withSimplecrawler();
  } else {
    return withNightmare();
  }

  function withSimplecrawler () {
    return new Promise(function(resolve, reject) {
      var entryPointFound = false;
      var indexHTMLPath = path.join(__dirname, '../temp/index.html');
      console.log('simplecrawler called with url: ' + url);

      function sanitizeHtml (input) {
        var sanitizeHtml = require('sanitize-html');
        var minimalOptions = {
          // allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'pre', 'body', 'article', 'main', 'section', 'div', 'hr', 'title', 'code', 'ul', 'li'],
          allowedTags: sanitizeHtml.defaults.allowedTags.concat( ['body', 'html', 'head', 'article', 'main', 'section']),
          allowedAttributes: {
            // 'a': [ 'href' ]
          }
        }
        var minimalHtml = sanitizeHtml(input, minimalOptions)
        if (minimalHtml.length > 1000) {
          return minimalHtml;
        } else {
          return sanitizeHtml(input, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat( ['body', 'html', 'head', 'article', 'main', 'section']),
            allowedAttributes: {
              'a': [ 'href' ]
            }
            // ,
            // nonTextTags: [ 'Log In']
          });
        }
      }

      var Crawler = require("simplecrawler");
      var crawler = Crawler(url)
      .on("fetchcomplete", function (queueItem, responseBuffer, response) {
        var filename = path.join(__dirname, '../temp/' + queueItem.uriPath.replace(/['"/@]/g, ''));
        console.log('inspecting queueItem.uriPath: ' + queueItem.uriPath + ' from: ' + queueItem.url + ' on job: ' + url);
        if (entryPointFound === false) {
          var cleanHtml = sanitizeHtml(responseBuffer);
          fs.writeFile(indexHTMLPath, cleanHtml, (err) => {
            if (err) throw err;
            console.log(`saved ${queueItem.url} as ${indexHTMLPath} :: original length: ${Math.round(responseBuffer.length/1024, -2)}kB ${response.headers['content-type']} as index.html (${Math.round(cleanHtml.length/1024, -2)}kB after sanitation.)`);
            entryPointFound = true;
          })
          if (process.env.NODE_ENV === 'development') { // in development, also keep original
            fs.writeFile(indexHTMLPath + '.orig', responseBuffer, (err) => {
              if (err) throw err;
            })
          }
        } else if (queueItem.uriPath.length >3) { //TODO pretty every image is saved under a weired filename. also a lot of requests get the invaliddomain event (enable below)
          fs.writeFile(filename, responseBuffer, (err) => {
            if (err) throw err;
            console.log(`saved ${queueItem.url} as ${filename} :: ${responseBuffer.length}kB ${response.headers['content-type']}`);
          })
        } else {
          console.log('** skipped uriPath: ' + queueItem.uriPath);
        }
      })
      .on("complete", function () {
        console.log("crawling finished");
        resolve(createMobi.create());
      })
      // .on("robotstxterror", function(error) {console.log('robotstxterror! ' + error)})
      // .on("fetcherror", function(error) {console.log('fetcherror! ' + error)})
      // .on("fetchdisallowed", function(error) {console.log('fetchdisallowed! ' + error)})
      // .on("fetchprevented", function(error) {console.log('fetchprevented! ' + error)})
      // .on("invaliddomain", function(error) {console.log('invaliddomain! ' + JSON.stringify(error))})
      .on("crawlstart", function() {console.log('crawlstart! ')})

      crawler.maxDepth = 1;
      crawler.userAgent= 'Mozilla/5.0 (Linux; U; en-US) AppleWebKit/528.5+ (KHTML, like Gecko, Safari/528.5+) Version/4.0 Kindle/3.0 (screen 600×800; rotate)';
      crawler.interval = 400; // Four seconds
      crawler.maxConcurrency = 3;
      crawler.allowInitialDomainChange=true;
      crawler.parseHTMLComments=false;
      crawler.parseScriptTags=false;
      crawler.respectRobotsTxt=false;
      crawler.stripQuerystring=false;
      crawler.start();
    });
  }

  function withNightmare () {
    var Nightmare = require('nightmare');
    var nightmare = Nightmare({
      show: (process.env.NODE_ENV === 'development') ? true : false,// hide rendering in production
      loadTimeout: 5000,
      gotoTimeout: 5000,
      waitTimeout: 3000
    });

    // adds action to clear cache to Nightmare.
    Nightmare.action('clearCache',
    function(name, options, parent, win, renderer, done) {
      parent.respondTo('clearCache', function(done) {
        win.webContents.session.clearCache(done);
      });
      done();
    },
    function(done) {
      this.child.call('clearCache', done);
    });

    return nightmare
    .useragent('Mozilla/5.0 (Linux; U; en-US) AppleWebKit/528.5+ (KHTML, like Gecko, Safari/528.5+) Version/4.0 Kindle/3.0 (screen 600×800; rotate)')
    .viewport(800, 1220)
    .goto(url)
    .wait()
    .pdf(filepath + '.pdf', {
      pageSize: 'A5',
      marginsType: 2,
      printBackground: false,
      printSelectionOnly: false,
      landscape: false
    })
    .end()
    .catch(function (error) {
      console.error('Search failed:', error);
    });
  }
}


exports.capture = capture;
