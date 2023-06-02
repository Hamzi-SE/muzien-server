import { catchAsyncError } from '../middlewares/catchAsyncError.js'
import ErrorHandler from '../utils/ErrorHandler.js'
import cloudinary from 'cloudinary'
import Saloon from '../models/Saloon.js'
import { getDataUri, getMultipleDataUri } from '../utils/dataUri.js'
import { sendEmail } from '../utils/sendEmail.js'
import Barber from '../models/Barber.js'
import User from '../models/User.js'
import moment from 'moment'

export const getAllSaloons = catchAsyncError(async (req, res, next) => {
	const saloons = await Saloon.find({}).sort({ createdAt: 'desc' })

	res.status(200).json({
		success: true,
		saloons,
	})
})

export const createSaloon = catchAsyncError(async (req, res, next) => {
	const { name, email, address, city, phone, saleRegistrationNumber, lat, lng, opening, closing } = req.body
	const file = req.file

	if (!name || !email || !address || !city || !phone || !saleRegistrationNumber || !opening || !closing)
		return next(new ErrorHandler('All fields are mandatory', 400))

	if (!lat || !lng) return next(new ErrorHandler('Please use a valid location', 400))

	let saloon = await Saloon.findOne({ email })

	if (saloon) return next(new ErrorHandler('Saloon already exists with this email', 409)) // 409 -> Conflict

	// Store the opening and closing time in ISO format
	let openingTime = moment(opening, 'HH:mm').toISOString()
	let closingTime = moment(closing, 'HH:mm').toISOString()

	// everywhere we have to calculate or match anything regarding opening and closing time in ISO, first convert it to that format and then we can use moment's methods
	// let convertedOpeningTimeInLocale = moment(openingTime).utcOffset('+0500').format('HH:mm')

	// use moment to check if closingTime is after openingTime
	if (!moment(closingTime).isAfter(openingTime)) return next(new ErrorHandler('Closing time must be after opening time', 400))

	// check if opening and closing time is valid
	if (openingTime >= closingTime) return next(new ErrorHandler('Opening time must be less than closing time', 400))

	openingTime = moment(opening, 'HH:mm').format('HH:mm')
	closingTime = moment(closing, 'HH:mm').format('HH:mm')

	const workingHours = {
		start: openingTime,
		end: closingTime,
	}

	let logo = null

	if (file) {
		const fileUri = getDataUri(file)

		const result = await cloudinary.v2.uploader.upload(fileUri.content, {
			folder: 'muzien',
		})

		logo = {
			public_id: result.public_id,
			url: result.secure_url,
		}
	}

	// add user in barbers array
	const barbersArray = []
	barbersArray.push(req.user._id)

	saloon = await Saloon.create({
		name,
		email,
		address,
		city,
		phone,
		saleRegistrationNumber,
		logo,
		barbers: barbersArray,
		owner: req.user._id,
		location: {
			type: 'Point',
			coordinates: [lng, lat],
		},
		workingHours,
	})

	const user = await User.findById(req.user._id)
	user.saloon = saloon._id
	user.role = 'saloonAdmin'
	await user.save({
		validateBeforeSave: false,
	})

	// // create a barber for the owner
	// await Barber.create({
	// 	name: user.name,
	// 	email: user.email,
	// 	phone: saloon.phone,
	// 	saloon: saloon._id,
	// })

	const to = email
	const subject = 'Your Saloon Created Successfully At Muzien'
	const html = `
        <a href="${process.env.FRONTEND_URL}"><img src="https://i.ibb.co/zszMgdb/logo.png" width="50%" alt="logo" border="0"></a>
        <h1>Thank you for creating ${name} at Muzien!</h1><br />
        <b>Saloon Name:</b> ${name}<br />
        <b>Saloon Email:</b> ${email}<br />
        <b>Saloon Address:</b> ${address}<br />
        <b>Saloon City:</b> ${city}<br />
        <b>Saloon Phone:</b> ${phone}<br />
        <b>Saloon Sale Registration Number:</b> ${saleRegistrationNumber}<br />
        ${logo ? `<b>Saloon Logo:</b><br /><img src="${logo.url}" width="50%" alt="logo" border="0"><br>` : 'No Logo Provided'}<br />

        <p>Thank you for choosing Muzien</p><br />

        <i>Regards,</i><br />
        <i>Muzien Team</i>
    `

	await sendEmail(to, subject, html)

	res.status(200).json({
		success: true,
		message: 'Your saloon created successfully',
	})
})

