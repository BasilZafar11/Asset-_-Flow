import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const AuditItem = sequelize.define('AuditItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  verification_status: {
    type: DataTypes.ENUM('Pending', 'Verified', 'Missing', 'Damaged'),
    defaultValue: 'Pending'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'Audit_Items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default AuditItem;
