const git = require('git-rev-sync');
const memCache = require('./memCache.js').memCache;

let getLatest = () => {
  var lastCommit = memCache.get('lastCommit');
  if (lastCommit) {
    console.log('<-- lastCommit: ' + lastCommit);
    return JSON.parse(lastCommit);
  } else {
    var newCommit = {
      hash: git.short(),
      message: git.message(),
      branch: git.branch(),
      dirty: git.isTagDirty()
    };
    memCache.set('lastCommit', JSON.stringify(newCommit), function(key, value) {
      console.log('--> newCommit: ' + key + ' : ' + value);
    })
    return newCommit;
  }
}

exports.getLatest = getLatest;
