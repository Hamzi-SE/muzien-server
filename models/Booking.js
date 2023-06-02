import mongoose from 'mongoose'

const schema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.ObjectId,
			ref: 'User',
			required: true,
		},
		saloon: {
			type: mongoose.Schema.ObjectId,
			ref: 'Saloon',
			required: true,
		},
		services: [
			{
				type: mongoose.Schema.ObjectId,
				required: true,
			},
		],

		time: {
			type: String,
			required: [true, 'Please enter booking time'],
			trim: true,
		},
		date: {
			type: String,
			required: [true, 'Please enter booking date'],
			trim: true,
		},

		status: {
			type: String,
			enum: ['pending', 'approved', 'rejected'],
			default: 'pending',
		},
		barber: {
			type: mongoose.Schema.ObjectId,
			ref: 'Barber',
		},
	},
	{
		timestamps: true,
	}
)

export default mongoose.model('Booking', schema)
