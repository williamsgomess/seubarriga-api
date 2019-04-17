const request = require('supertest');

const app = require('../../src/app');

const MAIN_ROUTE = '/v1/transfers';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAwMDAsIm5hbWUiOiJVc2VyICMxIiwiZW1haWwiOiJ1c2VyMUBnbWFpbC5jb20ifQ.4IxZIO6DC43OUiXDbq-UbBZkDPWTKwnqoPKqhn-sfoo';

beforeAll(async () => {
  // await app.db.migrate.rollback();
  // await app.db.migrate.latest();
  await app.db.seed.run();
});

test('Deve listar apenas as transferências do usuário', () => request(app).get(MAIN_ROUTE)
  .set('authorization', `bearer ${TOKEN}`)
  .then((res) => {
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].description).toBe('Transfer #1');
  }));

test('Deve inserir uma transferência com sucesso', () => request(app).post(MAIN_ROUTE)
  .set('authorization', `bearer ${TOKEN}`)
  .send({
    description: 'Regular transfer',
    user_id: 10000,
    acc_ori_id: 10000,
    acc_dest_id: 10001,
    date: new Date(),
    ammount: 100,
  })
  .then(async (res) => {
    expect(res.status).toBe(201);
    expect(res.body.description).toBe('Regular transfer');

    const transactions = await app.db('transactions')
      .where({ transfer_id: res.body.id });
    expect(transactions).toHaveLength(2);
    expect(transactions[0].description).toBe('Transfer to acc #10001');
    expect(transactions[1].description).toBe('Transfer from acc #10000');
    expect(transactions[0].ammount).toBe('-100.00');
    expect(transactions[1].ammount).toBe('100.00');
    expect(transactions[0].acc_id).toBe(10000);
    expect(transactions[1].acc_id).toBe(10001);
  }));

describe('Ao salvar uma transferência válida...', () => {
  let transferId;
  let income;
  let outcome;

  test('Deve retornar o status 201 e os dados da transferência', () => request(app).post(MAIN_ROUTE)
    .set('authorization', `bearer ${TOKEN}`)
    .send({
      description: 'Regular transfer',
      user_id: 10000,
      acc_ori_id: 10000,
      acc_dest_id: 10001,
      date: new Date(),
      ammount: 100,
    })
    .then(async (res) => {
      expect(res.status).toBe(201);
      expect(res.body.description).toBe('Regular transfer');
      transferId = res.body.id;
    }));

  test('As transações equivalentes devem ter sido geradas', async () => {
    const transactions = await app.db('transactions')
      .where({ transfer_id: transferId }).orderBy('ammount');
    expect(transactions).toHaveLength(2);
    [outcome, income] = transactions;
  });

  test('A transação de saída deve ser negativa', () => {
    expect(outcome.description).toBe('Transfer to acc #10001');
    expect(outcome.ammount).toBe('-100.00');
    expect(outcome.acc_id).toBe(10000);
    expect(outcome.type).toBe('O');
  });

  test('A transação de entrada deve ser positiva', () => {
    expect(income.description).toBe('Transfer from acc #10000');
    expect(income.ammount).toBe('100.00');
    expect(income.acc_id).toBe(10001);
    expect(income.type).toBe('I');
  });

  test('Ambas deve, referenciar a trasferência que as originou', () => {
    expect(income.transfer_id).toBe(transferId);
    expect(outcome.transfer_id).toBe(transferId);
  });
});

describe('Ao tentar salvar uma transferência inválida...', () => {
  let validTransfer;
  beforeAll(() => {
    validTransfer = {
      description: 'Regular transfer',
      user_id: 10000,
      acc_ori_id: 10000,
      acc_dest_id: 10001,
      date: new Date(),
      ammount: 100,
    };
  });
  const testTemplate = (newData, errorMessage) => request(app).post(MAIN_ROUTE)
    .set('authorization', `bearer ${TOKEN}`)
    .send({ ...validTransfer, ...newData })
    .then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(errorMessage);
    });
  test('Não deve inserir sem descrição', () => testTemplate({ description: null }, 'Descrição é um atributo obrigatório!'));
  test('Não deve inserir sem valor', () => testTemplate({ ammount: null }, 'Valor é um atributo obrigatório!'));
  test('Não deve inserir sem data', () => testTemplate({ date: null }, 'Data é um atributo obrigatório!'));
  test('Não deve inserir sem conta de origem', () => testTemplate({ acc_ori_id: null }, 'Conta de origem é um atributo obrigatório!'));
  test('Não deve inserir sem conta de destino', () => testTemplate({ acc_dest_id: null }, 'Conta de destino é um atributo obrigatório!'));
  test('Não deve inserir se as contas de origem e destino forem as mesmas', () => testTemplate({ acc_dest_id: 10000 }, 'Não é possível transferir para a mesma conta!'));
  test('Não deve inserir se as contas pertencerem a outro usuário', () => testTemplate({ acc_ori_id: 10002 }, 'Conta #10002 não pertence ao usuário!'));
});

test('Deve retornar uma transferência por id', () => request(app).get(`${MAIN_ROUTE}/10000`)
  .set('authorization', `bearer ${TOKEN}`)
  .then((res) => {
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Transfer #1');
  }));

describe('Ao alterar uma transferência válida...', () => {
  let transferId;
  let income;
  let outcome;

  test('Deve retornar o status 200 e os dados da transferência', () => request(app).put(`${MAIN_ROUTE}/10000`)
    .set('authorization', `bearer ${TOKEN}`)
    .send({
      description: 'Transfer Updated',
      user_id: 10000,
      acc_ori_id: 10000,
      acc_dest_id: 10001,
      date: new Date(),
      ammount: 500,
    })
    .then(async (res) => {
      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Transfer Updated');
      expect(res.body.ammount).toBe('500.00');
      transferId = res.body.id;
    }));

  test('As transações equivalentes devem ter sido geradas', async () => {
    const transactions = await app.db('transactions')
      .where({ transfer_id: transferId }).orderBy('ammount');
    expect(transactions).toHaveLength(2);
    [outcome, income] = transactions;
  });

  test('A transação de saída deve ser negativa', () => {
    expect(outcome.description).toBe('Transfer to acc #10001');
    expect(outcome.ammount).toBe('-500.00');
    expect(outcome.acc_id).toBe(10000);
    expect(outcome.type).toBe('O');
  });

  test('A transação de entrada deve ser positiva', () => {
    expect(income.description).toBe('Transfer from acc #10000');
    expect(income.ammount).toBe('500.00');
    expect(income.acc_id).toBe(10001);
    expect(income.type).toBe('I');
  });

  test('Ambas deve, referenciar a trasferência que as originou', () => {
    expect(income.transfer_id).toBe(transferId);
    expect(outcome.transfer_id).toBe(transferId);
  });
});
