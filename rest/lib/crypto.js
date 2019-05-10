const crypto = require('crypto')

const ALGORITHM = 'aes-256-ctr'

// larger numbers mean better security
var passwordOpts = {
  // size of the generated hash
  hashBytes: 32,
  // larger salt means hashed passwords are more resistant to rainbow table, but
  // you get diminishing returns pretty fast
  saltBytes: 16,
  // more iterations means an attacker has to take longer to brute force an
  // individual password, so larger is better. however, larger also means longer
  // to hash the password. tune so that hashing the password takes about a
  // second
  iterations: 872791
}

/**
 * Hash a password using Node's asynchronous pbkdf2 (key derivation) function.
 *
 * Returns a self-contained buffer which can be arbitrarily encoded for storage
 * that contains all the data needed to verify a password.
 *
 * @access public
 *
 * @param {!string} password
 * @param {Object} opts - password hashing options
 */
function hashPassword (password, opts = {}) {
  opts = { ...passwordOpts, ...opts }
  return new Promise((resolve, reject) => {
    // generate a salt for pbkdf2
    crypto.randomBytes(opts.saltBytes, (err, salt) => {
      if (err) return reject(err)

      crypto.pbkdf2(password, salt, opts.iterations, opts.hashBytes, 'sha1', (err, hash) => {
        if (err) return reject(err)

        var combined = Buffer.alloc(hash.length + salt.length + 8)

        // include the size of the salt so that we can, during verification,
        // figure out how much of the hash is salt
        combined.writeUInt32BE(salt.length, 0, true)
        // similarly, include the iteration count
        combined.writeUInt32BE(opts.iterations, 4, true)

        salt.copy(combined, 8)
        hash.copy(combined, salt.length + 8)
        // combined = combined.toString('utf8');
        resolve(combined.toString('hex'))
      })
    })
  })
}

/**
 * Verify a password using Node's asynchronous pbkdf2 (key derivation) function.
 *
 * Accepts a hash and salt generated by hashPassword, and returns whether the
 * hash matched the password (as a boolean).
 *
 * @access public
 * @param {!string} password
 * @param {!Buffer} combined - Buffer containing hash and salt as generated by hashPassword.
 */
function verifyPassword (password, passwordHash) {
  return new Promise((resolve, reject) => {
    // extract the salt and hash from the combined buffer
    passwordHash = Buffer.from(passwordHash, 'hex')
    const saltBytes = passwordHash.readUInt32BE(0)
    const hashBytes = passwordHash.length - saltBytes - 8
    const iterations = passwordHash.readUInt32BE(4)
    const salt = passwordHash.slice(8, saltBytes + 8)
    const hash = passwordHash.toString('binary', saltBytes + 8)

    // verify the salt and hash against the password
    crypto.pbkdf2(password, salt, iterations, hashBytes, 'sha1', (err, verify) => {
      if (err) return reject(err)
      resolve(verify.toString('binary') === hash)
    })
  })
}

function encrypt (data, key, delimiter = '-') {
  let vec = crypto.randomBytes(16)
  let cfr = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'base64'), vec)
  let en = cfr.update(JSON.stringify(data), 'utf8', 'base64')
  en += cfr.final('base64')
  return `${vec.toString('base64')}${delimiter}${en}`
}

function decrypt (encData, key, delimiter = '-') {
  let parts = encData.split(delimiter)
  let vec = Buffer.from(parts[0], 'base64')
  let dec = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'base64'), vec)
  let res = dec.update(parts[1], 'base64', 'utf8')
  res += dec.final('utf8')
  return JSON.parse(res)
}

function genKey (length = 32) {
  return crypto.randomBytes(length).toString('base64')
}

module.exports = {
  hashPassword,
  verifyPassword,
  encrypt,
  decrypt,
  genKey
}
