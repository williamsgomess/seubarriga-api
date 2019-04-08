const ValidationError = require('../errors/ValidationError');

module.exports = (app) => {
  const save = async (account) => {
    if (!account.name) throw new ValidationError('Nome é um atributo obrigatório.');
    return app.db('accounts').insert(account, '*');
  };
  const findAll = userId => app.db('accounts').where({ user_id: userId });
  const findById = (filter = {}) => app.db('accounts').where(filter).first();
  const update = (id, account) => app.db('accounts')
    .where({ id })
    .update(account, '*');
  const remove = id => app.db('accounts')
    .where({ id })
    .del();

  return {
    save, findAll, findById, update, remove,
  };
};
