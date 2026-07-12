/**
 * Mock Auth API
 *
 * Simulates backend auth endpoints with realistic delays and responses.
 * Swap these with real api.post() calls when backend is wired.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Fake user DB for demo
const MOCK_USERS = [
  {
    id: 1,
    name: 'Mayank Padhi',
    email: 'mayank@example.com',
    password: 'Password1',
  },
]

// Fake org DB
const MOCK_WORKSPACES = [
  {
    org_id: 108,
    org_name: 'Acme Corp',
    slug: 'acme-corp',
    role: 'Admin',
    status: 'Active',
    member_count: 24,
  },
  {
    org_id: 215,
    org_name: 'Side Project LLC',
    slug: 'side-project-llc',
    role: 'Asset Manager',
    status: 'Active',
    member_count: 6,
  },
]

function generateToken(userId) {
  // Fake JWT — not real, just looks like one
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ user_id: userId, exp: Date.now() + 1800000 }))
  return `${header}.${payload}.mock_signature`
}

/**
 * POST /api/auth/signup
 */
export async function mockSignup({ name, email, password }) {
  await delay(800)

  const exists = MOCK_USERS.find((u) => u.email === email)
  if (exists) {
    throw {
      response: { status: 409, data: { message: 'An account with this email already exists. Try logging in.' } },
    }
  }

  const newUser = { id: MOCK_USERS.length + 1, name, email, password }
  MOCK_USERS.push(newUser)

  return {
    user: { id: newUser.id, name: newUser.name, email: newUser.email },
    accessToken: generateToken(newUser.id),
    refreshToken: generateToken(newUser.id),
    workspaces: [], // New user has 0 orgs
  }
}

/**
 * POST /api/auth/login
 */
export async function mockLogin({ email, password }) {
  await delay(800)

  const user = MOCK_USERS.find((u) => u.email === email)
  if (!user || user.password !== password) {
    throw {
      response: { status: 401, data: { message: 'Invalid email or password.' } },
    }
  }

  return {
    user: { id: user.id, name: user.name, email: user.email },
    accessToken: generateToken(user.id),
    refreshToken: generateToken(user.id),
    workspaces: user.id === 1 ? MOCK_WORKSPACES : [],
  }
}

/**
 * POST /api/auth/forgot-password
 */
export async function mockForgotPassword({ email }) {
  await delay(600)
  // Always 200 — prevents email enumeration
  return { message: 'If an account exists for that email, a reset link has been sent.' }
}

/**
 * POST /api/auth/reset-password
 */
export async function mockResetPassword({ token, password }) {
  await delay(600)

  if (!token || token.length < 10) {
    throw {
      response: { status: 400, data: { message: 'This reset link has expired. Please request a new one.' } },
    }
  }

  return { message: 'Password reset successfully. Please log in.' }
}

/**
 * GET /api/auth/workspaces
 */
export async function mockGetWorkspaces() {
  await delay(400)
  return { workspaces: MOCK_WORKSPACES }
}

/**
 * POST /api/auth/workspaces (Create Org)
 */
export async function mockCreateWorkspace({ name, slug }) {
  await delay(600)

  const newOrg = {
    org_id: Math.floor(Math.random() * 10000),
    org_name: name,
    slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
    role: 'Admin',
    status: 'Active',
    member_count: 1,
  }

  MOCK_WORKSPACES.push(newOrg)
  return newOrg
}
