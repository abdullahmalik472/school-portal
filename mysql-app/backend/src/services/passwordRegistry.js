
const crypto = require('crypto')

const getConfig = () => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, PASSWORD_REGISTRY_PEPPER } =
    process.env

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !PASSWORD_REGISTRY_PEPPER) {
    throw new Error('Password registry environment configuration is missing')
  }

  return {
    url: SUPABASE_URL.replace(/\/+$/, ''),
    serviceKey: SUPABASE_SERVICE_KEY,
    pepper: PASSWORD_REGISTRY_PEPPER,
  }
}

// Generate a deterministic, secret HMAC fingerprint.
// The original password is never sent to Supabase.
const fingerprintPassword = (password) => {
  const { pepper } = getConfig()

  return crypto
    .createHmac('sha256', pepper)
    .update(password, 'utf8')
    .digest('hex')
}

// Call a protected Supabase database function.
const callRegistry = async (functionName, body) => {
  const { url, serviceKey } = getConfig()

  const response = await fetch(
    `${url}/rest/v1/rpc/${functionName}`,
    {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    console.error(
      `Password registry error (${functionName}):`,
      response.status,
      result?.message || result?.error || 'Unknown error'
    )
    throw new Error('Password registry is currently unavailable')
  }

  return result
}

// Reserve a globally unique password.
async function reservePassword(password) {
  const fingerprint = fingerprintPassword(password)
  const reservationId = crypto.randomUUID()

  const reserved = await callRegistry(
    'reserve_password_fingerprint',
    {
      p_fingerprint: fingerprint,
      p_reservation_id: reservationId,
    }
  )

  return {
    reserved: reserved === true,
    reservationId,
  }
}

// Mark the password as permanently used after account creation.
async function finalizePassword({
  reservationId,
  backend,
  userId,
  organizationId,
}) {
  const finalized = await callRegistry(
    'finalize_password_fingerprint',
    {
      p_reservation_id: reservationId,
      p_backend: backend,
      p_account_user_id: String(userId),
      p_organization_id: String(organizationId),
    }
  )

  if (finalized !== true) {
    throw new Error('Could not finalize password registration')
  }
}

// Release a reservation if account creation fails.
async function releasePassword(reservationId) {
  return callRegistry(
    'release_password_fingerprint',
    {
      p_reservation_id: reservationId,
    }
  )
}

module.exports = {
  reservePassword,
  finalizePassword,
  releasePassword,
}