export const getSaloon = catchAsyncError(async (req, res, next) => {
	const { id } = req.params

	if (!id) return next(new ErrorHandler('Saloon ID is required', 400))

	const saloon = await Saloon.findById(id)

	if (!saloon) return next(new ErrorHandler('Saloon not found', 404))

	res.status(200).json({
		success: true,
		saloon,
	})
})

export const updateSaloonDetails = catchAsyncError(async (req, res, next) => {
	const { saloonId, name, email, address, city, phone, saleRegistrationNumber, opening, closing } = req.body

	if (!saloonId) return next(new ErrorHandler('Saloon ID is required', 400))

	const saloon = await Saloon.findById(saloonId)

	if (!saloon) return next(new ErrorHandler('Saloon not found', 404))

	if (saloon.owner.toString() !== req.user._id.toString()) return next(new ErrorHandler('You are not allowed to update this saloon', 403))

	if (opening && closing) {
		let openingTime = moment(opening, 'HH:mm').toISOString()
		let closingTime = moment(closing, 'HH:mm').toISOString()

		// everywhere we have to calculate or match anything regarding opening and closing time in ISO, first convert it to that format and then we can use moment's methods
		// let convertedOpeningTimeInLocale = moment(openingTime).utcOffset('+0500').format('HH:mm')

		// use moment to check if closingTime is after openingTime
		if (!moment(closingTime).isAfter(openingTime)) return next(new ErrorHandler('Closing time must be after opening time', 400))

		// check if opening and closing time is valid
		if (openingTime >= closingTime) return next(new ErrorHandler('Opening time must be less than closing time', 400))

		openingTime = moment(opening, 'HH:mm').format('HH:mm')
		closingTime = moment(closing, 'HH:mm').format('HH:mm')

		const workingHours = {
			start: openingTime,
			end: closingTime,
		}

		saloon.workingHours = workingHours
	}

	// only update a specific detail if provided in request body
	if (name) saloon.name = name
	if (email) saloon.email = email
	if (address) saloon.address = address
	if (city) saloon.city = city
	if (phone) saloon.phone = phone
	if (saleRegistrationNumber) saloon.saleRegistrationNumber = saleRegistrationNumber

	await saloon.save()

	res.status(200).json({
		success: true,
		message: 'Saloon details updated successfully',
	})
})

export const updateSaloonLogo = catchAsyncError(async (req, res, next) => {
	const { saloonId } = req.body
	const file = req.file

	if (!saloonId) return next(new ErrorHandler('Saloon ID is required', 400))
	if (!file) return next(new ErrorHandler('Please upload a file', 400))

	const saloon = await Saloon.findById(saloonId)

	if (!saloon) return next(new ErrorHandler('Saloon not found', 404))

	if (saloon.owner.toString() !== req.user._id.toString()) return next(new ErrorHandler('You are not authorized to update this saloon', 403))

	// Delete saloon logo from cloudinary
	if (saloon.logo && saloon.logo.public_id) {
		await cloudinary.v2.uploader.destroy(saloon.logo.public_id)
	}

	const fileUri = getDataUri(file)

	const result = await cloudinary.v2.uploader.upload(fileUri.content, {
		folder: 'muzien',
	})

	saloon.logo = {
		public_id: result.public_id,
		url: result.secure_url,
	}

	await saloon.save()

	res.status(200).json({
		success: true,
		message: 'Saloon logo updated successfully',
	})
})

export const getSaloonServices = catchAsyncError(async (req, res, next) => {
	const { saloonId } = req.params

	if (!saloonId) return next(new ErrorHandler('Saloon ID is required', 400))

	const saloon = await Saloon.findById(saloonId)

	if (!saloon) return next(new ErrorHandler('Saloon not found', 404))

	res.status(200).json({
		success: true,
		services: saloon.services,
	})
})

