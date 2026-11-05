// Registration IDs are per organization:
//   student -> BHL0001      teacher -> BHL-T0001
// The counter lives in the organizations table (student_seq / teacher_seq).
const PREFIX = { student: '', teacher: '-T' }

const hasRegId = (role) => Object.hasOwn(PREFIX, role) // admins / platform admins get no registration ID

const formatRegId = (orgCode, role, n) => `${orgCode}${PREFIX[role]}${String(n).padStart(4, '0')}`

module.exports = { hasRegId, formatRegId }
