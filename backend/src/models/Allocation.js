import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Allocation = sequelize.define('Allocation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  expected_return_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Active', 'Returned'),
    defaultValue: 'Active'
  },
  notes: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'Allocations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Allocation;
