import mongoose from 'mongoose'

const schema = new mongoose.Schema(
	{
		users: {
			type: Number,
			default: 0,
		},
		barbers: {
			type: Number,
			default: 0,
		},
		bookings: {
			type: Number,
			default: 0,
		},
	},
	{
		timestamps: true,
	}
)

export default mongoose.model('Stats', schema)
