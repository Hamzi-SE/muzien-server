import express from 'express'
import { updateBookingStatus, getAllSaloonBookings, getBookingByDate, bookSaloon } from '../controllers/bookingController.js'
import { authorizeAdmin, isAuthenticated } from '../middlewares/auth.js'

const router = express.Router()

// Get all saloon bookings
router.route('/saloon/:saloonId/bookings').get(isAuthenticated, getAllSaloonBookings)

// Create a booking
router.route('/saloon/booking/:saloonId').post(isAuthenticated, bookSaloon)

// Get bookings by date
router.route('/booking-date/:saloonId').get(isAuthenticated, getBookingByDate)

// Update booking status
router.route('/booking/:bookingId').put(isAuthenticated, updateBookingStatus)

export default router
