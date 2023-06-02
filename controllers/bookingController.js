import moment from 'moment'
import { catchAsyncError } from '../middlewares/catchAsyncError.js'
import Booking from '../models/Booking.js'
import Saloon from '../models/Saloon.js'
import ErrorHandler from '../utils/ErrorHandler.js'
import { sendEmail } from '../utils/sendEmail.js'
import Barber from '../models/Barber.js'

export const getAllSaloonBookings = catchAsyncError(async (req, res, next) => {
	const { saloonId } = req.params

	if (!saloonId) return next(new ErrorHandler('Please provide a saloon id', 400))

	// verify owner
	const saloon = await Saloon.findById({ _id: saloonId })

	if (!saloon) return next(new ErrorHandler('Saloon not found', 404))

	const isOwner = saloon.owner.toString() === req.user._id.toString()

	if (!isOwner) return next(new ErrorHandler('Only saloon owner can access saloon bookings', 403))

	const bookings = await Booking.find({ saloon: saloonId }).sort({ createdAt: 'desc' }).populate('user').populate('saloon')

	let bookedServices = []
	let booking = []

	for (let i = 0; i < bookings.length; i++) {
		for (let j = 0; j < bookings[i].services.length; j++) {
			const services = await bookings[i].saloon.services.find(s => s._id.toString() === bookings[i].services[j].toString())

			bookedServices.push(services)
		}

		booking.push({
			_id: bookings[i]._id,
			user: bookings[i].user,
			saloon: bookings[i].saloon,
			service: bookedServices,
			date: bookings[i].date,
			time: bookings[i].time,
			status: bookings[i].status,
			createdAt: bookings[i].createdAt,
		})
		bookedServices = []
	}

	res.status(200).json({
		success: true,
		booking,
	})
})

export const updateBookingStatus = catchAsyncError(async (req, res, next) => {
	const { status } = req.body
	const { bookingId } = req.params

	if (!status || !bookingId) return next(new ErrorHandler('Please provide a status and booking id', 400))

	if (status !== 'approved' && status !== 'rejected') return next(new ErrorHandler('Invalid status', 400))

	const booking = await Booking.find({ _id: bookingId }).populate('saloon').populate('user')

	const isOwner = booking[0].saloon.owner.toString() === req.user._id.toString()

	if (!isOwner) return next(new ErrorHandler('Only saloon owner can access saloon bookings', 403))

	if (!booking) return next(new ErrorHandler('Booking not found', 404))

	if (status === booking[0].status) return next(new ErrorHandler(`Booking status is already ${status}`, 400))

	booking[0].status = status
	await booking[0].save()

	let bookedServices = []

	for (let i = 0; i < booking[0].services.length; i++) {
		const services = await booking[0].saloon.services.find(s => s._id.toString() === booking[0].services[i].toString())

		bookedServices.push(services)
	}

	const subject = `Your booking at ${booking[0].saloon.name} has been ${status}.`
	const message = `
		<a href="${process.env.FRONTEND_URL}"><img src="https://i.ibb.co/zszMgdb/logo.png" width="50%" alt="logo" border="0"></a>
		<h1>Booking Details</h1>
		${booking[0].saloon?.logo ? `<b>Saloon Logo:</b><br /><img src="${booking[0].saloon.logo.url}" width="50%" alt="logo" border="0"><br>` : ''}<br />
		<ul>
			<li>Saloon: ${booking[0].saloon.name}</li>
			<li>Address: ${booking[0].saloon.address}</li>
			<li>Phone: ${booking[0].saloon.phone}</li>
			<li>Services: ${bookedServices.map(s => s.name.toUpperCase()).join(', ')}</li>
			<li>Date: ${moment(booking[0].date).format('DD-MM-YYYY')}</li>
			<li>Time: ${moment(booking[0].time).format('hh:mm A')}</li>
			<li>Status: ${booking[0].status.toUpperCase()}</li>
		</ul>
		<p>You can contact the saloon owner at ${booking[0].saloon.email} for any queries.</p>
		<p>Thank you for using Muzien.</p>

	`
	const email = booking[0].user.email

	try {
		await sendEmail(email, subject, message)
	} catch (error) {
		console.log(error)
	}

	res.status(200).json({
		success: true,
		booking,
		message: 'Booking status updated successfully',
	})
})

export const getBookingByDate = catchAsyncError(async (req, res, next) => {
	const { date } = req.body
	const { saloonId } = req.params

	if (!date) return next(new ErrorHandler('Please provide a date', 400))

	if (!saloonId) return next(new ErrorHandler('Please provide a saloon id', 400))

	// convert date to ISO format
	const dateISO = moment(date).toISOString()

	// convert this date to Pakistan timezone
	// const datePK = moment(date).utcOffset('+0500').format('YYYY-MM-DD')

	const bookings = await Booking.find({ saloon: saloonId, date: dateISO }).sort({ createdAt: 'desc' }).populate('user').populate('saloon')

	// if (bookings[0]?.saloon?.owner.toString() !== req.user._id.toString())
	// 	return next(new ErrorHandler('Only saloon owner can access saloon bookings', 403))

	let bookedServices = []
	let booking = []

	for (let i = 0; i < bookings.length; i++) {
		for (let j = 0; j < bookings[i].services.length; j++) {
			const services = await bookings[i].saloon.services.find(s => s._id.toString() === bookings[i].services[j].toString())

			bookedServices.push(services)
		}

		booking.push({
			_id: bookings[i]._id,
			user: bookings[i].user,
			saloon: bookings[i].saloon,
			service: bookedServices,
			date: bookings[i].date,
			time: bookings[i].time,
			status: bookings[i].status,
			createdAt: bookings[i].createdAt,
		})
		bookedServices = []
	}

	res.status(200).json({
		success: true,
		booking,
	})
})

