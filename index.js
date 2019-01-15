const format = require('chat2components')
const Wit = require('tamed-wit-nlu')
const Promise = require('bluebird')
const path = require('path')
const readFile = Promise.promisify(require('fs').readFile)
require('dotenv-safe').config()
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

if (process.argv.length < 3) {
  console.log(`Usage for training : node ${path.basename(__filename)} <annotated story text file>`)
  let wit = new Wit({
    accessToken: process.env.WIT_ACCESS_TOKEN,
    apiVersion: process.env.WIT_API_VERSION
  })
  return test(wit)
}

readFile(process.argv[2], 'utf8')
.then((data) => {
  let ignore = false
  let chat = data.split('\n')
    // ignore block comment
    .reduce((filtered, rec) => {
			if (/\/\*/.test(rec)) {
				ignore = true
			} else if (/\*\//.test(rec)) {
				ignore = false
			} else if (!ignore) {
        console.log(rec)
        filtered.push(rec)
			}
      return filtered
    }, [])
  let components = chat.map(format)
    .filter(component => {
      return component.entities.length > 0 || component.intents.length > 0
    })
  //console.log(JSON.stringify(components, null, 2))
  let wit = new Wit({
    accessToken: process.env.WIT_ACCESS_TOKEN,
    apiVersion: process.env.WIT_API_VERSION
  })
  return wit.train(components, {
    batchSize: 1,
    rateLimit: 1,
    rateInterval: 'second' // number in miliseconds or time unit as in 'limiter'
  }).then(res => {
    console.log('trained: '+ res)
  })
  .then( () => {
    test(wit)
  })

}).catch((e) => {
 console.error(e)
})

function test(wit) {
  rl.question('Write sample to test: ',  ans => {
    if (/^\s*$/.test(ans)) {
      test(wit)
    } else if (/quit|exit|bye/i.test(ans)) {
      rl.close()
    } else {
      console.log('Wait..')
      wit.message(ans).then(res => {
        console.log(JSON.stringify(res, null, 2))
        test(wit)
      }).catch(err => {
        console.error(err)
        rl.close()
      })
    }
  })
}
