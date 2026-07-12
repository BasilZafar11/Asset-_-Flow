import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Upcoming', 'Ongoing', 'Completed', 'Cancelled'),
    defaultValue: 'Upcoming'
  }
}, {
  tableName: 'Bookings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Booking;
