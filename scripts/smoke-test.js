// End-to-end multi-organization check against a RUNNING backend. Works for BOTH backends (same API).
//
//   API_URL=http://localhost:4000 PLATFORM_EMAIL=you@x.com PLATFORM_PASSWORD=secret ADMIN_CODE=ADMIN-ALI-1001 node scripts/smoke-test.js
//   (use 4001 for the Supabase backend)
//
// !! Creates two throw-away organizations (TST<random>) and users. Run it against a LOCAL / TEST database only.
// Existing organization used for the "legacy data still works" part: LEGACY_ORG (default BHL).
const API = process.env.API_URL || 'http://localhost:4000'
const { PLATFORM_EMAIL, PLATFORM_PASSWORD, ADMIN_CODE } = process.env
const LEGACY_ORG = process.env.LEGACY_ORG || 'BHL'
const rnd = Math.random().toString(36).slice(2, 5).toUpperCase()
const A = `TA${rnd}`, B = `TB${rnd}`

let pass = 0, fail = 0
const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    ...(body && { body: JSON.stringify(body) }),
  })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}
const check = (name, cond, extra = '') => {
  cond ? pass++ : fail++
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${cond ? '' : '   ' + extra}`)
}
const section = (t) => console.log(`\n== ${t}`)

async function main() {
  if (!PLATFORM_EMAIL || !PLATFORM_PASSWORD) throw new Error('Set PLATFORM_EMAIL and PLATFORM_PASSWORD (create one with: npm run create-platform-admin)')

  section('Platform admin')
  const pl = await call('POST', '/auth/login', { body: { email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD, organization: 'PLATFORM' } })
  check('platform admin can log in', pl.status === 200 && pl.data.user?.role === 'platform_admin', JSON.stringify(pl.data))
  const P = pl.data.token
  check('platform admin has no organization', pl.data.user?.organization === null)
  check('platform admin is NOT allowed on tenant data (/api/courses)', (await call('GET', '/api/courses', { token: P })).status === 403)

  const oa = await call('POST', '/platform/organizations', { token: P, body: { code: A, name: 'Test School A' } })
  const ob = await call('POST', '/platform/organizations', { token: P, body: { code: B, name: 'Test School B' } })
  check('create organization A', oa.status === 201, JSON.stringify(oa.data))
  check('create organization B', ob.status === 201, JSON.stringify(ob.data))
  check('duplicate organization code rejected (409)', (await call('POST', '/platform/organizations', { token: P, body: { code: A.toLowerCase(), name: 'dup' } })).status === 409)
  check('bad organization code rejected (400)', (await call('POST', '/platform/organizations', { token: P, body: { code: '1!', name: 'x' } })).status === 400)

  section('Registration IDs + per-organization email')
  const reg = (org, email, role = 'student', extra = {}) =>
    call('POST', '/auth/register', { body: { name: email.split('@')[0], email, password: 'pass1234', role, organization: org, ...extra } })
  const s1 = await reg(A, 'ali@school.test'), s2 = await reg(A, 'sara@school.test')
  const t1 = await reg(A, 'teach@school.test', 'teacher'), t2 = await reg(A, 'teach2@school.test', 'teacher')
  check(`first student in ${A} gets ${A}0001`, s1.data.user?.reg_id === `${A}0001`, JSON.stringify(s1.data))
  check(`second student gets ${A}0002`, s2.data.user?.reg_id === `${A}0002`, JSON.stringify(s2.data))
  check(`first teacher gets ${A}-T0001`, t1.data.user?.reg_id === `${A}-T0001`, JSON.stringify(t1.data))
  check(`second teacher gets ${A}-T0002`, t2.data.user?.reg_id === `${A}-T0002`, JSON.stringify(t2.data))
  const sB = await reg(B, 'ali@school.test') // SAME email, different organization
  check('same email can register in another organization', sB.status === 201, JSON.stringify(sB.data))
  check(`counters are independent per organization (${B}0001)`, sB.data.user?.reg_id === `${B}0001`)
  check('same email twice in the SAME organization -> 409', (await reg(A, 'ali@school.test')).status === 409)
  check('missing organization -> 400', (await call('POST', '/auth/register', { body: { name: 'x', email: 'x@x.test', password: 'p' } })).status === 400)
  check('unknown organization -> 400', (await reg('NOPE', 'x@x.test')).status === 400)
  check('cannot self-register as platform_admin', (await reg(A, 'evil@x.test', 'platform_admin')).status === 400)
  check('admin role still needs the admin code', (await reg(A, 'adm0@x.test', 'admin', { adminCode: 'wrong' })).status === 403)
  if (ADMIN_CODE) {
    const ad = await reg(A, 'admin@school.test', 'admin', { adminCode: ADMIN_CODE })
    check('organization admin registers with admin code and gets no reg_id', ad.status === 201 && ad.data.user.reg_id === null, JSON.stringify(ad.data))
  }
  // concurrent registrations must never hand out the same number
  const many = await Promise.all(Array.from({ length: 8 }, (_, i) => reg(A, `par${i}@school.test`)))
  const ids = many.map((r) => r.data.user?.reg_id)
  check('8 simultaneous registrations -> 8 different registration IDs', many.every((r) => r.status === 201) && new Set(ids).size === 8, ids.join(','))

  section('Login is per organization')
  const login = (org, email, password = 'pass1234') => call('POST', '/auth/login', { body: { email, password, organization: org } })
  const la = await login(A, 'ali@school.test'), lb = await login(B, 'ali@school.test')
  check('login with the right organization works', la.status === 200 && lb.status === 200)
  check('the two same-email accounts are different users', la.data.user?.id !== lb.data.user?.id)
  check('login for the wrong organization fails (401)', (await login(B, 'sara@school.test')).status === 401)
  check('wrong password fails (401)', (await login(A, 'ali@school.test', 'nope')).status === 401)
  check('login without organization -> 400', (await call('POST', '/auth/login', { body: { email: 'ali@school.test', password: 'pass1234' } })).status === 400)
  check('normal user cannot use PLATFORM login (401)', (await login('PLATFORM', 'ali@school.test')).status === 401)

  section('Data isolation')
  const TA = (await login(A, 'teach@school.test')).data.token
  const TB = (await login(B, 'ali@school.test')).data.token // a student of B
  const c1 = await call('POST', '/api/courses', { token: TA, body: { title: 'Physics (A)' } })
  check('teacher creates a course in own organization', c1.status === 201, JSON.stringify(c1.data))
  const seenA = (await call('GET', '/api/courses', { token: la.data.token })).data.courses
  const seenB = (await call('GET', '/api/courses', { token: TB })).data.courses
  check('student of A sees the course', seenA.some((c) => c.title === 'Physics (A)'))
  check('student of B does NOT see A\'s course', !seenB.some((c) => c.title === 'Physics (A)'))
  check('student cannot create courses (403)', (await call('POST', '/api/courses', { token: TB, body: { title: 'x' } })).status === 403)
  check('student cannot list users (403)', (await call('GET', '/api/users', { token: TB })).status === 403)
  check('student cannot reach /platform (403)', (await call('GET', '/platform/organizations', { token: TB })).status === 403)
  check('no token -> 401', (await call('GET', '/api/courses')).status === 401)
  // body tampering: organization in the body must be ignored
  const c2 = await call('POST', '/api/courses', { token: TA, body: { title: 'Tamper', organization_id: 999, organization: B } })
  check('organization in request body is ignored', c2.status === 201 && !(await call('GET', '/api/courses', { token: TB })).data.courses.some((c) => c.title === 'Tamper'))

  if (ADMIN_CODE) {
    const AA = (await login(A, 'admin@school.test')).data.token
    const users = (await call('GET', '/api/users', { token: AA })).data.users
    check('org admin sees only own organization\'s users', users.length > 0 && users.every((u) => !u.email.includes('@x.test')) && !users.some((u) => u.id === lb.data.user.id))
    check('org admin sees registration IDs', users.some((u) => u.reg_id === `${A}0001`))
  }

  section('Admins create accounts (generated registration ID + password)')
  const mkAdmin = await call('POST', `/platform/organizations/${oa.data.organization.id}/admins`, { token: P, body: { name: 'Gen Admin', email: 'genadmin@school.test' } })
  check('platform admin creates an organization admin', mkAdmin.status === 201 && mkAdmin.data.user?.role === 'admin' && mkAdmin.data.user.reg_id === null, JSON.stringify(mkAdmin.data))
  check('a random password of 10 characters was generated', typeof mkAdmin.data.password === 'string' && mkAdmin.data.password.length === 10)
  const genAdminLogin = await login(A, 'genadmin@school.test', mkAdmin.data.password)
  check('the generated password really logs in', genAdminLogin.status === 200)
  check('duplicate admin email in the same organization -> 409', (await call('POST', `/platform/organizations/${oa.data.organization.id}/admins`, { token: P, body: { name: 'x', email: 'genadmin@school.test' } })).status === 409)
  check('students cannot use the platform admin-creation endpoint', (await call('POST', `/platform/organizations/${oa.data.organization.id}/admins`, { token: TB, body: { name: 'x', email: 'y@y.test' } })).status === 403)

  const GA = genAdminLogin.data.token
  const nextStudent = await call('POST', '/api/users', { token: GA, body: { name: 'Gen Student', email: 'genstudent@school.test', role: 'student', organization_id: 999, organization: B } })
  check('org admin creates a student: next registration ID is generated', nextStudent.status === 201 && /^TA\w+\d{4}$/.test(nextStudent.data.user?.reg_id) && nextStudent.data.user.reg_id.startsWith(A), JSON.stringify(nextStudent.data))
  const nextTeacher = await call('POST', '/api/users', { token: GA, body: { name: 'Gen Teacher', email: 'genteacher@school.test', role: 'teacher' } })
  check('org admin creates a teacher: -T registration ID is generated', nextTeacher.status === 201 && nextTeacher.data.user?.reg_id.startsWith(`${A}-T`), JSON.stringify(nextTeacher.data))
  check('the new student can log in with the generated password', (await login(A, 'genstudent@school.test', nextStudent.data.password)).status === 200)
  check('the account landed in the admin\'s own organization, not the one in the body', (await login(B, 'genstudent@school.test', nextStudent.data.password)).status === 401)
  check('org admin cannot create another admin or platform admin (400)', (await call('POST', '/api/users', { token: GA, body: { name: 'x', email: 'z@z.test', role: 'admin' } })).status === 400
        && (await call('POST', '/api/users', { token: GA, body: { name: 'x', email: 'z@z.test', role: 'platform_admin' } })).status === 400)
  check('duplicate email -> 409', (await call('POST', '/api/users', { token: GA, body: { name: 'x', email: 'genstudent@school.test', role: 'student' } })).status === 409)
  check('a teacher cannot create users (403)', (await call('POST', '/api/users', { token: TA, body: { name: 'x', email: 'q@q.test', role: 'student' } })).status === 403)
  const genIds = [nextStudent.data.user.reg_id, nextTeacher.data.user.reg_id]
  check('generated IDs never repeat an existing one', new Set(genIds).size === 2 && !genIds.includes(`${A}0001`))

  section('Platform admin sees everything; deactivation')
  const list = (await call('GET', '/platform/organizations', { token: P })).data.organizations
  check('platform admin lists all organizations with counts', list.some((o) => o.code === A && Number(o.users) >= 4) && list.some((o) => o.code === B))
  const pu = await call('GET', `/platform/organizations/${oa.data.organization.id}/users`, { token: P })
  const pc = await call('GET', `/platform/organizations/${oa.data.organization.id}/courses`, { token: P })
  check('platform admin reads users of any organization', pu.status === 200 && pu.data.users.length >= 4)
  check('platform admin reads courses of any organization', pc.status === 200 && pc.data.courses.some((c) => c.title === 'Physics (A)'))
  check('unknown organization id -> 404', (await call('GET', '/platform/organizations/999999/users', { token: P })).status === 404)

  const pubList = (await call('GET', '/auth/organizations')).data.organizations
  check('public list shows active organizations (codes only, no counts)', pubList.some((o) => o.code === A) && !('users' in pubList[0]))

  const off = await call('PATCH', `/platform/organizations/${oa.data.organization.id}`, { token: P, body: { is_active: false } })
  check('platform admin deactivates organization A', off.status === 200 && !off.data.organization.is_active)
  check('A\'s users with an OLD token are locked out immediately (403)', (await call('GET', '/api/courses', { token: la.data.token })).status === 403)
  check('A\'s users cannot log in (403)', (await login(A, 'ali@school.test')).status === 403)
  check('nobody can register into A (403)', (await reg(A, 'late@school.test')).status === 403)
  check('A disappears from the public list', !(await call('GET', '/auth/organizations')).data.organizations.some((o) => o.code === A))
  check('B is unaffected', (await call('GET', '/api/courses', { token: TB })).status === 200)
  const on = await call('PATCH', `/platform/organizations/${oa.data.organization.id}`, { token: P, body: { is_active: true } })
  check('reactivating A restores access', on.status === 200 && (await call('GET', '/api/courses', { token: la.data.token })).status === 200)

  section(`Legacy data (${LEGACY_ORG}) still works`)
  const leg = (await call('GET', '/auth/organizations')).data.organizations.find((o) => o.code === LEGACY_ORG)
  check(`${LEGACY_ORG} exists`, Boolean(leg))
  if (process.env.LEGACY_EMAIL && process.env.LEGACY_PASSWORD) {
    const ll = await login(LEGACY_ORG, process.env.LEGACY_EMAIL, process.env.LEGACY_PASSWORD)
    check('an existing user can still log in with the same email + password', ll.status === 200, JSON.stringify(ll.data))
    const lc = await call('GET', '/api/courses', { token: ll.data.token })
    check('existing courses are visible', lc.status === 200 && lc.data.courses.length > 0 && !lc.data.courses.some((c) => c.title === 'Physics (A)'))
  }

  // tidy up: switch the throw-away organizations off so they leave the public list
  for (const o of [oa, ob]) await call('PATCH', `/platform/organizations/${o.data.organization.id}`, { token: P, body: { is_active: false } })

  console.log(`\n${fail ? 'FAILED' : 'ALL GOOD'}: ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('!!', e.message); process.exit(1) })
