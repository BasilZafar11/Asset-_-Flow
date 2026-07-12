import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const TransferRequest = sequelize.define('TransferRequest', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    defaultValue: 'Pending'
  }
}, {
  tableName: 'Transfer_Requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default TransferRequest;
