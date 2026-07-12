const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let DEPARTMENTS = [
  { id: 1, name: 'Engineering', head_name: 'Aditi Rao', head_id: 5, parent_dept: null, parent_dept_name: null, status: 'Active', member_count: 18 },
  { id: 2, name: 'Marketing', head_name: 'Priya Sharma', head_id: 3, parent_dept: null, parent_dept_name: null, status: 'Active', member_count: 12 },
  { id: 3, name: 'Facilities', head_name: 'Rohan Mehta', head_id: 7, parent_dept: null, parent_dept_name: null, status: 'Active', member_count: 8 },
  { id: 4, name: 'Field Ops (East)', head_name: 'Sana Iqbal', head_id: 9, parent_dept: 3, parent_dept_name: 'Facilities', status: 'Inactive', member_count: 4 },
  { id: 5, name: 'Design', head_name: 'Vikram Singh', head_id: 11, parent_dept: 2, parent_dept_name: 'Marketing', status: 'Active', member_count: 6 },
  { id: 6, name: 'QA', head_name: 'Neha Gupta', head_id: 13, parent_dept: 1, parent_dept_name: 'Engineering', status: 'Active', member_count: 9 },
  { id: 7, name: 'HR', head_name: 'Meera Joshi', head_id: 15, parent_dept: null, parent_dept_name: null, status: 'Active', member_count: 5 },
]

export async function mockGetDepartments() {
  await delay(400)
  return DEPARTMENTS
}

export async function mockCreateDepartment({ name, parent_dept_id }) {
  await delay(500)
  const parent = parent_dept_id ? DEPARTMENTS.find(d => d.id === parseInt(parent_dept_id)) : null
  const newDept = {
    id: Math.max(...DEPARTMENTS.map(d => d.id), 0) + 1,
    name,
    head_name: '--',
    head_id: null,
    parent_dept: parent ? parent.id : null,
    parent_dept_name: parent ? parent.name : null,
    status: 'Active',
    member_count: 0
  }
  DEPARTMENTS.push(newDept)
  return newDept
}

export async function mockUpdateDepartment(id, updates) {
  await delay(400)
  const index = DEPARTMENTS.findIndex(d => d.id === id)
  if (index !== -1) {
    DEPARTMENTS[index] = { ...DEPARTMENTS[index], ...updates }
    return DEPARTMENTS[index]
  }
  throw new Error("Not found")
}

let CATEGORIES = [
  { id: 1, name: 'Laptops & Computers', slug: 'laptops', description: 'All portable and desktop computing devices', asset_count: 45, status: 'Active' },
  { id: 2, name: 'Audio/Visual Equipment', slug: 'av-equipment', description: 'Cameras, projectors, microphones', asset_count: 23, status: 'Active' },
  { id: 3, name: 'Office Furniture', slug: 'furniture', description: 'Desks, chairs, storage units', asset_count: 67, status: 'Active' },
  { id: 4, name: 'Vehicles', slug: 'vehicles', description: 'Company cars and vans', asset_count: 8, status: 'Active' },
  { id: 5, name: 'Networking Equipment', slug: 'networking', description: 'Routers, switches, access points', asset_count: 31, status: 'Active' },
  { id: 6, name: 'Lab Equipment', slug: 'lab', description: 'Scientific and testing instruments', asset_count: 12, status: 'Inactive' },
]

export async function mockGetCategories() {
  await delay(400)
  return CATEGORIES
}

export async function mockCreateCategory({ name, description }) {
  await delay(500)
  const newCategory = {
    id: Math.max(...CATEGORIES.map(c => c.id), 0) + 1,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: description || '',
    asset_count: 0,
    status: 'Active'
  }
  CATEGORIES.push(newCategory)
  return newCategory
}

export async function mockUpdateCategory(id, updates) {
  await delay(400)
  const index = CATEGORIES.findIndex(c => c.id === id)
  if (index !== -1) {
    CATEGORIES[index] = { ...CATEGORIES[index], ...updates }
    return CATEGORIES[index]
  }
  throw new Error("Not found")
}

let MEMBERS = [
  { id: 1, user_id: 1, name: 'Mayank Padhi', email: 'mayank@example.com', role: 'Admin', department_name: 'Engineering', status: 'Active', joined_at: '2026-01-15' },
  { id: 2, user_id: 3, name: 'Priya Sharma', email: 'priya@example.com', role: 'Department Head', department_name: 'Marketing', status: 'Active', joined_at: '2026-02-01' },
  { id: 3, user_id: 5, name: 'Aditi Rao', email: 'aditi@example.com', role: 'Department Head', department_name: 'Engineering', status: 'Active', joined_at: '2026-01-20' },
  { id: 4, user_id: 7, name: 'Rohan Mehta', email: 'rohan@example.com', role: 'Asset Manager', department_name: 'Facilities', status: 'Active', joined_at: '2026-03-10' },
  { id: 5, user_id: 9, name: 'Sana Iqbal', email: 'sana@example.com', role: 'Employee', department_name: 'Facilities', status: 'Inactive', joined_at: '2026-04-01' },
  { id: 6, user_id: 11, name: 'Vikram Singh', email: 'vikram@example.com', role: 'Employee', department_name: 'Design', status: 'Active', joined_at: '2026-03-15' },
  { id: 7, user_id: 13, name: 'Neha Gupta', email: 'neha@example.com', role: 'Department Head', department_name: 'QA', status: 'Active', joined_at: '2026-02-20' },
  { id: 8, user_id: 15, name: 'Meera Joshi', email: 'meera@example.com', role: 'Department Head', department_name: 'HR', status: 'Active', joined_at: '2026-05-01' },
  { id: 9, user_id: 17, name: 'Raj Kumar', email: 'raj@example.com', role: 'Employee', department_name: 'Engineering', status: 'Active', joined_at: '2026-06-01' },
  { id: 10, user_id: 19, name: 'Anita Desai', email: 'anita@example.com', role: 'Employee', department_name: 'Marketing', status: 'Active', joined_at: '2026-06-15' },
]

export async function mockGetMembers() {
  await delay(400)
  return MEMBERS
}

export async function mockInviteMember({ email, role, department_id }) {
  await delay(600)
  const dept = department_id ? DEPARTMENTS.find(d => d.id === parseInt(department_id)) : null
  const newMember = {
    id: Math.max(...MEMBERS.map(m => m.id), 0) + 1,
    user_id: Math.floor(Math.random() * 10000) + 100,
    name: 'Pending Invite', // Placeholder until they join
    email,
    role,
    department_name: dept ? dept.name : null,
    status: 'Active',
    joined_at: new Date().toISOString().split('T')[0]
  }
  MEMBERS.push(newMember)
  return newMember
}

export async function mockUpdateMemberRole(memberId, newRole) {
  await delay(400)
  const index = MEMBERS.findIndex(m => m.id === memberId)
  if (index !== -1) {
    MEMBERS[index].role = newRole
    return MEMBERS[index]
  }
  throw new Error("Not found")
}

export async function mockSuspendMember(memberId) {
  await delay(400)
  const index = MEMBERS.findIndex(m => m.id === memberId)
  if (index !== -1) {
    MEMBERS[index].status = MEMBERS[index].status === 'Active' ? 'Inactive' : 'Active'
    return MEMBERS[index]
  }
  throw new Error("Not found")
}
