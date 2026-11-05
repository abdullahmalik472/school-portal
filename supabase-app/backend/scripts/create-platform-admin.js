// Creates (or resets the password of) a PLATFORM ADMIN: the one account type that belongs to no organization
// and can create / activate / deactivate organizations. It can't be created through the website on purpose.
//
//   npm run create-platform-admin -- "Your Name" you@example.com "a-strong-password"
//
require('dotenv').config({ quiet: true })
const bcrypt = require('bcryptjs')
const db = require('../src/db/repo')

async function main() {
  const [name, email, password] = process.argv.slice(2)
  if (!name || !email || !password) {
    console.error('Usage: npm run create-platform-admin -- "Name" email password')
    process.exit(1)
  }
  if (password.length < 8) throw new Error('Use a password of at least 8 characters')

  const password_hash = await bcrypt.hash(password, 10)
  const existing = await db.findUserByEmail(email, null)
  if (existing) {
    await db.updatePassword(existing.id, password_hash)
    console.log(`Platform admin ${email} already existed: password updated.`)
  } else {
    const u = await db.createUser({ name, email, role: 'platform_admin', password_hash, organization_id: null })
    console.log(`Platform admin created: ${u.email} (id ${u.id}). Login: choose "Platform administrator" on the login page.`)
  }
  process.exit(0)
}

main().catch((e) => { console.error('!!', e.code || '', e.message); process.exit(1) })
