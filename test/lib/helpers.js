const R = require('ramda')

const assertEqualProps = R.curry((props, obj1, obj2) => {
  const pickProps = R.pick(props)
  pickProps(obj1).should.deep.equal(pickProps(obj2))
})

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

module.exports = {
  assertEqualProps,
  wait
}
