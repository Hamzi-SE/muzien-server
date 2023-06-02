import mongoose from 'mongoose'
import validator from 'validator'

const schema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, 'Please enter saloon name'],
			trim: true,
		},
		address: {
			type: String,
			required: [true, 'Please enter saloon address'],
			trim: true,
		},
		city: {
			type: String,
			required: [true, 'Please enter saloon city'],
			trim: true,
		},
		location: {
			type: {
				type: String,
				default: 'Point',
			},
			coordinates: [
				{
					type: Number,
					required: true,
				},
				{
					type: Number,
					required: true,
				},
			],
		},
		email: {
			type: String,
			required: [true, 'Please enter saloon email'],
			unique: true,
			validate: validator.isEmail,
		},
		phone: {
			type: String,
			required: [true, 'Please enter saloon phone'],
			trim: true,
		},
		saleRegistrationNumber: {
			type: String,
			required: [true, 'Please enter saloon sale registration number'],
			trim: true,
		},

		logo: {
			public_id: {
				type: String,
				required: false,
			},
			url: {
				type: String,
				required: false,
			},
		},

		barbers: [
			{
				type: mongoose.Schema.ObjectId,
				ref: 'Barber',
			},
		],

		services: [
			{
				name: {
					type: String,
					required: true,
					trim: true,
				},
				price: {
					type: Number,
					required: true,
					default: 0,
					min: 0,
				},
				description: {
					type: String,
					required: true,
					trim: true,
				},
				duration: {
					type: Number,
					required: true,
					min: 0,
					max: 360,
				},
			},
		],

		ratings: {
			type: Number,
			default: 0,
		},

		numOfReviews: {
			type: Number,
			default: 0,
		},
		reviews: [
			{
				name: {
					type: String,
					required: true,
				},
				rating: {
					type: Number,
					required: true,
				},
				comment: {
					type: String,
					required: true,
				},
			},
		],
		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},

		workingHours: {
			// store number range in minutes from 0 to 1440 (24 hours)
			start: {
				type: String,
				required: [true, 'Please enter saloon working hours start time'],
				trim: true,
			},
			end: {
				type: String,
				required: [true, 'Please enter saloon working hours end time'],
				trim: true,
			},
		},

		images: [
			{
				public_id: {
					type: String,
					required: false,
				},
				url: {
					type: String,
					required: false,
				},
			},
		],
		status: {
			type: String,
			required: true,
			enum: ['closed', 'open'],
			default: 'open',
		},
	},
	{
		timestamps: true,
	}
)

export default mongoose.model('Saloon', schema)
