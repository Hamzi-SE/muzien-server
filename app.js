import express from 'express'
import { config } from 'dotenv'
import ErrorMiddleware from './middlewares/Error.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'

// dotenv config
config({ path: './config/config.env' })

const app = express()

// Using Middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(
	cors({
		origin: process.env.FRONTEND_URL,
		credentials: true, // mandatory
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
	})
)

// Importing & Using Routes
// import courseRoutes from "./routes/courseRoutes.js";
import userRoutes from './routes/userRoutes.js'
import saloonRoutes from './routes/saloonRoutes.js'
import bookingRoutes from './routes/bookingRoutes.js'
// import paymentRoutes from "./routes/paymentRoutes.js";
// import otherRoutes from "./routes/otherRoutes.js";

// app.use("/api/v1", courseRoutes);
app.use('/api/v1', userRoutes)
app.use('/api/v1', saloonRoutes)
app.use('/api/v1', bookingRoutes)
// app.use("/api/v1", paymentRoutes);
// app.use("/api/v1", otherRoutes);

// Default route
app.get('/', (req, res) => {
	res.send(`<h1>Welcome to Muzien Server. Frontend is live <a href=${process.env.FRONTEND_URL}>here</a></h1>`)
})

// Error Handler (use at the end)
app.use(ErrorMiddleware)

export default app