export const bookSaloon = catchAsyncError(async (req, res, next) => {
	// sample format of date and time:
	// "date": "27-05-2023",
	// "time": "19:00",

	const { saloonId } = req.params
	let { date, time, services, barberId } = req.body // get services as an array of object IDs

	// check using moment that date and time are valid or not
	const isValidDate = moment(date, 'YYYY-MM-DD', true).isValid()
	const isValidTime = moment(time, 'HH:mm', true).isValid()

	if (!isValidDate || !isValidTime)
		return next(new ErrorHandler('Please provide a valid date and time. (Date format: YYYY-MM-DD, Time format: HH:mm)', 400))

	if (req.user.role === 'admin') return next(new ErrorHandler('Admins cannot book saloon', 403))

	if (!saloonId) return next(new ErrorHandler('Please provide a saloon id', 400))

	if (!date || !time || !services || services.length === 0) return next(new ErrorHandler('Please provide a date, time and service', 400))

	if (!barberId) return next(new ErrorHandler('Please choose a barber', 400))

	const saloon = await Saloon.findById(saloonId)

	if (!saloon) return next(new ErrorHandler('Saloon not found', 404))

	// if (saloon.owner.toString() === req.user._id.toString()) return next(new ErrorHandler('Saloon owner cannot book his own saloon', 403))

	// check if all services exist in saloon
	let serviceExists = true
	for (let i = 0; i < services.length; i++) {
		const serviceExist = saloon.services.find(s => s._id.toString() === services[i].id)

		if (!serviceExist) {
			serviceExists = false
			break
		}
	}

	if (!serviceExists) return next(new ErrorHandler('This saloon does not provide this service', 404))

	// check the duration of the booked services
	let duration = 0
	for (let i = 0; i < services.length; i++) {
		saloon.services.forEach(service => {
			if (service._id.toString() === services[i].id) {
				duration += service.duration
			}
		})
	}

	const dateTime = moment(`${date}T${time}`).toISOString()

	date = moment(dateTime).startOf('day').toISOString()
	// time = moment(time, 'HH:mm').toISOString()

	// check if booking already exists
	const bookingExists = await Booking.findOne({ saloon: saloonId, date, time: dateTime })

	if (bookingExists) return next(new ErrorHandler('This saloon is already booked at this time', 400))

	const barber = await Barber.findById(barberId)

	if (!barber) return next(new ErrorHandler('Barber not found', 404))

	// convert the time to ISO format and add the duration to it
	const endTime = moment(dateTime).add(duration, 'minutes').toISOString()

	// check if barber is available
	const barberNotAvailable = await Barber.findOne({
		_id: barberId,
		$or: [
			{ bookedSlots: { $elemMatch: { start: { $lte: dateTime }, end: { $gte: dateTime } } } },
			{ bookedSlots: { $elemMatch: { start: { $lte: endTime }, end: { $gte: endTime } } } },
			{ bookedSlots: { $elemMatch: { start: { $gte: dateTime }, end: { $lte: endTime } } } },
		],
	})

	if (barberNotAvailable)
		return next(
			new ErrorHandler(`This barber is not available at ${time} on ${moment(date).format('DD-MM-YYYY')}. Please select another time or barber`, 400)
		)

	// check if the booking time exceeds the saloon's opening and closing time
	// return console.log('date', saloon.workingHours.start, moment(date).format('YYYY-MM-DD'))
	const openingTime = moment(`${moment(date).format('YYYY-MM-DD')}T${saloon.workingHours.start}`).toISOString()
	const closingTime = moment(`${moment(date).format('YYYY-MM-DD')}T${saloon.workingHours.end}`).toISOString()

	if (moment(dateTime).isBefore(openingTime) || moment(endTime).isAfter(closingTime)) {
		return next(
			new ErrorHandler(
				`This saloon is not available at ${time} on ${moment(date).format('DD-MM-YYYY')} for the selected service. Saloon timings are: ${moment(
					openingTime
				).format('HH:mm')} - ${moment(closingTime).format('HH:mm')}`,
				400
			)
		)
	}

	// if barber is available, add the booking to the barber's bookedSlots array
	barber.bookedSlots.push({
		start: dateTime,
		end: endTime,
	})

	await barber.save()

	// convert services to type: mongoose.Schema.ObjectId

	services = services.map(service => service.id)

	const booking = await Booking.create({
		saloon: saloonId,
		user: req.user._id,
		date,
		time: dateTime,
		services,
		barber: barberId,
	})

	// send email to customer

	const message = `Your booking has been placed successfully. Please wait for the saloon to confirm your booking.\n\nBooking Details:\nDate: ${moment(
		date
	).format('DD-MM-YYYY')}\nTime: ${moment(dateTime).format('HH:mm')} - ${moment(endTime).format('HH:mm')}\nSaloon: ${saloon.name}\nBarber: ${
		barber.name
	}\n\nThank you for using Muzien.`

	await sendEmail(req.user.email, 'Booking Placed Successfully', message)

	res.status(200).json({
		success: true,
		booking,
		message: 'Your booking has been placed successfully',
	})
})