export const updateSaloonServices = catchAsyncError(async (req, res, next) => {
	const { saloonId } = req.params
	const { services } = req.body

	if (!saloonId) return next(new ErrorHandler('Saloon ID is required', 400))

	const saloon = await Saloon.findById(saloonId)

	if (!saloon) return next(new ErrorHandler('Saloon not found', 404))

	if (saloon.owner.toString() !== req.user._id.toString()) return next(new ErrorHandler('You are not allowed to update this saloon', 403))

	if (!services || services.length === 0) return next(new ErrorHandler('Please provide at least one service', 400))

	// loop over each service and check if it is valid
	services.forEach(service => {
		if (!service.name || !service.price || !service.description || !service.duration)
			return next(new ErrorHandler('Every service must have a name, price, description and duration', 400))
	})

	saloon.services = services

	await saloon.save()

	res.status(200).json({
		success: true,
		message: 'Saloon services updated successfully',
	})
})

export const addSaloonImages = catchAsyncError(async (req, res, next) => {
	const { saloonId } = req.params

	const files = req.files

	if (!saloonId) return next(new ErrorHandler('Saloon ID is required', 400))

	if (!files) return next(new ErrorHandler('Please upload a file', 400))

	const saloon = await Saloon.findById(saloonId)

	if (!saloon) return next(new ErrorHandler('Saloon not found', 404))

	if (saloon.owner.toString() !== req.user._id.toString()) return next(new ErrorHandler('You are not allowed to update this saloon', 403))

	const filesUri = getMultipleDataUri(files)

	const results = []

	for (let i = 0; i < filesUri.length; i++) {
		const result = await cloudinary.v2.uploader.upload(filesUri[i].content, {
			folder: 'muzien',
		})

		results.push(result)
	}

	const images = results.map(result => ({
		public_id: result.public_id,
		url: result.secure_url,
	}))

	saloon.images.push(...images)

	await saloon.save()

	res.status(200).json({
		success: true,
		message: 'Saloon images added successfully',
	})
})

export const deleteSaloonImage = catchAsyncError(async (req, res, next) => {
	const { saloonId } = req.params
	const { imageId } = req.body

	if (!saloonId) return next(new ErrorHandler('Saloon ID is required', 400))

	if (!imageId) return next(new ErrorHandler('Image ID is required', 400))

	const saloon = await Saloon.findById(saloonId)

	if (!saloon) return next(new ErrorHandler('Saloon not found', 404))

	if (saloon.owner.toString() !== req.user._id.toString()) return next(new ErrorHandler('You are not allowed to update this saloon', 403))

	const image = saloon.images.find(image => image._id.toString() === imageId.toString())

	if (!image) return next(new ErrorHandler('Image not found', 404))

	// Delete saloon image from cloudinary
	if (image.public_id) {
		await cloudinary.v2.uploader.destroy(image.public_id)
	}

	const index = saloon.images.indexOf(image)

	saloon.images.splice(index, 1)

	await saloon.save()

	res.status(200).json({
		success: true,
		message: 'Saloon image deleted successfully',
	})
})

export const addBarber = catchAsyncError(async (req, res, next) => {
	const { saloonId } = req.params
	const { barber } = req.body
	const file = req.file

	if (!barber?.name || !barber?.email || !barber?.phone) return next(new ErrorHandler('Please provide a name, email and phone number of barber', 400))

	if (!saloonId) return next(new ErrorHandler('Saloon ID is required', 400))

	if (!barber) return next(new ErrorHandler('Please provide a barber', 400))

	const saloon = await Saloon.findById(saloonId)

	if (!saloon) return next(new ErrorHandler('Saloon not found', 404))

	if (saloon.owner.toString() !== req.user._id.toString()) return next(new ErrorHandler('You are not allowed to update this saloon', 403))

	barber.saloon = saloonId

	const newBarber = await Barber.create(barber)

	if (file) {
		const fileUri = getDataUri(file)

		const result = await cloudinary.v2.uploader.upload(fileUri.content, {
			folder: 'muzien',
		})

		newBarber.avatar = {
			public_id: result.public_id,
			url: result.secure_url,
		}

		await newBarber.save()
	}

	saloon.barbers.push(newBarber._id)

	await saloon.save()

	res.status(200).json({
		success: true,
		message: 'Barber added successfully',
	})
})

