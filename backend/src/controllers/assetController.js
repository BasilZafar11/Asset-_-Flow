import { Op } from 'sequelize';
import { Asset, AssetCategory, User, Allocation, MaintenanceRequest, Booking } from '../models/index.js';
import { logActivity } from '../utils/activityLogger.js';

export const listAssets = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const { status, category_id, is_shared_resource, search } = req.query;

  try {
    const whereClause = { organization_id: orgId };

    if (status) {
      whereClause.status = status;
    }

    if (category_id) {
      whereClause.category_id = parseInt(category_id, 10);
    }

    if (is_shared_resource !== undefined) {
      whereClause.is_shared_resource = is_shared_resource === 'true' || is_shared_resource === '1';
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { tag: { [Op.like]: `%${search}%` } },
        { serial_number: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } }
      ];
    }

    const assets = await Asset.findAll({
      where: whereClause,
      include: [
        { model: AssetCategory, as: 'Category', attributes: ['id', 'name'] },
        { model: User, as: 'CurrentHolder', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.json(assets);
  } catch (err) {
    console.error('Error fetching assets:', err);
    return res.status(500).json({ error: 'Internal server error fetching assets.' });
  }
};

export const getAsset = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const { tag } = req.params;

  try {
    const asset = await Asset.findOne({
      where: { tag, organization_id: orgId },
      include: [
        { model: AssetCategory, as: 'Category', attributes: ['id', 'name'] },
        { model: User, as: 'CurrentHolder', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    // Retrieve allocation logs
    const allocations = await Allocation.findAll({
      where: { asset_tag: tag, organization_id: orgId },
      include: [{ model: User, as: 'User', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']]
    });

    // Retrieve maintenance requests
    const maintenance = await MaintenanceRequest.findAll({
      where: { asset_tag: tag, organization_id: orgId },
      include: [{ model: User, as: 'RaisedBy', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']]
    });

    // Retrieve booking reservations
    const bookings = await Booking.findAll({
      where: { asset_tag: tag, organization_id: orgId },
      include: [{ model: User, as: 'BookedBy', attributes: ['id', 'name', 'email'] }],
      order: [['start_time', 'DESC']]
    });

    return res.json({
      ...asset.toJSON(),
      history: {
        allocations,
        maintenance,
        bookings
      }
    });
  } catch (err) {
    console.error('Error fetching asset details:', err);
    return res.status(500).json({ error: 'Internal server error fetching asset details.' });
  }
};

export const registerAsset = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const {
    name,
    category_id,
    is_shared_resource,
    serial_number,
    acquisition_date,
    acquisition_cost,
    condition,
    location,
    photo_url,
    custom_values
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Asset name is required.' });
  }

  try {
    if (category_id) {
      const cat = await AssetCategory.findOne({
        where: { id: category_id, organization_id: orgId }
      });
      if (!cat) {
        return res.status(400).json({ error: 'Category not found in this organization.' });
      }
    }

    // Auto-generate Asset Tag sequentially: e.g., AF-0001
    const count = await Asset.count({ where: { organization_id: orgId } });
    let tagSuffix = count + 1;
    let tag = `AF-${String(tagSuffix).padStart(4, '0')}`;
    let exists = true;

    while (exists) {
      const match = await Asset.findByPk(tag);
      if (!match) {
        exists = false;
      } else {
        tagSuffix++;
        tag = `AF-${String(tagSuffix).padStart(4, '0')}`;
      }
    }

    const asset = await Asset.create({
      tag,
      organization_id: orgId,
      name,
      category_id: category_id || null,
      is_shared_resource: !!is_shared_resource,
      status: 'Available',
      serial_number: serial_number || null,
      acquisition_date: acquisition_date || null,
      acquisition_cost: acquisition_cost || null,
      condition: condition || 'New',
      location: location || null,
      photo_url: photo_url || null,
      custom_values: custom_values || null
    });

    await logActivity(orgId, req.user.id, 'REGISTER_ASSET', `Registered asset: ${name} with tag: ${tag}`);

    return res.status(201).json({
      message: 'Asset registered successfully.',
      asset
    });
  } catch (err) {
    console.error('Error registering asset:', err);
    return res.status(500).json({ error: 'Internal server error registering asset.' });
  }
};

export const updateAsset = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const { tag } = req.params;
  const {
    name,
    category_id,
    is_shared_resource,
    status,
    serial_number,
    acquisition_date,
    acquisition_cost,
    condition,
    location,
    photo_url,
    custom_values
  } = req.body;

  try {
    const asset = await Asset.findOne({
      where: { tag, organization_id: orgId }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    if (category_id) {
      const cat = await AssetCategory.findOne({
        where: { id: category_id, organization_id: orgId }
      });
      if (!cat) {
        return res.status(400).json({ error: 'Category not found.' });
      }
    }

    if (name !== undefined) asset.name = name;
    if (category_id !== undefined) asset.category_id = category_id;
    if (is_shared_resource !== undefined) asset.is_shared_resource = !!is_shared_resource;
    if (status !== undefined) asset.status = status;
    if (serial_number !== undefined) asset.serial_number = serial_number;
    if (acquisition_date !== undefined) asset.acquisition_date = acquisition_date;
    if (acquisition_cost !== undefined) asset.acquisition_cost = acquisition_cost;
    if (condition !== undefined) asset.condition = condition;
    if (location !== undefined) asset.location = location;
    if (photo_url !== undefined) asset.photo_url = photo_url;
    if (custom_values !== undefined) asset.custom_values = custom_values;

    await asset.save();

    await logActivity(orgId, req.user.id, 'UPDATE_ASSET', `Updated asset ${tag} details`);

    return res.json({ message: 'Asset updated successfully.', asset });
  } catch (err) {
    console.error('Error updating asset:', err);
    return res.status(500).json({ error: 'Internal server error updating asset.' });
  }
};
