// Random password for accounts created by an admin. crypto.randomInt is cryptographically secure.
// No look-alike characters (0/O, 1/l/I) so it is easy to read out or type.
const crypto = require('crypto')

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

const generatePassword = (length = 10) =>
  Array.from({ length }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('')

module.exports = { generatePassword }
