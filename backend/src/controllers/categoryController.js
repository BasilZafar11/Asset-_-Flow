import { AssetCategory } from '../models/index.js';
import { logActivity } from '../utils/activityLogger.js';

export const listCategories = async (req, res) => {
  const orgId = req.orgMember.organization_id;

  try {
    const categories = await AssetCategory.findAll({
      where: { organization_id: orgId }
    });
    return res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ error: 'Internal server error fetching categories.' });
  }
};

export const createCategory = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const { name, custom_fields } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  // Validate custom_fields (can be parsed object or raw JSON string)
  let customFieldsVal = null;
  if (custom_fields) {
    if (typeof custom_fields === 'object') {
      customFieldsVal = custom_fields;
    } else {
      try {
        customFieldsVal = JSON.parse(custom_fields);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid custom_fields JSON format.' });
      }
    }
  }

  try {
    const category = await AssetCategory.create({
      organization_id: orgId,
      name,
      custom_fields: customFieldsVal
    });

    await logActivity(orgId, req.user.id, 'CREATE_CATEGORY', `Created asset category: ${name} (ID: ${category.id})`);

    return res.status(201).json({
      message: 'Category created successfully.',
      category
    });
  } catch (err) {
    console.error('Error creating category:', err);
    return res.status(500).json({ error: 'Internal server error creating category.' });
  }
};
