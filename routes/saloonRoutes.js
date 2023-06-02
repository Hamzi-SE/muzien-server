import express from 'express'
import {
	getAllSaloons,
	createSaloon,
	getSaloon,
	updateSaloonDetails,
	updateSaloonLogo,
	getSaloonServices,
	updateSaloonServices,
	addSaloonImages,
	deleteSaloonImage,
	addBarber,
	updateBarber,
	deleteBarber,
	deleteSaloon,
	getSaloonByLocation,
} from '../controllers/saloonController.js'
import { singleUpload, multipleUploads } from '../middlewares/multer.js'
import { authorizeAdmin, isAuthenticated } from '../middlewares/auth.js'

const router = express.Router()

// Get all saloons
router.route('/get-all-saloons').get(getAllSaloons)

// Create saloon
router.route('/create-saloon').post(singleUpload, isAuthenticated, createSaloon)

// Update saloon details
router.route('/update-saloon').put(isAuthenticated, updateSaloonDetails)

// Saloon services
router.route('/saloon-services/:saloonId').get(isAuthenticated, getSaloonServices).put(isAuthenticated, updateSaloonServices)

// Update saloon logo
router.route('/update-saloon-logo').put(isAuthenticated, singleUpload, updateSaloonLogo)

// Saloon images
router.route('/saloon-images/:saloonId').post(isAuthenticated, multipleUploads, addSaloonImages).delete(isAuthenticated, deleteSaloonImage)

// Barber
router
	.route('/barber/:saloonId')
	.post(isAuthenticated, singleUpload, addBarber)
	.put(isAuthenticated, singleUpload, updateBarber)
	.delete(isAuthenticated, deleteBarber)

// Get saloon by id
router.route('/get-saloon/:id').get(isAuthenticated, getSaloon)

// Get saloon by longitude & latitude
router.route('/get-saloon-by-location').get(isAuthenticated, getSaloonByLocation)

// Delete saloon
router.route('/delete-saloon').delete(isAuthenticated, authorizeAdmin, deleteSaloon)

export default router