export const updateBarber = catchAsyncError(async (req, res, next) => {
	const { saloonId } = req.params
	const { barberId, barber } = req.body
	const file = req.file

	if (!barber?.name || !barber?.email || !barber?.phone) return next(new ErrorHandler('Please provide a name, email and phone number of barber', 400))

	if (!saloonId) return next(new ErrorHandler('Saloon ID is required', 400))

	if (!barberId) return next(new ErrorHandler('Barber ID is required', 400))

	if (!barber) return next(new ErrorHandler('Please provide a barber', 400))

	const existingBarber = await Barber.findById(barberId)

	if (!existingBarber) return next(new ErrorHandler('Barber not found', 404))

	if (existingBarber.saloon.toString() !== saloonId.toString()) return next(new ErrorHandler('Barber not found', 404))

	if (existingBarber.saloon.toString() !== req.user.saloon.toString()) return next(new ErrorHandler('You are not allowed to update this barber', 403))

	if (file) {
		const fileUri = getDataUri(file)

		if (existingBarber?.avatar && existingBarber.avatar.public_id) {
			await cloudinary.v2.uploader.destroy(existingBarber.avatar.public_id)
		}

		const result = await cloudinary.v2.uploader.upload(fileUri.content, {
			folder: 'muzien',
		})

		barber.avatar = {
			public_id: result.public_id,
			url: result.secure_url,
		}
	}

	await Barber.findByIdAndUpdate(barberId, barber)

	res.status(200).json({
		success: true,
		message: 'Barber updated successfully',
	})
})

export const deleteBarber = catchAsyncError(async (req, res, next) => {
	const { saloonId } = req.params
	const { barberId } = req.body

	if (!saloonId) return next(new ErrorHandler('Saloon ID is required', 400))

	if (!barberId) return next(new ErrorHandler('Barber ID is required', 400))

	const saloon = await Saloon.findById(saloonId)

	if (!saloon) return next(new ErrorHandler('Saloon not found', 404))

	if (saloon.owner.toString() !== req.user._id.toString()) return next(new ErrorHandler('You are not allowed to update this saloon', 403))

	const barber = await Barber.findById(barberId)

	if (!barber) return next(new ErrorHandler('Barber not found', 404))

	if (barber?.saloon?.toString() !== saloonId.toString()) return next(new ErrorHandler('Barber not found', 404))

	// Delete barber avatar from cloudinary
	if (barber?.avatar && barber.avatar.public_id) {
		await cloudinary.v2.uploader.destroy(barber.avatar.public_id)
	}

	saloon.barbers = saloon.barbers.filter(barber => barber._id.toString() !== barberId.toString())

	await saloon.save()

	await barber.remove()

	res.status(200).json({
		success: true,
		message: 'Barber deleted successfully',
	})
})

export const deleteSaloon = catchAsyncError(async (req, res, next) => {
	const { saloonId } = req.body

	if (!saloonId) return next(new ErrorHandler('Saloon ID is required', 400))

	const saloon = await Saloon.findById(saloonId)

	if (!saloon) return next(new ErrorHandler('Saloon not found', 404))

	// Delete saloon logo from cloudinary
	if (saloon.logo && saloon.logo.public_id) {
		await cloudinary.v2.uploader.destroy(saloon.logo.public_id)
	}

	await saloon.remove()

	res.status(200).json({
		success: true,
		message: 'Saloon deleted successfully',
	})
})

// get saloon by longitude, latitude and distance
export const getSaloonByLocation = catchAsyncError(async (req, res, next) => {
	// get and convert latitude and longitude to numbers
	const lat = Number(req.body.lat)
	const lng = Number(req.body.lng)

	if (!lat || !lng) return next(new ErrorHandler('Latitude and longitude are required', 400))

	// the query below gets all the saloons within the specified distance (in meters)
	const saloons = await Saloon.find({
		location: {
			$nearSphere: {
				$geometry: {
					type: 'Point',
					coordinates: [lng, lat],
				},
				$maxDistance: 5000, // meters
				$minDistance: 0,
			},
		},
	})

	// get from a point radius, 10 miles
	// location: {
	//		$geoWithin: {
	//			$centerSphere: [[lng,lat], 10/3963.2]}}

	// we can also use geoWithin to get the saloons within a specific area (rectangle, circle, polygon) instead of distance from a point (nearSphere)

	// we can also use satelize to get the location of the user by ip address and then use that location to get the saloons around the user

	res.status(200).json({
		success: true,
		saloons,
	})
})
