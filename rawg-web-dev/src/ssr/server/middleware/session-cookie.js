/**
 * Этот мидлвер позволяет ставить куку авторизации на стороне
 * серера для того чтобы браузеры не ограничиали её время жизни.
 *
 * Подробнее на эту тему: https://3.basecamp.com/3964781/buckets/11829505/todos/1771476911
 */
const sessionCookie = (request, res, next) => {
  const clientToken = request.cookies.token_client;

  if (clientToken) {
    const current = new Date();
    const nextYear = new Date(current.setFullYear(current.getFullYear() + 1));

    res.clearCookie('token_client');
    res.cookie('token', clientToken, { expires: nextYear });

    request.cookies.token = clientToken;
  }

  next();
};

export default sessionCookie;
