import mongoose from 'mongoose'
import validator from 'validator'

const schema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			validate: validator.isEmail,
			trim: true,
		},
		phone: {
			type: String,
			required: true,
			trim: true,
		},
		avatar: {
			public_id: {
				type: String,
				required: false,
			},
			url: {
				type: String,
				required: false,
			},
		},
		saloon: {
			type: mongoose.Schema.ObjectId,
			ref: 'Saloon',
		},
		bookedSlots: [
			// bookedSlots: [{start: 0, end: 30}, {start: 30, end: 60}] start and end are in minutes
			{
				start: {
					type: String,
					required: [true, 'Please enter booking start time'],
					trim: true,
				},
				end: {
					type: String,
					required: [true, 'Please enter booking end time'],
					trim: true,
				},
			},
		],
	},
	{
		timestamps: true,
	}
)

export default mongoose.model('Barber', schema)
