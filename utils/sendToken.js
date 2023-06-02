export const sendToken = (res, user, message = 'Token generated', statusCode = 200) => {
	const token = user.getJWTToken()

	const options = {
		expires: new Date(Date.now() + process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000),
		httpOnly: true,
		secure: false,
	}

	res.status(statusCode).cookie('token', token, options).json({
		success: true,
		message,
		user,
	})
}
