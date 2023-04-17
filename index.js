module.exports = function (PrismaClient, ...middlewares) {
  const init_routeCalls = ['all', 'get', 'post', 'put', 'delete'];
  const txWrapper = (originalFunction) => {
    if (Array.isArray(originalFunction)) {
      return originalFunction.map(txWrapper);
    }
    return async function (req, res, next) {
      try {
        let prisma = new PrismaClient();
        middlewares.map((middleware) => {
          prisma.$use(middleware);
        });
        await prisma.$transaction(async (tx) => {
          req.prisma = tx;
          await originalFunction(req, res, next);
        });
      } catch (e) {
        next(e);
      }
    };
  };

  const patchRouter = (router, routeCalls = init_routeCalls) => {
    for (const call of routeCalls) {
      router[call + '_toWrap'] = router[call];
      const rep = {
        [call]: function (path, ...callbacks) {
          return router[call + '_toWrap'](path, ...callbacks.map(txWrapper));
        },
      };
      router[call] = rep[call];
    }
    return router;
  };

  return {
    patchRouter,
    txWrapper,
  };
};
