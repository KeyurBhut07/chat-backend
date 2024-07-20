const errorMiddleware = (err, req, res, next) => {
  err.message ||= 'Internal Server Error';
  err.statusCode ||= 500;
  return res.status(err.statusCode).json({
    status: 'error',
    sucess: false,
    message: err.message,
  });
};

const catchAsync = (passFunction) => async (req, res, next) => {
  try {
    await passFunction(req, res, next);
  } catch (error) {
    next(error);
  }
};

export { errorMiddleware, catchAsync };
