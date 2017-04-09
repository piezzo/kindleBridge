const NodeCache = require( "node-cache" );
const memCache = new NodeCache( { stdTTL: 3600, checkperiod: 360 } );

function getEventLog () {
  var eventLog = [];
  memCache.keys(function(err, keys) {
    console.log('<-- eventLog keys: ' + keys);
    return keys.map(function(key) {
      if (key.indexOf('event') > -1) eventLog.push(memCache.get(key));
    })
  })
  console.log('eventLog:' + JSON.stringify(eventLog));
  if (process.env.NODE_ENV === 'development') console.log('current memCache stats:' + JSON.stringify(memCache.getStats()));
  return eventLog.reverse();
}

exports.memCache = memCache;
exports.getEventLog = getEventLog;
